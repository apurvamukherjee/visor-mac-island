import AppKit
import Combine
import Defaults

/// Counts down to a task's deadline in the closed notch, from the chosen lead
/// time before it until a few minutes past.
///
/// Like `MeetingMonitor`: one sleep per alert, no polling. Any edit to the
/// tasks or the alert settings reschedules from scratch.
@MainActor
final class TaskMonitor: ObservableObject {
    static let shared = TaskMonitor()

    /// How long an overdue task keeps the notch's attention.
    private static let grace: TimeInterval = 5 * 60

    @Published private(set) var active: TodoItem?

    private var task: Task<Void, Never>?
    private var observer: AnyCancellable?
    /// A task chimes once per deadline, however often edits reschedule it.
    private var chimed: Set<String> = []

    private init() {
        observer = Defaults.publisher(keys: .todos, .taskAlerts, .taskAlertLead, options: [])
            .sink { [weak self] in
                Task { @MainActor in self?.reschedule() }
            }
    }

    private static var lead: TimeInterval { TimeInterval(Defaults[.taskAlertLead] * 60) }

    private static func nextDue(after now: Date) -> (item: TodoItem, deadline: Date)? {
        Defaults[.todos]
            .compactMap { item in item.isDone ? nil : item.deadline.map { (item: item, deadline: $0) } }
            .filter { $0.deadline.addingTimeInterval(grace) > now }
            .min { $0.deadline < $1.deadline }
    }

    func reschedule() {
        task?.cancel()
        guard Defaults[.taskAlerts] else {
            active = nil
            return
        }
        task = Task { [weak self] in
            while !Task.isCancelled {
                guard let (item, deadline) = Self.nextDue(after: Date()) else {
                    self?.active = nil
                    return
                }
                let showAt = deadline.addingTimeInterval(-Self.lead)
                if showAt > Date() {
                    self?.active = nil
                    guard await Self.sleep(until: showAt) else { return }
                }
                self?.active = item
                self?.chime(item, deadline: deadline)
                if deadline > Date() {
                    guard await Self.sleep(until: deadline) else { return }
                    // Published again so the wing swaps its countdown for "Due".
                    self?.active = item
                }
                guard await Self.sleep(until: deadline.addingTimeInterval(Self.grace)) else { return }
            }
        }
    }

    private func chime(_ item: TodoItem, deadline: Date) {
        let key = "\(item.id)-\(deadline.timeIntervalSinceReferenceDate)"
        guard chimed.insert(key).inserted else { return }
        NSSound(named: "Ping")?.play()
    }

    /// False when a reschedule cancelled the wait.
    private static func sleep(until date: Date) async -> Bool {
        (try? await Task.sleep(for: .seconds(max(0, date.timeIntervalSinceNow)))) != nil
    }
}
