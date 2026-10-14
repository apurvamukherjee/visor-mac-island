import AppKit
import Foundation

extension Notification.Name {
	static let sharingDidFinish = Notification.Name("com.apurvamukherjee.visor.sharingDidFinish")
}

// Visor: read directly (preventNotchClose) and through .sharingDidFinish;
// nothing observed it, so it is not an ObservableObject.
@MainActor
final class SharingStateManager {
	static let shared = SharingStateManager()

	private var activeSessions = 0

	var preventNotchClose: Bool { activeSessions > 0 }

	private var activeDelegates: [UUID: SharingLifecycleDelegate] = [:]

	private init() {}

	func beginInteraction() {
		activeSessions += 1
	}

	func endInteraction() {
		guard activeSessions > 0 else { return }
		activeSessions -= 1
		if activeSessions == 0 {
			NotificationCenter.default.post(name: .sharingDidFinish, object: nil)
		}
	}

	func makeDelegate(onEnd: (() -> Void)? = nil) -> SharingLifecycleDelegate {
		let id = UUID()
		let delegate = SharingLifecycleDelegate(onEnd: { [weak self] in
			onEnd?()
			self?.unregisterDelegate(id: id)
		}, onBegin: { [weak self] in
			self?.beginInteraction()
		}, onFinish: { [weak self] in
			self?.endInteraction()
		})
		activeDelegates[id] = delegate
		return delegate
	}

	private func unregisterDelegate(id: UUID) {
		activeDelegates.removeValue(forKey: id)
	}
}

final class SharingLifecycleDelegate: NSObject, NSSharingServiceDelegate, NSSharingServicePickerDelegate {
	private let onEnd: () -> Void
	private let onBegin: () -> Void
	private let onFinish: () -> Void

	private var pickerActive = false
	private var serviceInProgress = false
	private var finished = false
	private var timeoutTask: Task<Void, Never>?

	init(onEnd: @escaping () -> Void, onBegin: @escaping () -> Void, onFinish: @escaping () -> Void) {
		self.onEnd = onEnd
		self.onBegin = onBegin
		self.onFinish = onFinish
	}

	func markPickerBegan() {
		guard !pickerActive else { return }
		pickerActive = true
		onBegin()
	}

	func markServiceBegan() {
		guard !serviceInProgress else { return }
		serviceInProgress = true
		onBegin()
		startTimeoutFallback()
	}

	private func startTimeoutFallback() {
		timeoutTask?.cancel()
		timeoutTask = Task { @MainActor [weak self] in
			try? await Task.sleep(for: .seconds(2))
			guard let self = self, !Task.isCancelled else { return }
			if !self.finished {
				self.finishIfNeeded()
			}
		}
	}

	private func finishIfNeeded() {
		guard !finished else { return }
		finished = true
		timeoutTask?.cancel()
		onFinish()
		onEnd()
	}

	// MARK: - NSSharingServicePickerDelegate

	func sharingServicePicker(_ sharingServicePicker: NSSharingServicePicker, didChoose service: NSSharingService?) {
		if service == nil {
			if pickerActive && !serviceInProgress {
				finishIfNeeded()
			}
			return
		}

		service?.delegate = self
		serviceInProgress = true
		startTimeoutFallback()
	}

	// MARK: - NSSharingServiceDelegate

	func sharingService(_ sharingService: NSSharingService, willShareItems items: [Any]) {
		if !pickerActive && !serviceInProgress {
			onBegin()
		}
		serviceInProgress = true
	}

	func sharingService(_ sharingService: NSSharingService, didShareItems items: [Any]) {
		finishIfNeeded()
	}

	func sharingService(_ sharingService: NSSharingService, didFailToShareItems items: [Any], error: Error) {
		finishIfNeeded()
	}
}
