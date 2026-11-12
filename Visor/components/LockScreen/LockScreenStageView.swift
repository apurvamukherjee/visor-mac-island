import Defaults
import SwiftUI

/// The lock screen's display-only half: the backdrop behind the cover and the
/// lyrics themselves. Its window ignores the mouse while the screen is locked.
struct LockScreenStageView: View {
    let screenSize: CGSize

    @ObservedObject private var music = MusicManager.shared
    @Default(.lockScreenLook) private var look
    @Default(.lockScreenLyricStyle) private var style
    @Default(.lockScreenBackdrop) private var backdrop
    @Default(.lockScreenLyricsAlbumColor) private var albumColor

    private var layout: LockScreenLayout { LockScreenLayout(size: screenSize, look: look, style: style) }
    private func scaled(_ value: CGFloat) -> CGFloat { layout.scaled(value) }

    private var hasMedia: Bool { music.isPlaying || !music.isPlayerIdle }
    private var tint: Color { albumColor ? Color(nsColor: music.palette.first ?? .white) : .white }

    var body: some View {
        ZStack {
            if hasMedia {
                backdropFill
                    .frame(width: screenSize.width, height: screenSize.height)
                    .clipped()
                    .mask(backdropMask)
                    // Under the record the wallpaper is left alone.
                    .opacity(look == .record ? 0 : 1)
                if look == .lyrics {
                    lyrics
                        .frame(width: layout.lyrics.width, height: layout.lyrics.height)
                        .position(x: layout.lyrics.midX, y: layout.lyrics.midY)
                        .transition(.opacity)
                }
            }
        }
        .frame(width: screenSize.width, height: screenSize.height)
        .animation(.easeInOut(duration: 1.1), value: look)
        .animation(.easeInOut(duration: 0.6), value: style)
        .animation(.easeInOut(duration: 0.8), value: backdrop)
        .animation(.smooth, value: hasMedia)
        .preferredColorScheme(.dark)
    }

    // MARK: Backdrop

    @ViewBuilder private var backdropFill: some View {
        switch backdrop {
        case .wallpaper:
            Color.clear
        case .dim:
            Color.black.opacity(0.66)
        case .cover:
            Image(nsImage: music.albumArt)
                .resizable()
                .scaledToFill()
                .frame(width: screenSize.width, height: screenSize.height)
                .blur(radius: scaled(70), opaque: true)
                .saturation(1.3)
                .overlay(Color.black.opacity(0.4))
        case .aura:
            let first = Color(nsColor: music.palette.first ?? .white)
            let last = Color(nsColor: music.palette.last ?? .white)
            ZStack {
                Color.black.opacity(0.6)
                RadialGradient(
                    colors: [first.opacity(0.7), first.opacity(0)], center: UnitPoint(x: 0.3, y: 0.45),
                    startRadius: 0, endRadius: screenSize.width * 0.42
                )
                RadialGradient(
                    colors: [last.opacity(0.6), last.opacity(0)], center: UnitPoint(x: 0.72, y: 0.6),
                    startRadius: 0, endRadius: screenSize.width * 0.4
                )
            }
        }
    }

    /// An oval that has faded out before it reaches the clock above or the
    /// password field below. Those are drawn by macOS under this window, so
    /// anything opaque over them would hide them.
    private var backdropMask: some View {
        EllipticalGradient(
            stops: [.init(color: .black, location: 0), .init(color: .black, location: 0.55), .init(color: .clear, location: 1)],
            center: .center, startRadiusFraction: 0, endRadiusFraction: 0.5
        )
        .frame(width: screenSize.width * 1.5, height: screenSize.height * 0.64)
        .position(x: screenSize.width / 2, y: screenSize.height * 0.53)
    }

    // MARK: Lyrics

    @ViewBuilder private var lyrics: some View {
        let lines = music.syncedLyrics
        if lines.isEmpty {
            Text(music.isFetchingLyrics ? "Finding lyrics…" : "No synced lyrics for this song")
                .font(.system(size: scaled(20), weight: .semibold))
                .foregroundStyle(.white.opacity(0.5))
                .shadow(color: .black.opacity(0.4), radius: 6)
        } else {
            let texts = lines.map(\.text)
            TimelineView(.animation(minimumInterval: 1.0 / 30, paused: !music.isPlaying)) { timeline in
                let elapsed = music.estimatedPlaybackPosition(at: timeline.date)
                if let cursor = LyricTiming.cursor(lines: lines, at: elapsed) {
                    LyricStyleView(
                        style: style, texts: texts, cursor: style.followsWithinWord ? cursor.steppedProgress : cursor.wholeWords,
                        blink: Int(timeline.date.timeIntervalSinceReferenceDate * 2).isMultiple(of: 2),
                        tint: tint, unit: layout.unit
                    )
                    .equatable()
                }
            }
        }
    }
}

private extension LyricStyle {
    /// Whether the style moves inside a word, not just from word to word.
    var followsWithinWord: Bool { self == .lens || self == .terminal }
}

private extension LyricCursor {
    /// Progress in 24 steps, so a style that draws it is not rebuilt on every frame.
    var steppedProgress: LyricCursor {
        LyricCursor(line: line, word: word, wordProgress: (wordProgress * 24).rounded() / 24)
    }

    var wholeWords: LyricCursor { LyricCursor(line: line, word: word, wordProgress: 0) }
}
