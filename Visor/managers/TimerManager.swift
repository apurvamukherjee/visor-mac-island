import AppKit

/// A single countdown, started from the open notch and shown in the closed
/// notch and on the lock screen. Nothing ticks while it runs: the views use
/// `Text(timerInterval:)`, which the system redraws on its own, and the only
/// wakeup is the one sleep that ends it.
@MainActor
final class TimerManager: ObservableObject {
    static let shared = TimerManager()

    static let presetMinutes = [1, 5, 10, 15, 25, 60]
    /// How long the bell stays in the notch after the timer ends.
    private static let ringDuration: Duration = .seconds(4)

    @Published private(set) var startDate: Date?
    @Published private(set) var endDate: Date?
    @Published private(set) var isRinging = false

    private var task: Task<Void, Never>?

    var isRunning: Bool { endDate != nil }

    private init() {}

    func start(minutes: Int) {
        let now = Date()
        let duration = TimeInterval(minutes * 60)
        startDate = now
        endDate = now.addingTimeInterval(duration)
        isRinging = false
        task?.cancel()
        // Task.sleep(for:) runs on the continuous clock, so a Mac that sleeps
        // mid-timer still rings on time when it wakes.
        task = Task { [weak self] in
            guard (try? await Task.sleep(for: .seconds(duration))) != nil else { return }
            await self?.ring()
        }
    }

    func cancel() {
        task?.cancel()
        task = nil
        startDate = nil
        endDate = nil
        isRinging = false
    }

    private func ring() async {
        startDate = nil
        endDate = nil
        isRinging = true
        NSSound(named: "Glass")?.play()
        guard (try? await Task.sleep(for: Self.ringDuration)) != nil else { return }
        isRinging = false
    }
}
