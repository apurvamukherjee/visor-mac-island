//  BrightnessManager.swift
//
//

import AppKit

// Visor: screen brightness and the keyboard backlight were two copies of this
// class, differing only in the brightness calls and the HUD they show.
@MainActor
final class BrightnessManager: ObservableObject {
	enum Kind { case screen, keyboard }

	static let shared = BrightnessManager(kind: .screen)
	static let keyboard = BrightnessManager(kind: .keyboard)

	// macOS fades each brightness step instead of jumping; tune against a native press.
	private static let fadeDuration: TimeInterval = 0.25

	@Published private(set) var rawBrightness: Float = 0

	private let kind: Kind
	// Where the running fade is heading. Presses step from it, so a held key
	// never reads a half-faded level and loses a step.
	private var target: Float?
	private var fade: Timer?

	private init(kind: Kind) {
		self.kind = kind
		refresh()
	}

	func refresh() {
		if let current = read() {
			rawBrightness = current
		}
	}

	func setRelative(delta: Float) {
		let goal = max(0, min(1, (target ?? read() ?? rawBrightness) + delta))
		VisorViewCoordinator.shared.toggleSneakPeek(
			status: true,
			type: kind == .screen ? .brightness : .backlight,
			value: CGFloat(goal)
		)
		fade(to: goal)
	}

	// The HUD slider follows the finger, so it skips the fade.
	func setAbsolute(value: Float) {
		stopFade()
		let clamped = max(0, min(1, value))
		if write(clamped) {
			rawBrightness = clamped
		} else {
			refresh()
		}
	}

	private func fade(to goal: Float) {
		fade?.invalidate()
		target = goal
		let from = read() ?? rawBrightness
		let start = Date()
		let timer = Timer(timeInterval: 1.0 / 60, repeats: true) { [weak self] _ in
			MainActor.assumeIsolated {
				guard let self else { return }
				let progress = min(1, Date().timeIntervalSince(start) / Self.fadeDuration)
				let eased = Float(1 - pow(1 - progress, 3))
				guard self.write(from + (goal - from) * eased) else {
					self.stopFade()
					self.refresh()
					return
				}
				if progress >= 1 {
					self.rawBrightness = goal
					self.stopFade()
				}
			}
		}
		// .common keeps the fade running while a menu is open.
		RunLoop.main.add(timer, forMode: .common)
		fade = timer
	}

	private func stopFade() {
		fade?.invalidate()
		fade = nil
		target = nil
	}

	// Visor: both calls measured under 0.2 ms, cheap enough for every fade frame on main.
	private func read() -> Float? {
		switch kind {
		case .screen: DisplayBrightness.screen()
		case .keyboard: DisplayBrightness.keyboard()
		}
	}

	private func write(_ value: Float) -> Bool {
		switch kind {
		case .screen: DisplayBrightness.setScreen(value)
		case .keyboard: DisplayBrightness.setKeyboard(value)
		}
	}
}
