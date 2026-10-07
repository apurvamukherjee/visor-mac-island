import SwiftUI

/// What the closed notch's trailing wing shows in place of the visualizer:
/// a running timer, the bell when it ends, or a download in progress.
enum WingAccessory: Equatable {
    case download(Double)
    case timer(ClosedRange<Date>)
    case bell

    /// The timer's digits need more room than the square wing gives the
    /// visualizer; both wings widen together so the island stays centred.
    static let textWingWidth: CGFloat = 44

    var needsTextWidth: Bool {
        if case .timer = self { return true }
        return false
    }

    /// Stands in for the album cover when nothing is playing.
    var leadingSymbol: String {
        switch self {
        case .download: "arrow.down"
        case .timer, .bell: "timer"
        }
    }
}

struct WingAccessoryView: View {
    let accessory: WingAccessory

    var body: some View {
        switch accessory {
        case .timer(let range):
            Text(timerInterval: range, countsDown: true)
                .font(.system(size: 12, weight: .semibold).monospacedDigit())
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        case .bell:
            Image(systemName: "bell.fill")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color.effectiveAccent)
                .symbolEffect(.pulse)
        case .download(let fraction):
            ZStack {
                Circle().stroke(.white.opacity(0.2), lineWidth: 2.5)
                Circle()
                    .trim(from: 0, to: fraction)
                    .stroke(Color.effectiveAccent, style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(.smooth, value: fraction)
            }
            .padding(3)
        }
    }
}
