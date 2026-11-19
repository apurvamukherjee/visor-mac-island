import SwiftUI

struct QuickAddBar: View {
    let list: TaskList
    var focus: FocusState<TaskFocus?>.Binding
    let add: (TodoItem) -> Void

    private enum Due: Equatable {
        case listDefault, noDate, date(Date)
    }

    @State private var title = ""
    /// Nil until picked by hand; until then a typed `!!` sets it.
    @State private var chosenPriority: TodoPriority?
    @State private var due = Due.listDefault
    @State private var picking = false

    private struct Draft {
        let title: String
        let deadline: Date?
        let priority: TodoPriority
        /// The date came from the typed text rather than a pick or the list default.
        let readDate: Bool
    }

    /// What the bar would add right now. A date or priority picked by hand
    /// wins, and then the matching words stay in the title as typed.
    private func entry(now: Date) -> Draft {
        let parsed = QuickEntry.parse(title, dates: due == .listDefault, priorities: chosenPriority == nil)
        let priority = chosenPriority ?? parsed.priority.flatMap(TodoPriority.init(rawValue:)) ?? .medium
        switch due {
        case .noDate: return Draft(title: parsed.title, deadline: nil, priority: priority, readDate: false)
        case let .date(date): return Draft(title: parsed.title, deadline: date, priority: priority, readDate: false)
        case .listDefault:
            if let read = parsed.deadline { return Draft(title: parsed.title, deadline: read, priority: priority, readDate: true) }
            // Unless a date is given, a new task lands in the list it was typed into.
            let fallback: Date? = switch list {
            case .today: DuePreset.laterToday.date(now: now)
            case .upcoming: DuePreset.tomorrow.date(now: now)
            case .inbox, .completed: nil
            }
            return Draft(title: parsed.title, deadline: fallback, priority: priority, readDate: false)
        }
    }

    var body: some View {
        let now = Date()
        let entry = entry(now: now)
        HStack(spacing: 10) {
            Image(systemName: "plus.circle.fill")
                .font(.system(size: 16))
                .foregroundStyle(list.tint)
            TextField("New task", text: $title, prompt: Text("New task — try “tomorrow 5pm !!”"))
                .textFieldStyle(.plain)
                .labelsHidden()
                .focused(focus, equals: .add)
                .onSubmit(submit)
                .onExitCommand { reset() }
            PriorityMenu(priority: Binding(get: { entry.priority }, set: { chosenPriority = $0 }))
            DueMenu(set: { due = $0.map(Due.date) ?? .noDate }, pick: { picking = true }, label: {
                HStack(spacing: 4) {
                    // The wand says the date came from the text, not a pick.
                    Image(systemName: entry.readDate ? "wand.and.stars" : entry.deadline == nil ? "calendar.badge.plus" : "calendar")
                    Text(entry.deadline.map { TaskList.shortLabel($0, now: now) } ?? String(localized: "No date"))
                }
                .font(.callout)
                .foregroundStyle(entry.readDate ? AnyShapeStyle(list.tint) : entry.deadline == nil ? AnyShapeStyle(.secondary) : AnyShapeStyle(.primary))
                .contentTransition(.numericText())
                .animation(.snappy, value: entry.deadline)
            })
            .help(entry.readDate ? "Read from what you typed. Pick another date to keep those words." : "Due date")
            .popover(isPresented: $picking, arrowEdge: .bottom) {
                DuePicker(draft: entry.deadline ?? DuePreset.tomorrow.date(now: Date())) { date in
                    due = .date(date)
                    picking = false
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
        .background(.quaternary.opacity(0.55), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .strokeBorder(list.tint.opacity(focus.wrappedValue == .add ? 0.6 : 0), lineWidth: 1.5)
        }
        .animation(.easeOut(duration: 0.15), value: focus.wrappedValue == .add)
        .onAppear { focus.wrappedValue = .add }
    }

    private func submit() {
        let entry = entry(now: Date())
        guard !entry.title.isEmpty else { return }
        add(TodoItem(title: entry.title, priority: entry.priority, deadline: entry.deadline))
        reset()
        focus.wrappedValue = .add
    }

    private func reset() {
        title = ""
        chosenPriority = nil
        due = .listDefault
    }
}

// MARK: - Shared controls

struct PriorityMenu: View {
    @Binding var priority: TodoPriority

    var body: some View {
        Menu {
            Picker("Priority", selection: $priority) {
                ForEach(TodoPriority.allCases.reversed()) { Text($0.label).tag($0) }
            }
            .pickerStyle(.inline)
            .labelsHidden()
        } label: {
            Image(systemName: priority == .low ? "flag" : "flag.fill")
                .foregroundStyle(priority.color)
                .contentTransition(.symbolEffect(.replace))
        }
        .menuStyle(.button)
        .buttonStyle(.plain)
        .menuIndicator(.hidden)
        .fixedSize()
        .help(Text("Priority: ") + Text(priority.label))
    }
}

struct DueMenu<Label: View>: View {
    let set: (Date?) -> Void
    let pick: () -> Void
    @ViewBuilder let label: Label

    var body: some View {
        Menu {
            DueMenuItems(set: set, pick: pick)
        } label: {
            label
        }
        .menuStyle(.button)
        .buttonStyle(.plain)
        .menuIndicator(.hidden)
        .fixedSize()
    }
}

struct DueMenuItems: View {
    let set: (Date?) -> Void
    let pick: () -> Void

    var body: some View {
        let now = Date()
        ForEach(DuePreset.allCases) { preset in
            let date = preset.date(now: now)
            let detail = preset == .nextWeek
                ? TaskList.dayTitle(date, now: now)
                : date.formatted(date: .omitted, time: .shortened)
            Button {
                set(date)
            } label: {
                Text(verbatim: "\(preset.title) · \(detail)")
            }
        }
        Button("Pick a date…", action: pick)
        Divider()
        Button("No date") { set(nil) }
    }
}

struct DuePicker: View {
    @State var draft: Date
    let apply: (Date) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            DatePicker("Date", selection: $draft, displayedComponents: .date)
                .datePickerStyle(.graphical)
                .labelsHidden()
            HStack {
                DatePicker("Time", selection: $draft, displayedComponents: .hourAndMinute)
                    .labelsHidden()
                Spacer()
                Button("Set") { apply(draft) }
                    .keyboardShortcut(.defaultAction)
            }
        }
        .padding(12)
        .frame(width: 250)
    }
}
