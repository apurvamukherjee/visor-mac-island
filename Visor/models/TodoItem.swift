import Defaults
import SwiftUI

// Not `Task`: that name belongs to Swift concurrency, used all over the app.
struct TodoItem: Codable, Identifiable, Hashable, Defaults.Serializable {
    var id = UUID()
    var title: String
    var priority: TodoPriority = .medium
    var deadline: Date?
    var createdAt = Date()
    var completedAt: Date?
    /// The linked reminder's `calendarItemIdentifier` once Reminders sync has
    /// seen this task. Kept when sync is off so turning it back on re-links.
    var reminderID: String?
    /// Free text, synced to the reminder's notes. A link in it gets a button on the row.
    var notes: String?

    var isDone: Bool { completedAt != nil }

    /// The order the notch steps through, one task at a time. Priority wins;
    /// among equals the nearest deadline goes first and undated tasks wait.
    static func queue(_ items: [TodoItem]) -> [TodoItem] {
        items.filter { !$0.isDone }.sorted { lhs, rhs in
            if lhs.priority != rhs.priority { return lhs.priority > rhs.priority }
            switch (lhs.deadline, rhs.deadline) {
            case let (left?, right?) where left != right: return left < right
            case (.some, nil): return true
            case (nil, .some): return false
            default: return lhs.createdAt < rhs.createdAt
            }
        }
    }

    /// Today's tally for the window header and the notch ring: what's been
    /// finished today against that plus what's still due today or overdue.
    static func todayProgress(_ items: [TodoItem], now: Date) -> (done: Int, total: Int) {
        let done = items.filter { $0.completedAt.map { Calendar.current.isDate($0, inSameDayAs: now) } ?? false }.count
        let left = items.filter { TaskList.of(deadline: $0.deadline, isDone: $0.isDone, now: now) == .today }.count
        return (done, done + left)
    }

    enum DueUrgency { case overdue, soon, later }

    /// Shared by the notch card and the Tasks window so the two never disagree
    /// about what "soon" means. `lead` is the deadline-alert lead, in seconds.
    static func dueText(_ deadline: Date, now: Date, lead: TimeInterval) -> (text: Text, urgency: DueUrgency) {
        let remaining = deadline.timeIntervalSince(now)
        if remaining < 0 {
            // A bare time reads as today's, so older misses say the day instead.
            let when = Calendar.current.isDateInToday(deadline)
                ? Text(deadline, format: .dateTime.hour().minute())
                : Text(deadline, format: .dateTime.day().month(.abbreviated))
            return (Text("Overdue · ") + when, .overdue)
        }
        if remaining < lead {
            return (Text("Due \(deadline.formatted(.relative(presentation: .named)))"), .soon)
        }
        if Calendar.current.isDateInToday(deadline) {
            return (Text("Due ") + Text(deadline, format: .dateTime.hour().minute()), .later)
        }
        return (Text("Due ") + Text(deadline, format: .dateTime.day().month(.abbreviated).hour().minute()), .later)
    }
}

enum TodoPriority: Int, Codable, CaseIterable, Identifiable, Comparable {
    case low, medium, high

    var id: Int { rawValue }

    var label: LocalizedStringKey {
        switch self {
        case .low: "Low"
        case .medium: "Medium"
        case .high: "High"
        }
    }

    var color: Color {
        switch self {
        // Grey, not blue: low priority should read as quiet, not as "info".
        case .low: .gray
        case .medium: .orange
        case .high: .red
        }
    }

    /// Shown beside the title, as in Reminders, so priority never rests on color alone.
    var marks: String {
        switch self {
        case .low: ""
        case .medium: "!"
        case .high: "!!"
        }
    }

    static func < (lhs: Self, rhs: Self) -> Bool { lhs.rawValue < rhs.rawValue }
}

/// What sits beside the player in the open notch.
enum HomePanel: String, Defaults.Serializable {
    case calendar
    case tasks

    /// With both switched on, the header button picks; with one, it's that one.
    static func resolve(calendar: Bool, tasks: Bool, chosen: HomePanel) -> HomePanel? {
        switch (calendar, tasks) {
        case (true, true): chosen
        case (true, false): .calendar
        case (false, true): .tasks
        case (false, false): nil
        }
    }

    static var current: HomePanel? {
        resolve(calendar: Defaults[.showCalendar], tasks: Defaults[.showTasks], chosen: Defaults[.homePanel])
    }
}
