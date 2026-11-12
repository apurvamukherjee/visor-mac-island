import AppKit
import Defaults
import SwiftUI

/// Now Playing and the running timer, on the lock screen below the clock.
///
/// The window lives in the same above-the-shield SkyLight space the notch
/// uses while locked. It is created on lock and its SwiftUI tree is dropped
/// on unlock, so nothing renders for it the rest of the time.
@MainActor
final class LockScreenPlayer {
    static let shared = LockScreenPlayer()

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
        VStack(spacing: 10) {
            mediaRow
            if Defaults[.enableLyrics] { lyricLine }
        }
        .padding(12)
        .background(card)
        .background(glow)
        .transition(.move(edge: .bottom).combined(with: .opacity).combined(with: .scale(scale: 0.95)))
    }

    // Lyrics matter only while locked and playing; a paused track's line is static.
    private var lyricLine: some View {
        TimelineView(.animation(minimumInterval: 0.25, paused: !music.isPlaying)) { timeline in
            let line = music.lyricLine(at: music.estimatedPlaybackPosition(at: timeline.date))
            Text(line)
                .id(line)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(.white.opacity(0.85))
                .lineLimit(1)
                .frame(maxWidth: .infinity)
                .transition(.asymmetric(insertion: .move(edge: .bottom).combined(with: .opacity), removal: .opacity))
                .animation(.smooth(duration: 0.35), value: line)
        }
        .frame(height: 18)
        .clipped()
    }

    private var glow: some View {
        RoundedRectangle(cornerRadius: 22, style: .continuous)
            .fill(Color(nsColor: music.avgColor))
            .blur(radius: 28)
            .opacity(music.isPlaying ? 0.45 : 0.15)
            .animation(.easeInOut(duration: 1.2), value: music.isPlaying)
    }

    private var mediaRow: some View {
        HStack(spacing: 12) {
            Image(nsImage: music.albumArt)
                .resizable()
                .aspectRatio(1, contentMode: .fill)
                .frame(width: 56, height: 56)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .scaleEffect(music.isPlaying ? 1 : 0.92)
                .animation(.spring(duration: 0.5, bounce: 0.3), value: music.isPlaying)
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

/// Where everything on the lock screen sits, shared by both windows so the
/// cover in one lines up with the lyrics in the other.
///
/// Sizes were drawn for a 956-point-tall screen and scale with the height.
/// The clock above and the password field below are macOS's own; everything
/// here stays between them.
struct LockScreenLayout {
    let size: CGSize
    let look: LockScreenLook
    let style: LyricStyle

    var unit: CGFloat { size.height / 956 }
    func scaled(_ value: CGFloat) -> CGFloat { value * unit }

    /// The lyrics look with a full-width style: the words take the middle of
    /// the screen and the cover moves into the card.
    var wordsTakeTheStage: Bool { look == .lyrics && style != .lines }
    private var splitsTheScreen: Bool { look == .lyrics && style == .lines }

    static let vinylBase: CGFloat = 150
    static let coverBase: CGFloat = 330
    static let slotSide: CGFloat = 44
    static let cardSize = CGSize(width: 304, height: 118)
    private static let cardPadding: CGFloat = 12

    private var columnX: CGFloat { splitsTheScreen ? size.width / 2 - scaled(320) : size.width / 2 }

    var cardCenter: CGPoint {
        let top: CGFloat = switch look {
        case .record: 620
        case .cover: 632
        case .lyrics: style == .lines ? 630 : 626
        }
        return CGPoint(x: columnX, y: scaled(top + Self.cardSize.height / 2))
    }

    /// The small square at the card's top left, where whichever of the record
    /// and the cover is not the main picture waits.
    var slotCenter: CGPoint {
        let inset = Self.cardPadding + Self.slotSide / 2
        return CGPoint(
            x: cardCenter.x - scaled(Self.cardSize.width / 2 - inset),
            y: cardCenter.y - scaled(Self.cardSize.height / 2 - inset)
        )
    }

    var vinyl: (center: CGPoint, side: CGFloat) {
        let (center, side) = look == .record
            ? (CGPoint(x: columnX, y: scaled(515)), scaled(Self.vinylBase))
            : (slotCenter, scaled(Self.slotSide))
        // VinylDisc keeps its right edge for the tonearm, so the record sits
        // left of its box's middle. The nudge puts the record itself on centre.
        return (CGPoint(x: center.x + side * 0.06, y: center.y), side)
    }

    var cover: (center: CGPoint, side: CGFloat) {
        switch look {
        case .record: (slotCenter, scaled(Self.slotSide))
        case .cover: (CGPoint(x: columnX, y: scaled(468)), scaled(274))
        case .lyrics: wordsTakeTheStage ? (slotCenter, scaled(Self.slotSide)) : (CGPoint(x: columnX, y: scaled(443)), scaled(Self.coverBase))
        }
    }

    /// Only one of the two can wait in the card's slot.
    var showsVinyl: Bool { !wordsTakeTheStage }

    /// Where the lyrics are drawn.
    var lyrics: CGRect {
        style == .lines
            ? CGRect(x: size.width / 2 + scaled(20), y: scaled(243), width: scaled(420), height: scaled(400))
            : CGRect(x: size.width / 2 - scaled(560), y: scaled(262), width: scaled(1120), height: scaled(350))
    }
}
