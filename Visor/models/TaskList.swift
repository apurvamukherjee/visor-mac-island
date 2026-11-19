import Foundation

// Foundation only, so scripts/check-task-lists.swift can compile it alone.

/// The Tasks window's smart lists. They're read off the deadline, so nothing
/// new is stored and old todos need no migration.
enum TaskList: String, CaseIterable, Identifiable {
    case inbox, today, upcoming, completed

    var id: String { rawValue }

    var title: String {
        switch self {
        case .inbox: String(localized: "Inbox")
        case .today: String(localized: "Today")
        case .upcoming: String(localized: "Upcoming")
        case .completed: String(localized: "Completed")
        }
    }

    var systemImage: String {
        switch self {
        case .inbox: "tray"
        case .today: "sun.max"
        case .upcoming: "calendar"
        case .completed: "checkmark.circle"
        }
    }

    /// Overdue tasks stay in Today rather than vanishing into the past.
    static func of(deadline: Date?, isDone: Bool, now: Date, calendar: Calendar = .current) -> TaskList {
        if isDone { return .completed }
        guard let deadline else { return .inbox }
        return deadline < startOfTomorrow(now, calendar) ? .today : .upcoming
    }

    /// Splits one list's items, already in display order, into headed sections.
    static func groups<Item>(
        _ items: [Item],
        in list: TaskList,
        deadline: (Item) -> Date?,
        now: Date,
        calendar: Calendar = .current
    ) -> [TaskGroup<Item>] {
        switch list {
        case .inbox, .completed:
            return items.isEmpty ? [] : [TaskGroup(id: list.rawValue, title: nil, items: items)]
        case .today:
            func isOverdue(_ item: Item) -> Bool { deadline(item).map { $0 < now } ?? false }
            let overdue = items.filter(isOverdue)
            let rest = items.filter { !isOverdue($0) }
            // A lone "Today" heading under a "Today" title is noise.
            return [
                TaskGroup(id: "overdue", title: String(localized: "Overdue"), items: overdue),
                TaskGroup(id: "today", title: overdue.isEmpty ? nil : String(localized: "Today"), items: rest),
            ].filter { !$0.items.isEmpty }
        case .upcoming:
            let byDay = Dictionary(grouping: items) { calendar.startOfDay(for: deadline($0) ?? now) }
            return byDay.sorted { $0.key < $1.key }.map { day, items in
                TaskGroup(
                    id: String(day.timeIntervalSinceReferenceDate),
                    title: dayTitle(day, now: now, calendar: calendar),
                    items: items
                )
            }
        }
    }

    static func dayTitle(_ day: Date, now: Date, calendar: Calendar = .current) -> String {
        let start = calendar.startOfDay(for: day)
        if start == calendar.startOfDay(for: now) { return String(localized: "Today") }
        if start == startOfTomorrow(now, calendar) { return String(localized: "Tomorrow") }
        return day.formatted(Date.FormatStyle(calendar: calendar).weekday(.abbreviated).day().month(.abbreviated))
    }

    /// What a due-date button says: just the time today, the day otherwise.
    static func shortLabel(_ date: Date, now: Date, calendar: Calendar = .current) -> String {
        let time = date.formatted(Date.FormatStyle(calendar: calendar).hour().minute())
        let start = calendar.startOfDay(for: date)
        if start == calendar.startOfDay(for: now) { return time }
        if start == startOfTomorrow(now, calendar) { return String(localized: "Tomorrow \(time)") }
        return dayTitle(date, now: now, calendar: calendar)
    }

    static func startOfTomorrow(_ now: Date, _ calendar: Calendar) -> Date {
        calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: now)) ?? now
    }
}

struct TaskGroup<Item>: Identifiable {
    let id: String
    let title: String?
    let items: [Item]
}

/// One-click due dates in the quick-add bar and a task's Due menu.
enum DuePreset: CaseIterable, Identifiable {
    case laterToday, tomorrow, nextWeek

    var id: Self { self }

    var title: String {
        switch self {
        case .laterToday: String(localized: "Later today")
        case .tomorrow: String(localized: "Tomorrow")
        case .nextWeek: String(localized: "Next week")
        }
    }

    func date(now: Date, calendar: Calendar = .current) -> Date {
        let today = calendar.startOfDay(for: now)
        switch self {
        case .laterToday:
            // 6 pm while it's at least an hour away, then the next whole hour,
            // but never past midnight: a task added from Today must land in Today.
            let evening = calendar.date(bySettingHour: 18, minute: 0, second: 0, of: now) ?? now
            let candidate = evening.timeIntervalSince(now) >= 3600 ? evening : Self.nextHour(after: now, calendar)
            return min(candidate, TaskList.startOfTomorrow(now, calendar).addingTimeInterval(-60))
        case .tomorrow:
            let tomorrow = TaskList.startOfTomorrow(now, calendar)
            return calendar.date(bySettingHour: 9, minute: 0, second: 0, of: tomorrow) ?? tomorrow
        case .nextWeek:
            // Searching from the day after tomorrow, so on a Sunday this isn't
            // just Tomorrow again.
            let monday = DateComponents(hour: 9, minute: 0, weekday: 2)
            let from = calendar.date(byAdding: .day, value: 2, to: today) ?? today
            return calendar.nextDate(after: from, matching: monday, matchingPolicy: .nextTime) ?? from
        }
    }

    private static func nextHour(after now: Date, _ calendar: Calendar) -> Date {
        let hour = calendar.dateInterval(of: .hour, for: now)?.end ?? now
        return hour.timeIntervalSince(now) < 30 * 60 ? hour.addingTimeInterval(3600) : hour
    }
}
