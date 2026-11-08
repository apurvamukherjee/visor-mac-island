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
        case .low: .blue
        case .medium: .orange
        case .high: .red
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
