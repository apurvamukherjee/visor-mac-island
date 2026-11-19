import Foundation

// Foundation only, so scripts/check-task-lists.swift can compile it alone.

/// How a task's fields read and write as an Apple Reminder.
enum ReminderMapping {
    /// TodoPriority raw values (low 0, medium 1, high 2) to EventKit's 1 (high) … 9 (low).
    static func reminderPriority(todoPriority: Int) -> Int {
        switch todoPriority {
        case 2: 1
        case 0: 9
        default: 5
        }
    }

    /// Reminders made on the iPhone often have no priority (0); those read as medium.
    static func todoPriority(reminderPriority: Int) -> Int {
        switch reminderPriority {
        case 1...4: 2
        case 6...9: 0
        default: 1
        }
    }

    static func components(for deadline: Date, calendar: Calendar = .current) -> DateComponents {
        calendar.dateComponents([.calendar, .timeZone, .year, .month, .day, .hour, .minute], from: deadline)
    }

    /// A date-only reminder becomes 9 am that day: at midnight it would read
    /// as overdue all day, and the notch would count down to it at 23:45 before.
    static func deadline(from components: DateComponents?, calendar: Calendar = .current) -> Date? {
        guard var components else { return nil }
        if components.hour == nil {
            components.hour = 9
            components.minute = 0
        }
        return calendar.date(from: components)
    }

    /// Reminders keep minutes, tasks keep seconds; comparing to the minute stops
    /// that difference from looking like an edit and re-saving forever.
    static func sameMinute(_ lhs: Date?, _ rhs: Date?) -> Bool {
        switch (lhs, rhs) {
        case (nil, nil): true
        case let (lhs?, rhs?): floor(lhs.timeIntervalSinceReferenceDate / 60) == floor(rhs.timeIntervalSinceReferenceDate / 60)
        default: false
        }
    }
}
