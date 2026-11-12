import Defaults
import SwiftUI

/// The lock screen's clickable half: the record, the cover, the Now Playing
/// card and the timer. Clicking the record or the cover steps to the next look.
struct LockScreenPlayerView: View {
    let screenSize: CGSize

    @ObservedObject private var music = MusicManager.shared
    @ObservedObject private var timer = TimerManager.shared
    @Default(.lockScreenLook) private var look
    @Default(.lockScreenLyricStyle) private var style
    @Default(.enableLyrics) private var enableLyrics
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
                vinyl
                cover
            }
            belowCard
        }
        .frame(
            width: screenSize.width, height: screenSize.height * LockScreenPlayer.playerHeightShare, alignment: .top
        )
        .animation(move, value: look)
        .animation(move, value: style)
        .animation(.smooth, value: hasMedia)
        .animation(.smooth, value: timer.endDate)
        .preferredColorScheme(.dark)
    }

    // MARK: The record and the cover

    // Each is laid out once at its largest size and scaled, so moving between
    // the middle of the screen and the card's slot is a transform, not a redraw.
    private var vinyl: some View {
        let placement = layout.vinyl
        let base = scaled(LockScreenLayout.vinylBase)
        return VinylDisc(
            isSpinning: music.isPlaying,
            tint: music.palette.first ?? .white,
            artwork: music.albumArt.cgImage(forProposedRect: nil, context: nil, hints: nil)
        )
        .frame(width: base, height: base)
        .overlay { stepButton("Record") }
        .shadow(color: .black.opacity(0.4), radius: base * 0.12, y: base * 0.06)
        .scaleEffect(placement.side / base)
        .position(placement.center)
        .opacity(layout.showsVinyl ? 1 : 0)
        .transition(.opacity)
    }

    private var cover: some View {
        let placement = layout.cover
        let base = scaled(LockScreenLayout.coverBase)
        let scale = placement.side / base
        // Divided by the scale, so the corner is the same roundness on screen at every size.
        let shape = RoundedRectangle(cornerRadius: placement.side * 0.085 / scale, style: .continuous)
        return Image(nsImage: music.albumArt)
            .resizable()
            .scaledToFill()
            .frame(width: base, height: base)
            .clipShape(shape)
            .overlay {
                // A soft light from the top left and a hairline edge: printed card, not a flat tile.
                shape.fill(LinearGradient(
                    colors: [.white.opacity(0.16), .clear, .clear], startPoint: .topLeading, endPoint: .bottomTrailing
                ))
                shape.strokeBorder(.white.opacity(0.14), lineWidth: 1 / scale)
            }
            .overlay { stepButton("Cover") }
            .shadow(color: .black.opacity(0.35), radius: base * 0.07, y: base * 0.035)
            .scaleEffect(scale)
            .position(placement.center)
            .transition(.opacity)
    }

    private func stepButton(_ name: LocalizedStringKey) -> some View {
        Color.clear
            .contentShape(Rectangle())
            .onTapGesture { look = look.next }
            .accessibilityElement()
            .accessibilityLabel(name)
            .accessibilityHint("Shows the next lock screen look")
            .accessibilityAddTraits(.isButton)
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

    // MARK: Under the card

    private var belowCard: some View {
        let height = scaled(120)
        return VStack(spacing: scaled(10)) {
            // With a timer running there is only room for one of the two.
            if hasMedia, enableLyrics, look != .lyrics, timer.endDate == nil {
                lyricLine
            }
            if let start = timer.startDate, let end = timer.endDate {
                timerCard(start ... end)
            }
        }
        .frame(width: scaled(LockScreenLayout.cardSize.width), height: height, alignment: .top)
        .position(
            x: layout.cardCenter.x,
            y: layout.cardCenter.y + scaled(LockScreenLayout.cardSize.height / 2 + 12) + height / 2
        )
    }

    // The one line the card always carried when the notch's lyric line is on.
    private var lyricLine: some View {
        TimelineView(.animation(minimumInterval: 0.25, paused: !music.isPlaying)) { timeline in
            let line = music.lyricLine(at: music.estimatedPlaybackPosition(at: timeline.date))
            Text(line)
                .id(line)
                .font(.system(size: scaled(13), weight: .medium))
                .foregroundStyle(.white.opacity(0.85))
                .shadow(color: .black.opacity(0.5), radius: 3)
                .lineLimit(1)
                .frame(maxWidth: .infinity)
                .transition(.asymmetric(insertion: .move(edge: .bottom).combined(with: .opacity), removal: .opacity))
                .animation(.smooth(duration: 0.35), value: line)
        }
        .frame(height: scaled(18))
        .clipped()
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
