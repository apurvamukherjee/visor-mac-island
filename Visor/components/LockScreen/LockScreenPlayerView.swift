import Defaults
import SwiftUI

/// The lock screen's clickable half: the cover, the Now Playing card and the
/// timer. Clicking the cover switches between it alone and the lyrics.
struct LockScreenPlayerView: View {
    let screenSize: CGSize

    @EnvironmentObject private var controller: LockScreenPlayer
    @ObservedObject private var music = MusicManager.shared
    @ObservedObject private var timer = TimerManager.shared
    @Default(.lockScreenLook) private var look
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var layout: LockScreenLayout { LockScreenLayout(size: screenSize, look: look) }
    private func scaled(_ value: CGFloat) -> CGFloat { layout.scaled(value) }

    private var hasMedia: Bool { music.isPlaying || !music.isPlayerIdle || controller.isPreview }
    private var move: Animation? { reduceMotion ? nil : .spring(duration: 0.8, bounce: 0.16) }

    var body: some View {
        ZStack {
            if hasMedia {
                card
                    .position(layout.cardCenter)
                    .transition(.opacity.combined(with: .scale(scale: 0.95)))
                cover
            }
            belowCard
        }
        .frame(
            width: screenSize.width, height: screenSize.height * LockScreenPlayer.playerHeightShare, alignment: .top
        )
        .animation(move, value: look)
        .animation(move, value: music.isPlaying)
        .animation(.smooth, value: hasMedia)
        .animation(.smooth, value: timer.endDate)
        .preferredColorScheme(.dark)
    }

    // MARK: The cover

    private var cover: some View {
        let side = scaled(LockScreenLayout.coverSide)
        let shape = RoundedRectangle(cornerRadius: side * 0.07, style: .continuous)
        return Image(nsImage: music.albumArt)
            .resizable()
            .interpolation(.high)
            .scaledToFill()
            .frame(width: side, height: side)
            .clipShape(shape)
            .overlay { shape.strokeBorder(.white.opacity(0.14), lineWidth: 1) }
            .overlay {
                Color.clear
                    .contentShape(Rectangle())
                    .onTapGesture { look = look.next }
                    .accessibilityElement()
                    .accessibilityLabel("Cover")
                    .accessibilityHint(look == .cover ? "Shows the lyrics" : "Hides the lyrics")
                    .accessibilityAddTraits(.isButton)
            }
            .shadow(color: .black.opacity(0.4), radius: side * 0.09, y: side * 0.05)
            // Paused, the cover steps back.
            .scaleEffect(music.isPlaying ? 1 : 0.88)
            .position(layout.coverCenter)
            .transition(.opacity)
    }

    // MARK: Now Playing card

    private var card: some View {
        VStack(spacing: 0) {
            HStack(spacing: scaled(10)) {
                VStack(alignment: .leading, spacing: scaled(2)) {
                    Text(music.songTitle)
                        .font(.system(size: scaled(16), weight: .semibold))
                        .foregroundStyle(.white)
                    Text(music.artistName)
                        .font(.system(size: scaled(13.5)))
                        .foregroundStyle(.white.opacity(0.62))
                }
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)
                if music.canFavoriteTrack {
                    controlButton(music.isFavoriteTrack ? "heart.fill" : "heart", label: "Favorite", size: 15) {
                        music.toggleFavoriteTrack()
                    }
                    .opacity(0.85)
                }
            }
            Spacer(minLength: 0)
            progress
            Spacer(minLength: 0)
            controls
        }
        .padding(.horizontal, scaled(18))
        .padding(.vertical, scaled(14))
        .frame(width: scaled(LockScreenLayout.coverSide), height: scaled(LockScreenLayout.cardHeight))
        .background(cardBackground(radius: scaled(22)))
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
        HStack(spacing: scaled(42)) {
            controlButton("backward.fill", label: "Previous", size: 17) { music.previousTrack() }
            controlButton(music.isPlaying ? "pause.fill" : "play.fill", label: music.isPlaying ? "Pause" : "Play", size: 24) {
                music.togglePlay()
            }
            controlButton("forward.fill", label: "Next", size: 17) { music.nextTrack() }
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: Under the card

    private var belowCard: some View {
        let height = scaled(120)
        return VStack {
            if let start = timer.startDate, let end = timer.endDate {
                timerCard(start ... end)
            }
        }
        .frame(width: scaled(LockScreenLayout.coverSide), height: height, alignment: .top)
        .position(
            x: layout.cardCenter.x,
            y: layout.cardCenter.y + scaled(LockScreenLayout.cardHeight / 2 + 12) + height / 2
        )
    }

    private func timerCard(_ range: ClosedRange<Date>) -> some View {
        HStack(spacing: scaled(10)) {
            Image(systemName: "timer")
                .font(.system(size: scaled(18), weight: .semibold))
                .foregroundStyle(Color.effectiveAccent)
            Text(timerInterval: range, countsDown: true)
                .font(.system(size: scaled(26), weight: .semibold, design: .rounded).monospacedDigit())
                .foregroundStyle(.white)
            Spacer()
            controlButton("xmark", label: "Cancel timer") { timer.cancel() }
        }
        .padding(.horizontal, scaled(16))
        .padding(.vertical, scaled(10))
        .background(cardBackground(radius: scaled(20)))
        .transition(.opacity.combined(with: .scale(scale: 0.95)))
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
                .frame(width: scaled(28), height: scaled(28))
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
