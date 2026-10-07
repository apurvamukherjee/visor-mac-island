import Defaults
import AppKit

/// Puts a Join button beside the notch from a little before a video call
/// starts until a few minutes into it.
///
/// One sleep per meeting, no polling: it sleeps until the next alert is due,
/// shows it, sleeps until it lapses, then looks for the next. A calendar
/// change reschedules from scratch.
@MainActor
final class MeetingMonitor: ObservableObject {
    static let shared = MeetingMonitor()

    /// How early the button appears, and how long into the call it stays.
    private static let lead: TimeInterval = 2 * 60
    private static let grace: TimeInterval = 5 * 60

    @Published private(set) var active: EventModel?

    private var task: Task<Void, Never>?

    private init() {}

    func reschedule() {
        task?.cancel()
        guard Defaults[.meetingAlerts] else {
            active = nil
            return
        }
        task = Task { [weak self] in
            while !Task.isCancelled {
                guard let meeting = CalendarManager.shared.nextMeeting(grace: Self.grace) else {
                    self?.active = nil
                    return
                }
                let showAt = meeting.start.addingTimeInterval(-Self.lead)
                if showAt > Date() {
                    self?.active = nil
                    guard (try? await Task.sleep(for: .seconds(showAt.timeIntervalSinceNow))) != nil else { return }
                }
                self?.active = meeting
                let hideAt = meeting.start.addingTimeInterval(Self.grace)
                guard (try? await Task.sleep(for: .seconds(max(0, hideAt.timeIntervalSinceNow)))) != nil else { return }
            }
        }
    }

    func join() {
        guard let url = active?.meetingURL else { return }
        NSWorkspace.shared.open(url)
    }
}
