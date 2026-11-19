import Defaults
import SwiftUI

struct TasksView: View {
    @Default(.todos) private var todos
    @Default(.taskAlertLead) private var lead
    @Default(.syncReminders) private var syncReminders
    /// Nil until a list is picked: then Today, or Inbox while Today is empty.
    @State private var chosenList: TaskList?
    @State private var selection: Set<UUID> = []
    /// Ticked but not yet moved to Completed, so the checkmark is seen first.
    @State private var completing: Set<UUID> = []
    @State private var toast: Toast?
    @State private var confirmingClear = false
    @State private var dropTarget: TaskList?
    @FocusState private var focus: TaskFocus?

    var body: some View {
        // Re-read every minute so a deadline passing moves its task into Overdue,
        // and midnight moves tomorrow's tasks into Today, without an edit.
        TimelineView(.everyMinute) { _ in
            content(now: Date())
        }
        .frame(minWidth: 600, minHeight: 420)
        .tint(.effectiveAccent)
        .background { shortcuts }
        .overlay(alignment: .bottom) { toastView }
        .task(id: toast?.id) {
            guard toast != nil, (try? await Task.sleep(for: .seconds(5))) != nil else { return }
            withAnimation(.smooth) { toast = nil }
        }
    }

    private func content(now: Date) -> some View {
        let open = Dictionary(grouping: TodoItem.queue(todos)) {
            TaskList.of(deadline: $0.deadline, isDone: false, now: now)
        }
        let list = chosenList ?? (open[.today, default: []].isEmpty ? .inbox : .today)
        let items = list == .completed
            ? todos.filter(\.isDone).sorted { ($0.completedAt ?? .distantPast) > ($1.completedAt ?? .distantPast) }
            : open[list, default: []]

        return NavigationSplitView {
            sidebar(selected: list, open: open, now: now)
        } detail: {
            detail(list, items: items, now: now)
        }
        .toolbar(removing: .sidebarToggle)
        .toolbar {
            // With the window title hidden, .primaryAction sits at the leading
            // edge; a flexible space keeps the pill at the trailing one.
            ToolbarItemGroup {
                Spacer()
                RemindersSyncPill()
            }
        }
    }

    // MARK: - Sidebar

    private func sidebar(selected: TaskList, open: [TaskList: [TodoItem]], now: Date) -> some View {
        let overdue = open[.today, default: []].contains { ($0.deadline ?? .distantFuture) < now }
        return List(selection: Binding(get: { selected }, set: { picked in
            if let picked { select(picked) }
        })) {
            ForEach(TaskList.allCases) { entry in
                let count = entry == .completed ? 0 : open[entry, default: []].count
                HStack {
                    Label {
                        Text(entry.title)
                    } icon: {
                        Image(systemName: entry.systemImage)
                            .foregroundStyle(entry.tint)
                    }
                    Spacer()
                    if count > 0 {
                        Text("\(count)")
                            .font(.callout)
                            .monospacedDigit()
                            .foregroundStyle(entry == .today && overdue ? Color.red : Color.secondary)
                    }
                }
                .padding(.vertical, 2)
                .overlay {
                    if dropTarget == entry {
                        RoundedRectangle(cornerRadius: 6, style: .continuous)
                            .strokeBorder(entry.tint, lineWidth: 2)
                            .padding(-4)
                    }
                }
                .dropDestination(for: String.self) { ids, _ in
                    move(Set(ids.compactMap(UUID.init(uuidString:))), to: entry)
                    return true
                } isTargeted: { targeted in
                    dropTarget = targeted ? entry : (dropTarget == entry ? nil : dropTarget)
                }
                .tag(entry)
            }
        }
        .listStyle(.sidebar)
        .toolbar(removing: .sidebarToggle)
        .navigationSplitViewColumnWidth(min: 170, ideal: 180, max: 240)
    }

    // MARK: - Detail

    private func detail(_ list: TaskList, items: [TodoItem], now: Date) -> some View {
        let groups = TaskList.groups(items, in: list, deadline: \.deadline, now: now)
        return VStack(alignment: .leading, spacing: 0) {
            TasksHeader(list: list, items: items, todos: todos, now: now)
                .padding(.horizontal, 20)
                .padding(.top, 4)
                .padding(.bottom, 10)
            if list != .completed {
                QuickAddBar(list: list, focus: $focus) { item in
                    withAnimation(.smooth) { todos.append(item) }
                }
                // A fresh bar per list, so its date default follows the list.
                .id(list)
                .padding(.horizontal, 16)
                .padding(.bottom, 6)
            }
            if groups.isEmpty {
                emptyState(list)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                taskList(groups, in: list, now: now)
                if list == .completed { clearCompletedBar(count: items.count) }
            }
        }
        .navigationTitle(list.title)
    }

    private func taskList(_ groups: [TaskGroup<TodoItem>], in list: TaskList, now: Date) -> some View {
        // Headers are plain rows, not Section headers: those pin with a divider
        // line and leave tall gaps between days.
        List(selection: $selection) {
            ForEach(groups) { group in
                if let title = group.title {
                    sectionHeader(title, count: group.items.count, overdueItems: group.id == "overdue" ? group.items : nil)
                        .padding(.top, group.id == groups.first?.id ? 2 : 14)
                        .listRowSeparator(.hidden)
                        .listRowInsets(EdgeInsets(top: 0, leading: 14, bottom: 2, trailing: 14))
                }
                ForEach(group.items) { item in
                    TaskRow(
                        item: item,
                        now: now,
                        lead: TimeInterval(lead * 60),
                        dayInHeading: list == .upcoming,
                        isCompleting: completing.contains(item.id),
                        focus: $focus,
                        update: { change in update(item.id, change) },
                        toggleDone: { toggleDone([item.id]) },
                        delete: { delete([item.id]) }
                    )
                    .tag(item.id)
                    .listRowSeparator(.hidden)
                    .listRowInsets(EdgeInsets(top: 0, leading: 8, bottom: 0, trailing: 8))
                    .draggable(item.id.uuidString) {
                        Label(item.title, systemImage: "circle")
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(.regularMaterial, in: Capsule())
                    }
                }
            }
        }
        .listStyle(.inset)
        .scrollContentBackground(.hidden)
        .onDeleteCommand { delete(selection) }
        .onKeyPress(.space) {
            guard !selection.isEmpty else { return .ignored }
            toggleDone(selection)
            return .handled
        }
        .onKeyPress(.return) {
            guard list != .completed, selection.count == 1, let id = selection.first else { return .ignored }
            focus = .row(id)
            return .handled
        }
    }

    private func sectionHeader(_ title: String, count: Int, overdueItems: [TodoItem]?) -> some View {
        HStack(spacing: 6) {
            Text(title.uppercased())
                .font(.caption.weight(.semibold))
                .tracking(0.6)
                .foregroundStyle(overdueItems == nil ? Color.secondary : Color.red)
            Text("\(count)")
                .font(.caption)
                .foregroundStyle(.tertiary)
            Spacer()
            if let overdueItems {
                Button("Move to Today") {
                    let ids = Set(overdueItems.map(\.id))
                    let date = DuePreset.laterToday.date(now: Date())
                    withAnimation(.smooth) {
                        for id in ids { update(id) { $0.deadline = date } }
                    }
                }
                .buttonStyle(.link)
                .font(.caption)
                .help("Give every overdue task a time later today")
            }
        }
    }

    private func clearCompletedBar(count: Int) -> some View {
        // Not in the toolbar: a toolbar item only on this list makes the title
        // bar jump in height when switching lists.
        HStack {
            Spacer()
            Button("Clear completed", role: .destructive) { confirmingClear = true }
        }
        .padding(12)
        .confirmationDialog("Clear \(count) completed tasks?", isPresented: $confirmingClear) {
            Button("Clear", role: .destructive) {
                delete(Set(todos.filter(\.isDone).map(\.id)))
            }
        } message: {
            if syncReminders { Text("Also removes them from Reminders.") }
        }
    }

    private func emptyState(_ list: TaskList) -> some View {
        let description: LocalizedStringKey = switch list {
        case .inbox: "Tasks without a date land here."
        case .today: "Nothing due today. Type a task above, like “Call the bank 5pm”."
        case .upcoming: "Tasks dated after today show up here, grouped by day."
        case .completed: "Finished tasks land here. Click one's checkmark to bring it back."
        }
        return ContentUnavailableView {
            Label {
                Text(list.title)
            } icon: {
                Image(systemName: list.systemImage)
                    .foregroundStyle(list.tint)
            }
        } description: {
            Text(description)
        }
    }

    // MARK: - Toast

    @ViewBuilder
    private var toastView: some View {
        if let toast {
            HStack(spacing: 12) {
                Text(toast.message)
                    .lineLimit(1)
                Button("Undo") { undo() }
                    .buttonStyle(.link)
                    .fontWeight(.semibold)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(.regularMaterial, in: Capsule())
            .overlay(Capsule().strokeBorder(.separator))
            .shadow(color: .black.opacity(0.15), radius: 10, y: 4)
            .padding(.bottom, 16)
            .transition(.move(edge: .bottom).combined(with: .opacity))
            .id(toast.id)
        }
    }

    private func show(_ message: String, undo: @escaping () -> Void) {
        withAnimation(.smooth) { toast = Toast(message: message, undo: undo) }
    }

    private func undo() {
        guard let toast else { return }
        withAnimation(.smooth) {
            toast.undo()
            self.toast = nil
        }
    }

    // MARK: - Keyboard

    /// Invisible buttons, so the shortcuts work without a menu bar entry.
    private var shortcuts: some View {
        Group {
            Button("New Task") { focus = .add }
                .keyboardShortcut("n")
            ForEach(Array(TaskList.allCases.enumerated()), id: \.element) { index, list in
                Button(list.title) { select(list) }
                    .keyboardShortcut(KeyEquivalent(Character("\(index + 1)")))
            }
            // Only while a toast is up; otherwise ⌘Z stays with the text field.
            Button("Undo") { undo() }
                .keyboardShortcut("z")
                .disabled(toast == nil)
        }
        .opacity(0)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    // MARK: - Changes

    private func select(_ list: TaskList) {
        chosenList = list
        selection = []
        focus = nil
    }

    private func update(_ id: UUID, _ change: (inout TodoItem) -> Void) {
        guard let index = todos.firstIndex(where: { $0.id == id }) else { return }
        change(&todos[index])
    }

    /// Done tasks come back at once; open ones show their checkmark briefly
    /// before moving to Completed. A second click in that moment cancels.
    private func toggleDone(_ ids: Set<UUID>) {
        let done = Set(todos.filter { ids.contains($0.id) && $0.isDone }.map(\.id))
        if !done.isEmpty {
            withAnimation(.smooth) { for id in done { update(id) { $0.completedAt = nil } } }
        }
        let open = ids.subtracting(done)
        let cancelled = open.intersection(completing)
        withAnimation(.snappy) {
            completing.subtract(cancelled)
            completing.formUnion(open.subtracting(cancelled))
        }
        let pending = open.subtracting(cancelled)
        guard !pending.isEmpty else { return }
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(650))
            complete(pending.intersection(completing))
        }
    }

    private func complete(_ ids: Set<UUID>) {
        guard !ids.isEmpty else { return }
        let titles = todos.filter { ids.contains($0.id) }.map(\.title)
        withAnimation(.smooth) {
            for id in ids { update(id) { $0.completedAt = Date() } }
            completing.subtract(ids)
        }
        selection.subtract(ids)
        show(titles.count == 1 ? String(localized: "Completed “\(titles[0])”") : String(localized: "Completed \(titles.count) tasks")) {
            for id in ids { update(id) { $0.completedAt = nil } }
        }
    }

    private func delete(_ ids: Set<UUID>) {
        let removed = todos.enumerated().filter { ids.contains($0.element.id) }
        guard !removed.isEmpty else { return }
        withAnimation(.smooth) { todos.removeAll { ids.contains($0.id) } }
        selection.subtract(ids)
        completing.subtract(ids)
        let message = removed.count == 1
            ? String(localized: "Deleted “\(removed[0].element.title)”")
            : String(localized: "Deleted \(removed.count) tasks")
        show(message) {
            for (offset, item) in removed {
                var item = item
                // Sync may already have deleted its reminder; a restored task
                // then needs a new one, not a link to the gone one.
                item.reminderID = nil
                todos.insert(item, at: min(offset, todos.count))
            }
        }
    }

    /// A task dropped on a sidebar list takes that list's kind of date.
    private func move(_ ids: Set<UUID>, to list: TaskList) {
        dropTarget = nil
        let now = Date()
        if list == .completed {
            complete(Set(todos.filter { ids.contains($0.id) && !$0.isDone }.map(\.id)))
            return
        }
        withAnimation(.smooth) {
            for id in ids {
                update(id) { item in
                    item.completedAt = nil
                    guard TaskList.of(deadline: item.deadline, isDone: false, now: now) != list else { return }
                    switch list {
                    case .inbox: item.deadline = nil
                    case .today: item.deadline = DuePreset.laterToday.date(now: now)
                    case .upcoming: item.deadline = DuePreset.tomorrow.date(now: now)
                    case .completed: break
                    }
                }
            }
        }
    }
}

private struct Toast {
    let id = UUID()
    let message: String
    let undo: () -> Void
}
