import Defaults
import SwiftUI

struct TasksView: View {
    @Default(.todos) private var todos
    @State private var title = ""
    @State private var priority: TodoPriority = .medium
    @State private var hasDeadline = false
    @State private var deadline = Date().addingTimeInterval(60 * 60)
    @State private var showCompleted = false

    private var trimmedTitle: String { title.trimmingCharacters(in: .whitespacesAndNewlines) }

    var body: some View {
        let open = TodoItem.queue(todos)
        let done = todos.filter(\.isDone).sorted { ($0.completedAt ?? .distantPast) > ($1.completedAt ?? .distantPast) }
        Form {
            Section("New task") {
                TextField("Title", text: $title, prompt: Text("What needs doing?"))
                    .labelsHidden()
                    .onSubmit(add)
                Picker("Priority", selection: $priority) {
                    ForEach(TodoPriority.allCases.reversed()) { Text($0.label).tag($0) }
                }
                .pickerStyle(.segmented)
                Toggle("Deadline", isOn: $hasDeadline)
                if hasDeadline {
                    DatePicker("Due", selection: $deadline, in: Date()..., displayedComponents: [.date, .hourAndMinute])
                }
                Button("Add task", action: add)
                    .keyboardShortcut(.defaultAction)
                    .disabled(trimmedTitle.isEmpty)
            }

            Section {
                if open.isEmpty {
                    Text("Nothing to do. The notch shows your top task here.")
                        .foregroundStyle(.secondary)
                }
                ForEach(open) { item in
                    row(item)
                }
            } header: {
                Text("Up next")
            } footer: {
                Text("The notch shows one task at a time: highest priority first, then the nearest deadline.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if !done.isEmpty {
                Section {
                    DisclosureGroup("Completed (\(done.count))", isExpanded: $showCompleted) {
                        ForEach(done) { item in
                            HStack {
                                Text(item.title)
                                    .strikethrough()
                                    .foregroundStyle(.secondary)
                                Spacer()
                                Button("Restore") { update(item.id) { $0.completedAt = nil } }
                                Button(role: .destructive) {
                                    todos.removeAll { $0.id == item.id }
                                } label: {
                                    Image(systemName: "trash")
                                }
                                .help("Delete")
                            }
                        }
                    }
                    Button("Clear completed", role: .destructive) {
                        todos.removeAll(where: \.isDone)
                    }
                }
            }
        }
        .formStyle(.grouped)
        .frame(minWidth: 480, minHeight: 420)
        .tint(.effectiveAccent)
    }

    private func row(_ item: TodoItem) -> some View {
        HStack(spacing: 8) {
            Button {
                update(item.id) { $0.completedAt = Date() }
            } label: {
                Image(systemName: "circle")
                    .foregroundStyle(item.priority.color)
            }
            .buttonStyle(.plain)
            .help("Mark done")

            TextField("Title", text: Binding(
                get: { item.title },
                set: { value in update(item.id) { $0.title = value } }
            ))
            .textFieldStyle(.plain)
            .labelsHidden()

            Picker("Priority", selection: Binding(
                get: { item.priority },
                set: { value in update(item.id) { $0.priority = value } }
            )) {
                ForEach(TodoPriority.allCases.reversed()) { Text($0.label).tag($0) }
            }
            .labelsHidden()
            .fixedSize()

            if let due = item.deadline {
                DatePicker("Due", selection: Binding(
                    get: { due },
                    set: { value in update(item.id) { $0.deadline = value } }
                ), displayedComponents: [.date, .hourAndMinute])
                .labelsHidden()
                .fixedSize()
                Button {
                    update(item.id) { $0.deadline = nil }
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                .help("Remove deadline")
            } else {
                Button {
                    update(item.id) { $0.deadline = Date().addingTimeInterval(60 * 60) }
                } label: {
                    Image(systemName: "calendar.badge.plus")
                }
                .buttonStyle(.plain)
                .help("Add a deadline")
            }

            Button(role: .destructive) {
                todos.removeAll { $0.id == item.id }
            } label: {
                Image(systemName: "trash")
            }
            .buttonStyle(.plain)
            .help("Delete")
        }
    }

    private func add() {
        guard !trimmedTitle.isEmpty else { return }
        todos.append(TodoItem(title: trimmedTitle, priority: priority, deadline: hasDeadline ? deadline : nil))
        title = ""
        hasDeadline = false
        deadline = Date().addingTimeInterval(60 * 60)
    }

    private func update(_ id: UUID, _ change: (inout TodoItem) -> Void) {
        guard let index = todos.firstIndex(where: { $0.id == id }) else { return }
        change(&todos[index])
    }
}
