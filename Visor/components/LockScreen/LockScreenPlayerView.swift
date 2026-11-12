import Defaults
import SwiftUI

/// The lock screen's clickable half: the Now Playing card.
struct LockScreenPlayerView: View {
    let screenSize: CGSize

    @ObservedObject private var music = MusicManager.shared
    @Default(.lockScreenLook) private var look
    @Default(.lockScreenLyricStyle) private var style
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var layout: LockScreenLayout { LockScreenLayout(size: screenSize, look: look, style: style) }
    private func scaled(_ value: CGFloat) -> CGFloat { layout.scaled(value) }

    private var hasMedia: Bool { music.isPlaying || !music.isPlayerIdle }
    private var move: Animation? { reduceMotion ? nil : .spring(duration: 0.8, bounce: 0.16) }

    var body: some View {
        ZStack {
            if hasMedia {
                card
                    .position(layout.cardCenter)
                    .transition(.opacity.combined(with: .scale(scale: 0.95)))
            }
        }
        .frame(
            width: screenSize.width, height: screenSize.height * LockScreenPlayer.playerHeightShare, alignment: .top
        )
        .animation(move, value: look)
        .animation(move, value: style)
        .animation(.smooth, value: hasMedia)
        .preferredColorScheme(.dark)
    }

    // MARK: Now Playing card

    private var card: some View {
        VStack(spacing: 0) {
            HStack(spacing: scaled(12)) {
                // The record or the cover sits here; see LockScreenLayout.slotCenter.
                Color.clear.frame(width: scaled(LockScreenLayout.slotSide), height: scaled(LockScreenLayout.slotSide))
                VStack(alignment: .leading, spacing: scaled(2)) {
                    Text(music.songTitle)
                        .font(.system(size: scaled(14.5), weight: .semibold))
                        .foregroundStyle(.white)
                    Text(music.artistName)
                        .font(.system(size: scaled(12.5)))
                        .foregroundStyle(.white.opacity(0.62))
                }
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            Spacer(minLength: 0)
            progress
            Spacer(minLength: 0)
            controls
        }
        .padding(scaled(12))
        .frame(width: scaled(LockScreenLayout.cardSize.width), height: scaled(LockScreenLayout.cardSize.height))
        .background(cardBackground(radius: scaled(20)))
    }

    private var progress: some View {
        TimelineView(.animation(minimumInterval: 0.5, paused: !music.isPlaying)) { timeline in
            let position = music.estimatedPlaybackPosition(at: timeline.date)
            let duration = music.songDuration
            HStack(spacing: scaled(8)) {
                Text(Self.time(position))
                    .frame(width: scaled(34), alignment: .leading)
                Capsule()
                    .fill(.white.opacity(0.22))
                    .overlay(alignment: .leading) {
                        GeometryReader { bar in
                            Capsule()
                                .fill(.white.opacity(0.92))
                                .frame(width: bar.size.width * (duration > 0 ? min(1, position / duration) : 0))
                        }
                    }
                    .frame(height: scaled(3.5))
                // A live stream has no end to count down to.
                Text(duration > 0 ? "-" + Self.time(duration - position) : "")
                    .frame(width: scaled(34), alignment: .trailing)
            }
            .font(.system(size: scaled(10), weight: .medium).monospacedDigit())
            .foregroundStyle(.white.opacity(0.6))
        }
    }

    private var controls: some View {
        HStack(spacing: scaled(34)) {
            controlButton("backward.fill", label: "Previous") { music.previousTrack() }
            controlButton(music.isPlaying ? "pause.fill" : "play.fill", label: music.isPlaying ? "Pause" : "Play") {
                music.togglePlay()
            }
            controlButton("forward.fill", label: "Next") { music.nextTrack() }
        }
        .frame(maxWidth: .infinity)
        .overlay(alignment: .trailing) {
            if music.canFavoriteTrack {
                controlButton(music.isFavoriteTrack ? "heart.fill" : "heart", label: "Favorite", size: 13) {
                    music.toggleFavoriteTrack()
                }
                .opacity(0.8)
            }
        }
    }

    // A translucent black card rather than a material: a material samples the
    // window behind it, and above the lock shield there is nothing to sample.
    private func cardBackground(radius: CGFloat) -> some View {
        let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)
        return shape
            .fill(.black.opacity(0.42))
            .overlay {
                shape.strokeBorder(
                    LinearGradient(colors: [.white.opacity(0.24), .white.opacity(0.06)], startPoint: .top, endPoint: .bottom),
                    lineWidth: 1
                )
            }
            .shadow(color: .black.opacity(0.25), radius: scaled(18), y: scaled(8))
    }

    private func controlButton(
        _ systemImage: String, label: LocalizedStringKey, size: CGFloat = 16, action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: scaled(size), weight: .semibold))
                .foregroundStyle(.white)
                .contentTransition(.symbolEffect(.replace))
                .frame(width: scaled(24), height: scaled(24))
                .contentShape(Rectangle())
        }
        .buttonStyle(PlainButtonStyle())
        .accessibilityLabel(label)
    }

    private static func time(_ seconds: Double) -> String {
        let whole = max(0, Int(seconds))
        return Duration.seconds(whole).formatted(.time(pattern: whole >= 3600 ? .hourMinuteSecond : .minuteSecond))
    }
}
