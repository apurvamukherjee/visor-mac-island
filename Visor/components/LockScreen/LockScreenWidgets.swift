import AppKit
import Defaults
import SwiftUI

/// Now Playing and the running timer, on the lock screen below the clock.
///
/// The window lives in the same above-the-shield SkyLight space the notch
/// uses while locked. It is created on lock and its SwiftUI tree is dropped
/// on unlock, so nothing renders for it the rest of the time.
@MainActor
final class LockScreenWidgets {
    static let shared = LockScreenWidgets()

    private static let size = CGSize(width: 380, height: 220)
    /// From the screen's vertical centre to the panel's top edge: clear of
    /// the clock above and the password field below.
    private static let dropBelowCenter: CGFloat = 60

    private var window: SkyLightWindow?

    private init() {}

    func show() {
        guard Defaults[.lockScreenWidgets], let screen = NSScreen.screens.first else { return }
        let frame = NSRect(
            x: screen.frame.midX - Self.size.width / 2,
            y: screen.frame.midY - Self.dropBelowCenter - Self.size.height,
            width: Self.size.width,
            height: Self.size.height
        )
        let window = window ?? SkyLightWindow(
            contentRect: frame,
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        self.window = window
        window.setFrame(frame, display: false)
        window.contentView = NSHostingView(rootView: LockScreenWidgetsView())
        window.enableSkyLight()
        window.orderFrontRegardless()
    }

    func hide() {
        guard let window else { return }
        window.orderOut(nil)
        window.disableSkyLight()
        window.contentView = nil
    }
}

private struct LockScreenWidgetsView: View {
    @ObservedObject private var music = MusicManager.shared
    @ObservedObject private var timer = TimerManager.shared

    var body: some View {
        VStack(spacing: 10) {
            if music.isPlaying || !music.isPlayerIdle {
                mediaCard
            }
            if let start = timer.startDate, let end = timer.endDate {
                timerCard(start...end)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .animation(.smooth, value: music.isPlayerIdle)
        .animation(.smooth, value: timer.endDate)
        .preferredColorScheme(.dark)
    }

    private var mediaCard: some View {
        HStack(spacing: 12) {
            Image(nsImage: music.albumArt)
                .resizable()
                .aspectRatio(1, contentMode: .fill)
                .frame(width: 56, height: 56)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            VStack(alignment: .leading, spacing: 2) {
                Text(music.songTitle)
                    .font(.headline)
                    .foregroundStyle(.white)
                Text(music.artistName)
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.6))
            }
            .lineLimit(1)
            .frame(maxWidth: .infinity, alignment: .leading)
            HStack(spacing: 14) {
                controlButton("backward.fill") { music.previousTrack() }
                controlButton(music.isPlaying ? "pause.fill" : "play.fill") { music.togglePlay() }
                controlButton("forward.fill") { music.nextTrack() }
            }
        }
        .padding(12)
        .background(card)
        .transition(.opacity.combined(with: .scale(scale: 0.95)))
    }

    private func timerCard(_ range: ClosedRange<Date>) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "timer")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(Color.effectiveAccent)
            Text(timerInterval: range, countsDown: true)
                .font(.system(size: 26, weight: .semibold, design: .rounded).monospacedDigit())
                .foregroundStyle(.white)
            Spacer()
            controlButton("xmark") { timer.cancel() }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(card)
        .transition(.opacity.combined(with: .scale(scale: 0.95)))
    }

    // A translucent black card rather than a material: a material samples the
    // window behind it, and above the lock shield there is nothing to sample.
    private var card: some View {
        RoundedRectangle(cornerRadius: 22, style: .continuous)
            .fill(.black.opacity(0.45))
    }

    private func controlButton(_ systemImage: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(.white)
                .contentTransition(.symbolEffect(.replace))
                .frame(width: 24, height: 24)
                .contentShape(Rectangle())
        }
        .buttonStyle(PlainButtonStyle())
    }
}
