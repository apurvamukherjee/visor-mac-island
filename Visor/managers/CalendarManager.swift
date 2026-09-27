import Defaults
@preconcurrency import EventKit
import SwiftUI
@MainActor
class CalendarManager: ObservableObject {
    static let shared = CalendarManager()

    @Published var currentWeekStartDate: Date
    @Published var events: [EventModel] = []
    @Published var allCalendars: [CalendarModel] = []
    @Published var eventCalendars: [CalendarModel] = []
    @Published var reminderLists: [CalendarModel] = []
    @Published var selectedCalendarIDs: Set<String> = []
    @Published var calendarAuthorizationStatus: EKAuthorizationStatus = .notDetermined
    @Published var reminderAuthorizationStatus: EKAuthorizationStatus = .notDetermined
    private var selectedCalendars: [CalendarModel] = []
    private let store = EKEventStore()

    private init() {
        self.currentWeekStartDate = CalendarManager.startOfDay(Date())
        setupEventStoreChangedObserver()
        Task {
            await reloadCalendarAndReminderLists()
        }
    }

    private func setupEventStoreChangedObserver() {
        NotificationCenter.default.addObserver(
            forName: .EKEventStoreChanged,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task {
                await self?.reloadCalendarAndReminderLists()
            }
        }
    }

    @MainActor
    func reloadCalendarAndReminderLists() async {
        let all = [EKEntityType.event, .reminder]
            .filter { EKEventStore.authorizationStatus(for: $0) == .fullAccess }
            .flatMap { store.calendars(for: $0) }
            .map { CalendarModel(from: $0) }
        self.eventCalendars = all.filter { !$0.isReminder }
        self.reminderLists = all.filter { $0.isReminder }
        self.allCalendars = all
        updateSelectedCalendars()
    }
    func checkAuthorization(for type: EKEntityType) async {
        let status: ReferenceWritableKeyPath<CalendarManager, EKAuthorizationStatus> =
            type == .event ? \.calendarAuthorizationStatus : \.reminderAuthorizationStatus
        self[keyPath: status] = EKEventStore.authorizationStatus(for: type)

        switch self[keyPath: status] {
        case .notDetermined:
            let request = type == .event ? store.requestFullAccessToEvents : store.requestFullAccessToReminders
            guard let granted = try? await request() else { return }
            self[keyPath: status] = granted ? .fullAccess : .denied
            guard granted else { return }
        case .fullAccess:
            break
        default:
            return
        }

        await reloadCalendarAndReminderLists()
        if type == .event {
            await updateEvents()
        }
    }

    func updateSelectedCalendars() {
        switch Defaults[.calendarSelectionState] {
        case .all:
            selectedCalendarIDs = Set(allCalendars.map { $0.id })
        case .selected(let identifiers):
            selectedCalendarIDs = identifiers
        }

        selectedCalendars = allCalendars.filter { selectedCalendarIDs.contains($0.id) }
    }

    func getCalendarSelected(_ calendar: CalendarModel) -> Bool {
        return selectedCalendarIDs.contains(calendar.id)
    }

    func setCalendarSelected(_ calendar: CalendarModel, isSelected: Bool) async {
        var selectionState = Defaults[.calendarSelectionState]

        switch selectionState {
        case .all:
            if !isSelected {
                let identifiers = Set(allCalendars.map { $0.id }).subtracting([calendar.id])
                selectionState = .selected(identifiers)
            }

        case .selected(var identifiers):
            if isSelected {
                identifiers.insert(calendar.id)
            } else {
                identifiers.remove(calendar.id)
            }

            selectionState =
                identifiers.isEmpty
                ? .all : identifiers.count == allCalendars.count ? .all : .selected(identifiers)  // if empty, select all
        }

        Defaults[.calendarSelectionState] = selectionState
        updateSelectedCalendars()
        await updateEvents()
    }

    static func startOfDay(_ date: Date) -> Date {
        return Calendar.current.startOfDay(for: date)
    }

    func updateCurrentDate(_ date: Date) async {
        currentWeekStartDate = Calendar.current.startOfDay(for: date)
        await updateEvents()
    }

    private func updateEvents() async {
        let ids = Set(selectedCalendars.map { $0.id })
        let start = currentWeekStartDate
        let end = Calendar.current.date(byAdding: .day, value: 1, to: start)!
        func calendars(for type: EKEntityType) -> [EKCalendar] {
            store.calendars(for: type).filter { ids.isEmpty || ids.contains($0.calendarIdentifier) }
        }

        var events: [EventModel] = []
        if EKEventStore.authorizationStatus(for: .event) == .fullAccess {
            let predicate = store.predicateForEvents(withStart: start, end: end, calendars: calendars(for: .event))
            events += store.events(matching: predicate).compactMap { EventModel(from: $0) }
        }
        if EKEventStore.authorizationStatus(for: .reminder) == .fullAccess {
            let predicate = store.predicateForReminders(in: calendars(for: .reminder))
            events += await withCheckedContinuation { continuation in
                store.fetchReminders(matching: predicate) { reminders in
                    continuation.resume(returning: (reminders ?? []).compactMap { reminder -> EventModel? in
                        guard let due = reminder.dueDateComponents?.date, due >= start, due <= end else { return nil }
                        return EventModel(from: reminder)
                    })
                }
            }
        }
        self.events = events.sorted { $0.start < $1.start }
    }

    func setReminderCompleted(reminderID: String, completed: Bool) async {
        if let reminder = store.calendarItem(withIdentifier: reminderID) as? EKReminder {
            reminder.isCompleted = completed
            do {
                try store.save(reminder, commit: true)
            } catch {
                print("Failed to update reminder completion: \(error)")
            }
        }
        await updateEvents()
    }
}

// MARK: - Model Extensions

extension CalendarModel {
    init(from calendar: EKCalendar) {
        self.init(
            id: calendar.calendarIdentifier,
            title: calendar.title,
            color: calendar.color,
            isReminder: calendar.allowedEntityTypes.contains(.reminder)
        )
    }
}

extension EventModel {
    init?(from event: EKEvent) {
        guard let calendar = event.calendar else { return nil }
        
        self.init(
            id: event.calendarItemIdentifier,
            start: event.startDate,
            end: event.endDate,
            title: event.title ?? "",
            location: event.location,
            isAllDay: event.shouldBeAllDay,
            type: .event,
            calendar: .init(from: calendar),
            hasRecurrenceRules: event.hasRecurrenceRules || event.isDetached
        )
    }
    
    init?(from reminder: EKReminder) {
        guard let calendar = reminder.calendar,
              let dueDateComponents = reminder.dueDateComponents,
              let date = Calendar.current.date(from: dueDateComponents)
        else { return nil }
        
        self.init(
            id: reminder.calendarItemIdentifier,
            start: date,
            end: Calendar.current.endOfDay(for: date),
            title: reminder.title ?? "",
            location: reminder.location,
            isAllDay: dueDateComponents.hour == nil,
            type: .reminder(completed: reminder.isCompleted),
            calendar: .init(from: calendar),
            hasRecurrenceRules: reminder.hasRecurrenceRules
        )
    }
}

private extension EKEvent {
    var shouldBeAllDay: Bool {
        guard !isAllDay else { return true }
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: startDate)
        let endOfDay = calendar.dateInterval(of: .day, for: endDate)?.end
        return startDate == startOfDay && endDate == endOfDay
    }
}

private extension Calendar {
    func endOfDay(for date: Date) -> Date {
        dateInterval(of: .day, for: date)?.end ?? date
    }
}
