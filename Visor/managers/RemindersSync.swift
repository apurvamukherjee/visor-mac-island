import AppKit
import Combine
import Defaults
@preconcurrency import EventKit

/// Two-way sync between `Defaults[.todos]` and a "Visor" list in Apple
/// Reminders, which iCloud carries to the iPhone and Watch.
///
/// A local edit pushes; a Reminders change pulls, and on a pull Reminders wins.
/// Each side echoes the other's write back once and finds nothing to change,
/// so no "applying remote" flag is needed.
@MainActor
final class RemindersSync: ObservableObject {
    static let shared = RemindersSync()

    enum State: Equatable {
        case off
        /// On in Settings but Reminders access is denied, so nothing moves.
        case denied
        case syncing
        case synced(Date)
        case failed(String)
    }

    static let listTitle = "Visor"

    @Published private(set) var state: State = .off

    private var store: EKEventStore { CalendarManager.shared.store }
    /// Reminder IDs linked as of the last run. Telling "deleted here" from
    /// "added there" needs it: both look like a reminder with no task.
    private var known: Set<String> = []
    /// What sync itself last wrote to `todos`, so the push it triggers is skipped.
    private var lastWritten: [TodoItem]?
    /// Runs one at a time; a fetch awaits, and two interleaved runs would
    /// both create the same reminder.
    private var queue: Task<Void, Never>?
    private var observers: Set<AnyCancellable> = []

    private enum Direction { case push, pull, both }

    private init() {}

    func start() {
        known = Set(Defaults[.todos].compactMap(\.reminderID))
        Defaults.publisher(.todos, options: [])
            .debounce(for: .milliseconds(500), scheduler: RunLoop.main)
            .sink { [weak self] _ in MainActor.assumeIsolated { self?.enqueue(.push) } }
            .store(in: &observers)
        // Changes arrive in bursts, and include every unrelated calendar edit.
        NotificationCenter.default.publisher(for: .EKEventStoreChanged)
            .debounce(for: .milliseconds(500), scheduler: RunLoop.main)
            .sink { [weak self] _ in MainActor.assumeIsolated { self?.enqueue(.pull) } }
            .store(in: &observers)
        if Defaults[.syncReminders] { enqueue(.both) }
    }

    /// Asks for access the first time. Stays off if it isn't granted.
    func enable() async {
        await CalendarManager.shared.checkAuthorization(for: .reminder)
        guard EKEventStore.authorizationStatus(for: .reminder) == .fullAccess else {
            state = .denied
            return
        }
        Defaults[.syncReminders] = true
        enqueue(.both)
    }

    /// Deletes nothing on either side and keeps each task's `reminderID`.
    func disable() {
        Defaults[.syncReminders] = false
        state = .off
    }

    func retry() { enqueue(.both) }

    /// Tasks that enabling would copy into Reminders.
    var unlinkedCount: Int { Defaults[.todos].filter { $0.reminderID == nil }.count }

    func showInReminders() {
        NSWorkspace.shared.openApplication(
            at: URL(fileURLWithPath: "/System/Applications/Reminders.app"),
            configuration: NSWorkspace.OpenConfiguration()
        )
    }

    private func enqueue(_ direction: Direction) {
        let previous = queue
        queue = Task { [weak self] in
            await previous?.value
            await self?.run(direction)
        }
    }

    private func run(_ direction: Direction) async {
        guard Defaults[.syncReminders] else { return }
        if direction == .push, Defaults[.todos] == lastWritten { return }
        guard EKEventStore.authorizationStatus(for: .reminder) == .fullAccess else {
            state = .denied
            return
        }
        // Only the first run shows Syncing; flashing it on every keystroke's push is noise.
        if case .synced = state {} else { state = .syncing }
        do {
            let list = try ensureList()
            guard let reminders = await fetch(in: list) else {
                throw SyncError.fetchFailed
            }
            var byID = Dictionary(reminders.map { ($0.calendarItemIdentifier, $0) }) { first, _ in first }
            if direction != .push { pull(&byID) }
            if direction != .pull { try push(list: list, byID: byID) }
            state = .synced(Date())
        } catch {
            state = .failed(error.localizedDescription)
        }
    }

    // MARK: - The list

    private func ensureList() throws -> EKCalendar {
        let storedID = Defaults[.remindersListID]
        if let storedID, let list = store.calendar(withIdentifier: storedID) { return list }

        let list = try store.calendars(for: .reminder).first { $0.title == Self.listTitle } ?? createList()
        Defaults[.remindersListID] = list.calendarIdentifier
        if storedID != nil {
            // The list was deleted or replaced: its reminder IDs mean nothing
            // now. Pull re-links by title before push creates anything, so
            // nothing is duplicated and nothing is deleted.
            write(Defaults[.todos].map { item in
                var item = item
                item.reminderID = nil
                return item
            })
            known = []
        }
        return list
    }

    private func createList() throws -> EKCalendar {
        let list = EKCalendar(for: .reminder, eventStore: store)
        list.title = Self.listTitle
        guard let source = store.defaultCalendarForNewReminders()?.source
            ?? store.sources.first(where: { $0.sourceType == .local })
        else { throw SyncError.noSource }
        list.source = source
        try store.saveCalendar(list, commit: true)
        return list
    }

    private func fetch(in list: EKCalendar) async -> [EKReminder]? {
        let predicate = store.predicateForReminders(in: [list])
        return await withCheckedContinuation { continuation in
            store.fetchReminders(matching: predicate) { continuation.resume(returning: $0) }
        }
    }

    // MARK: - Pull: Reminders → tasks

    private func pull(_ byID: inout [String: EKReminder]) {
        var todos = Defaults[.todos]
        let linked = Set(todos.compactMap(\.reminderID))

        // Gone from Reminders: deleted there, so delete here.
        todos.removeAll { item in
            guard let id = item.reminderID, byID[id] == nil else { return false }
            // A fetch can briefly miss an item mid-sync; only trust a definite absence.
            return store.calendarItem(withIdentifier: id) == nil
        }

        for (id, reminder) in byID {
            if let index = todos.firstIndex(where: { $0.reminderID == id }) {
                apply(reminder, to: &todos[index])
            } else if known.contains(id), !linked.contains(id) {
                // Deleted here, not yet pushed: leave it for push to remove.
                continue
            } else if let index = todos.firstIndex(where: { $0.reminderID == nil && $0.title == reminder.title }) {
                // Same title, no link yet: one task seen from both sides (a
                // re-enable, or a recreated list), not two.
                todos[index].reminderID = id
                apply(reminder, to: &todos[index])
            } else {
                var item = TodoItem(title: reminder.title ?? "", createdAt: reminder.creationDate ?? Date(), reminderID: id)
                apply(reminder, to: &item)
                todos.append(item)
            }
        }

        if todos != Defaults[.todos] { write(todos) }
        known = Set(todos.compactMap(\.reminderID))
    }

    private func apply(_ reminder: EKReminder, to item: inout TodoItem) {
        let title = reminder.title ?? ""
        if item.title != title { item.title = title }
        let notes = reminder.notes.flatMap { $0.isEmpty ? nil : $0 }
        if item.notes != notes { item.notes = notes }
        let priority = TodoPriority(rawValue: ReminderMapping.todoPriority(reminderPriority: reminder.priority)) ?? .medium
        if item.priority != priority { item.priority = priority }
        let deadline = ReminderMapping.deadline(from: reminder.dueDateComponents)
        if !ReminderMapping.sameMinute(item.deadline, deadline) { item.deadline = deadline }
        if item.isDone != reminder.isCompleted {
            item.completedAt = reminder.isCompleted ? (reminder.completionDate ?? Date()) : nil
        }
    }

    // MARK: - Push: tasks → Reminders

    private func push(list: EKCalendar, byID: [String: EKReminder]) throws {
        var todos = Defaults[.todos]
        let linked = Set(todos.compactMap(\.reminderID))
        var changed = false

        // Linked last run, no task now: deleted here, so delete there.
        for id in known.subtracting(linked) {
            if let reminder = byID[id] {
                try store.remove(reminder, commit: false)
                changed = true
            }
        }

        var assignedIDs = false
        for index in todos.indices {
            let item = todos[index]
            if let id = item.reminderID {
                // Missing means deleted in Reminders; the next pull removes the task.
                guard let reminder = byID[id] else { continue }
                if update(reminder, from: item) {
                    try store.save(reminder, commit: false)
                    changed = true
                }
            } else {
                let reminder = EKReminder(eventStore: store)
                reminder.calendar = list
                _ = update(reminder, from: item)
                try store.save(reminder, commit: false)
                todos[index].reminderID = reminder.calendarItemIdentifier
                assignedIDs = true
                changed = true
            }
        }

        if changed { try store.commit() }
        if assignedIDs { write(todos) }
        known = Set(todos.compactMap(\.reminderID))
    }

    /// True when anything changed, so untouched reminders aren't re-saved.
    private func update(_ reminder: EKReminder, from item: TodoItem) -> Bool {
        var changed = false
        if reminder.title != item.title {
            reminder.title = item.title
            changed = true
        }
        if (reminder.notes ?? "") != (item.notes ?? "") {
            reminder.notes = item.notes
            changed = true
        }
        let priority = ReminderMapping.reminderPriority(todoPriority: item.priority.rawValue)
        // Compared through the mapping so a 0 from the iPhone isn't rewritten as 5.
        if ReminderMapping.todoPriority(reminderPriority: reminder.priority) != item.priority.rawValue {
            reminder.priority = priority
            changed = true
        }
        if !ReminderMapping.sameMinute(ReminderMapping.deadline(from: reminder.dueDateComponents), item.deadline) {
            reminder.dueDateComponents = item.deadline.map { ReminderMapping.components(for: $0) }
            // The alarm is what makes the iPhone and Watch ring.
            reminder.alarms = item.deadline.map { [EKAlarm(absoluteDate: $0)] }
            changed = true
        }
        if reminder.isCompleted != item.isDone {
            reminder.completionDate = item.completedAt
            reminder.isCompleted = item.isDone
            changed = true
        }
        return changed
    }

    private func write(_ todos: [TodoItem]) {
        lastWritten = todos
        Defaults[.todos] = todos
    }
}

enum SyncError: LocalizedError {
    case fetchFailed
    case noSource

    var errorDescription: String? {
        switch self {
        case .fetchFailed: String(localized: "Couldn't read the Visor list from Reminders.")
        case .noSource: String(localized: "No Reminders account to create the Visor list in.")
        }
    }
}
