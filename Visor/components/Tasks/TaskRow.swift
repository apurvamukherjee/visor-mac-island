import SwiftUI

struct TaskRow: View {
    let item: TodoItem
    let now: Date
    /// The deadline-alert lead in seconds, inside which a due date turns orange.
    let lead: TimeInterval
    /// Upcoming already heads each day, so its rows only need the time.
    let dayInHeading: Bool
    /// Ticked, waiting a moment before it moves to Completed.
    let isCompleting: Bool
    var focus: FocusState<TaskFocus?>.Binding
    let update: ((inout TodoItem) -> Void) -> Void
    let toggleDone: () -> Void
    let delete: () -> Void

    @State private var hovering = false
    @State private var pickingDate = false
    @State private var editingNote = false

    private var looksDone: Bool { item.isDone || isCompleting }

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            checkbox
            VStack(alignment: .leading, spacing: 2) {
                titleLine
                if let notes = item.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
            Spacer(minLength: 8)
            if let notes = item.notes, let url = QuickEntry.firstURL(in: notes) {
                Button {
                    NSWorkspace.shared.open(url)
                } label: {
                    Image(systemName: "link")
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                .help(url.host ?? url.absoluteString)
            }
            trailing
            moreMenu
                // Faded rather than removed, so the row doesn't reflow on hover.
                .opacity(hovering ? 1 : 0)
        }
        .padding(.vertical, 5)
        .padding(.horizontal, 6)
        .background(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(Color.primary.opacity(hovering ? 0.05 : 0))
        )
        .contentShape(Rectangle())
        .onHover { hovering = $0 }
        .animation(.easeOut(duration: 0.12), value: hovering)
        .contextMenu { contextItems }
        .popover(isPresented: $pickingDate, arrowEdge: .trailing) {
            DuePicker(draft: item.deadline ?? DuePreset.tomorrow.date(now: Date())) { date in
                setDeadline(date)
                pickingDate = false
            }
        }
        .popover(isPresented: $editingNote, arrowEdge: .trailing) {
            NoteEditor(text: Binding(
                get: { item.notes ?? "" },
                set: { value in update { $0.notes = value.isEmpty ? nil : value } }
            ))
        }
    }

    private var checkbox: some View {
        Button(action: toggleDone) {
            Image(systemName: looksDone ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 16))
                .foregroundStyle(item.isDone ? Color.secondary : item.priority.color)
                .contentTransition(.symbolEffect(.replace))
                .symbolEffect(.bounce, value: isCompleting)
        }
        .buttonStyle(.plain)
        .help(item.isDone ? "Restore" : isCompleting ? "Keep open" : "Mark done")
    }

    @ViewBuilder
    private var titleLine: some View {
        HStack(alignment: .firstTextBaseline, spacing: 4) {
            if !item.priority.marks.isEmpty, !item.isDone {
                Text(item.priority.marks)
                    .fontWeight(.bold)
                    .foregroundStyle(item.priority.color)
                    .accessibilityLabel(Text(item.priority.label))
            }
            if looksDone {
                Text(item.title)
                    .strikethrough()
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            } else {
                TextField("Title", text: Binding(
                    get: { item.title },
                    set: { value in update { $0.title = value } }
                ))
                .textFieldStyle(.plain)
                .labelsHidden()
                .focused(focus, equals: .row(item.id))
                .onSubmit { focus.wrappedValue = nil }
                .onExitCommand { focus.wrappedValue = nil }
            }
        }
    }

    @ViewBuilder
    private var trailing: some View {
        if let completedAt = item.completedAt {
            Text(completedAt, format: .relative(presentation: .named))
                .font(.caption)
                .foregroundStyle(.secondary)
        } else if let deadline = item.deadline {
            DueMenu(set: setDeadline, pick: { pickingDate = true }, label: { dueChip(deadline) })
        } else {
            DueMenu(set: setDeadline, pick: { pickingDate = true }, label: {
                Image(systemName: "calendar.badge.plus")
                    .foregroundStyle(.secondary)
            })
            .opacity(hovering ? 1 : 0)
        }
    }

    private func dueChip(_ deadline: Date) -> some View {
        let due = TodoItem.dueText(deadline, now: now, lead: lead)
        let color = due.urgency == .overdue ? Color.red : due.urgency == .soon ? Color.orange : Color.secondary
        let text = dayInHeading && due.urgency == .later
            ? Text(deadline, format: .dateTime.hour().minute())
            : due.text
        return text
            .font(.caption)
            .foregroundStyle(color)
            .lineLimit(1)
            .padding(.horizontal, 7)
            .padding(.vertical, 2)
            .background(color.opacity(due.urgency == .later ? 0.08 : 0.14), in: Capsule())
    }

    private var moreMenu: some View {
        Menu {
            menuItems
        } label: {
            Image(systemName: "ellipsis.circle")
                .foregroundStyle(.secondary)
        }
        .menuStyle(.button)
        .buttonStyle(.plain)
        .menuIndicator(.hidden)
        .fixedSize()
        .help("More")
    }

    @ViewBuilder
    private var contextItems: some View {
        Button(item.isDone ? "Restore" : "Mark done", action: toggleDone)
        Divider()
        menuItems
    }

    @ViewBuilder
    private var menuItems: some View {
        if !item.isDone {
            Picker("Priority", selection: Binding(
                get: { item.priority },
                set: { value in update { $0.priority = value } }
            )) {
                ForEach(TodoPriority.allCases.reversed()) { Text($0.label).tag($0) }
            }
            Menu("Due") {
                DueMenuItems(set: setDeadline) { pickingDate = true }
            }
            if item.deadline != nil {
                Button("Move to Inbox") { setDeadline(nil) }
            }
        }
        Button(item.notes == nil ? "Add Note…" : "Edit Note…") { editingNote = true }
        Divider()
        Button("Delete", role: .destructive, action: delete)
    }

    private func setDeadline(_ date: Date?) {
        withAnimation(.smooth) { update { $0.deadline = date } }
    }
}

private struct NoteEditor: View {
    @Binding var text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Note")
                .font(.headline)
            TextEditor(text: $text)
                .font(.body)
                .scrollContentBackground(.hidden)
                .padding(6)
                .background(.quaternary.opacity(0.5), in: RoundedRectangle(cornerRadius: 6, style: .continuous))
                .frame(height: 110)
            Text("Links become a button on the task.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(12)
        .frame(width: 300)
    }
}
