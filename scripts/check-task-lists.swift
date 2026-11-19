// Run from the repo root:
//   swiftc -parse-as-library Visor/models/TaskList.swift Visor/models/ReminderMapping.swift Visor/models/QuickEntry.swift \
//     scripts/check-task-lists.swift -o /tmp/check-task-lists \
//     && /tmp/check-task-lists

import Foundation

@main
enum CheckTaskLists {
    static func main() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/London")!
        func at(_ day: Int, _ hour: Int, _ minute: Int = 0) -> Date {
            calendar.date(from: DateComponents(year: 2026, month: 11, day: day, hour: hour, minute: minute))!
        }
        // Thursday 19 Nov 2026, 2 pm.
        let now = at(19, 14)

        func list(_ deadline: Date?, done: Bool = false) -> TaskList {
            TaskList.of(deadline: deadline, isDone: done, now: now, calendar: calendar)
        }
        precondition(list(nil) == .inbox)
        precondition(list(at(19, 18)) == .today)
        precondition(list(at(18, 9)) == .today, "overdue stays in Today")
        precondition(list(at(19, 23, 59)) == .today)
        precondition(list(at(20, 0)) == .upcoming, "midnight belongs to tomorrow")
        precondition(list(at(19, 18), done: true) == .completed)

        let today = TaskList.groups(
            [at(18, 9), at(19, 18), at(19, 10)], in: .today, deadline: { $0 }, now: now, calendar: calendar)
        precondition(today.map(\.id) == ["overdue", "today"])
        precondition(today[0].items == [at(18, 9), at(19, 10)], "earlier today is overdue too")
        precondition(today[1].title == "Today")
        let todayOnly = TaskList.groups([at(19, 18)], in: .today, deadline: { $0 }, now: now, calendar: calendar)
        precondition(todayOnly.count == 1 && todayOnly[0].title == nil)

        let upcoming = TaskList.groups(
            [at(22, 9), at(20, 18), at(20, 9)], in: .upcoming, deadline: { $0 }, now: now, calendar: calendar)
        precondition(upcoming.map(\.items) == [[at(20, 18), at(20, 9)], [at(22, 9)]], "by day, input order kept")
        precondition(upcoming[0].title == "Tomorrow")
        precondition(TaskList.groups([Date](), in: .inbox, deadline: { $0 }, now: now).isEmpty)

        precondition(DuePreset.laterToday.date(now: now, calendar: calendar) == at(19, 18))
        precondition(DuePreset.laterToday.date(now: at(19, 17, 30), calendar: calendar) == at(19, 18),
                     "next whole hour, at least 30 min out")
        precondition(DuePreset.laterToday.date(now: at(19, 17, 40), calendar: calendar) == at(19, 19))
        precondition(DuePreset.laterToday.date(now: at(19, 23, 40), calendar: calendar) == at(19, 23, 59),
                     "never spills into tomorrow")
        precondition(DuePreset.tomorrow.date(now: now, calendar: calendar) == at(20, 9))
        precondition(DuePreset.nextWeek.date(now: now, calendar: calendar) == at(23, 9))
        precondition(DuePreset.nextWeek.date(now: at(22, 14), calendar: calendar) == at(30, 9),
                     "on Sunday, next week is not tomorrow")
        for preset in DuePreset.allCases {
            let date = preset.date(now: now, calendar: calendar)
            precondition(date > now, "\(preset) is in the past")
        }
        precondition(list(DuePreset.laterToday.date(now: at(19, 23, 40), calendar: calendar)) == .today)

        for raw in 0...2 {
            precondition(ReminderMapping.todoPriority(reminderPriority: ReminderMapping.reminderPriority(todoPriority: raw)) == raw)
        }
        precondition(ReminderMapping.todoPriority(reminderPriority: 0) == 1, "no priority reads as medium")
        precondition(ReminderMapping.todoPriority(reminderPriority: 3) == 2)
        precondition(ReminderMapping.todoPriority(reminderPriority: 7) == 0)

        let withSeconds = at(20, 18, 30).addingTimeInterval(42)
        let roundTrip = ReminderMapping.deadline(from: ReminderMapping.components(for: withSeconds, calendar: calendar), calendar: calendar)
        precondition(roundTrip == at(20, 18, 30), "reminders keep minutes")
        precondition(ReminderMapping.sameMinute(withSeconds, roundTrip), "so seconds aren't an edit")
        precondition(!ReminderMapping.sameMinute(at(20, 18), at(20, 18, 1)))
        precondition(ReminderMapping.sameMinute(nil, nil) && !ReminderMapping.sameMinute(nil, now))
        let dateOnly = DateComponents(calendar: calendar, timeZone: calendar.timeZone, year: 2026, month: 11, day: 20)
        precondition(ReminderMapping.deadline(from: dateOnly, calendar: calendar) == at(20, 9), "all-day reads as 9 am")
        precondition(ReminderMapping.deadline(from: nil, calendar: calendar) == nil)

        checkQuickEntry()
        print("task lists OK")
    }

    /// The date detector only knows the real clock, so these run against today.
    static func checkQuickEntry() {
        let cal = Calendar.current
        let today = Date()
        let tomorrow = cal.date(byAdding: .day, value: 1, to: cal.startOfDay(for: today))!
        func at(_ day: Date, _ hour: Int) -> Date { cal.date(bySettingHour: hour, minute: 0, second: 0, of: day)! }

        let plain = QuickEntry.parse("  Read chapter notes ")
        precondition(plain == QuickEntry(title: "Read chapter notes", deadline: nil, priority: nil), "\(plain)")

        let timed = QuickEntry.parse("call bank tomorrow at 5pm !!!")
        precondition(timed.title == "call bank", "\(timed)")
        precondition(timed.deadline == at(tomorrow, 17), "\(timed)")
        precondition(timed.priority == 2)

        let dayOnly = QuickEntry.parse("pay rent by tomorrow")
        precondition(dayOnly.title == "pay rent", "dangling 'by' goes: \(dayOnly)")
        precondition(dayOnly.deadline == at(tomorrow, 9), "a bare day is 9 am, not noon: \(dayOnly)")

        precondition(QuickEntry.parse("! tidy desk").priority == 0)
        precondition(QuickEntry.parse("tidy desk !!").priority == 1)
        precondition(QuickEntry.parse("tidy desk !!").title == "tidy desk")
        precondition(QuickEntry.parse("wow!! great").priority == nil, "only a standalone !")
        precondition(QuickEntry.parse("shop for").title == "shop for", "no date, nothing stripped")

        let mid = QuickEntry.parse("email Sam tomorrow about invoice")
        precondition(mid.title == "email Sam about invoice" && mid.deadline != nil, "\(mid)")

        if let todayOnly = QuickEntry.parse("water plants today").deadline {
            precondition(todayOnly > today && cal.isDate(todayOnly, inSameDayAs: today) || cal.component(.hour, from: today) == 23,
                         "a bare today is never already overdue: \(todayOnly)")
        }

        let manual = QuickEntry.parse("call bank tomorrow !!", dates: false, priorities: false)
        precondition(manual == QuickEntry(title: "call bank tomorrow !!", deadline: nil, priority: nil), "\(manual)")

        precondition(QuickEntry.firstURL(in: "see https://example.com/a?b=1 for details")?.host == "example.com")
        precondition(QuickEntry.firstURL(in: "no link here") == nil)
    }
}
