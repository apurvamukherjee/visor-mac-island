import Defaults
import SwiftUI

/// One task at a time beside the player, in the calendar's slot and size.
struct TasksPanelView: View {
    @EnvironmentObject var vm: VisorViewModel
    @Default(.todos) private var todos
    @Default(.taskAlertLead) private var lead
    /// How far Next has stepped from the top of the queue; back to 0 on close.
    @State private var step = 0

    var body: some View {
        let queue = TodoItem.queue(todos)
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text("Tasks")
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                if queue.count > 1 {
                    Text("+\(queue.count - 1) more")
                        .font(.caption)
                        .foregroundColor(Color(white: 0.65))
                }
                Spacer(minLength: 0)
                iconButton("plus", help: "Add a task") {
                    TasksWindowController.shared.showWindow()
                }
            }
            if queue.isEmpty {
                emptyState
            } else {
                card(queue[step % queue.count], hasNext: queue.count > 1)
            }
            Spacer(minLength: 0)
        }
        .frame(height: 120)
        .onChange(of: vm.notchState) { _, state in
            if state == .closed { step = 0 }
        }
    }

    private func card(_ item: TodoItem, hasNext: Bool) -> some View {
        HStack(alignment: .top, spacing: 6) {
            Rectangle()
                .fill(item.priority.color)
                .frame(width: 3)
                .cornerRadius(1.5)
            VStack(alignment: .leading, spacing: 2) {
                Text(item.title)
                    .font(.callout)
                    .fontWeight(.medium)
                    .foregroundColor(.white)
                    .lineLimit(2)
                if let deadline = item.deadline {
                    // The timeline only redraws; its date is the minute's start, which reads
                    // a just-passed deadline as still ahead.
                    TimelineView(.everyMinute) { _ in
                        dueLine(deadline, now: Date())
                    }
                } else {
                    Text(item.priority.label)
                        .font(.caption)
                        .foregroundColor(Color(white: 0.65))
                }
            }
            Spacer(minLength: 0)
            VStack(spacing: 6) {
                iconButton("checkmark", help: "Mark done") {
                    withAnimation(.smooth) { complete(item) }
                }
                if hasNext {
                    iconButton("chevron.right", help: "Next task") {
                        withAnimation(.smooth) { step += 1 }
                    }
                }
            }
        }
        .fixedSize(horizontal: false, vertical: true)
        .id(item.id)
        .transition(.opacity)
    }

    @ViewBuilder
    private func dueLine(_ deadline: Date, now: Date) -> some View {
        let remaining = deadline.timeIntervalSince(now)
        Group {
            if remaining < 0 {
                Text("Overdue · ") + Text(deadline, format: .dateTime.hour().minute())
            } else if remaining < TimeInterval(lead * 60) {
                Text("Due \(deadline.formatted(.relative(presentation: .named)))")
            } else if Calendar.current.isDateInToday(deadline) {
                Text("Due ") + Text(deadline, format: .dateTime.hour().minute())
            } else {
                Text("Due ") + Text(deadline, format: .dateTime.day().month(.abbreviated).hour().minute())
            }
        }
        .font(.caption)
        .foregroundColor(remaining < 0 ? .red : remaining < TimeInterval(lead * 60) ? .orange : Color(white: 0.65))
        .lineLimit(1)
    }

    private var emptyState: some View {
        Button {
            TasksWindowController.shared.showWindow()
        } label: {
            VStack(spacing: 4) {
                Image(systemName: "checklist")
                    .font(.title2)
                    .foregroundColor(Color(white: 0.65))
                Text("Add a task")
                    .font(.subheadline)
                    .foregroundColor(.white)
            }
            .frame(maxWidth: .infinity)
            .contentShape(Rectangle())
        }
        .buttonStyle(PlainButtonStyle())
    }

    private func iconButton(_ systemImage: String, help: LocalizedStringKey, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.white)
                .frame(width: 24, height: 24)
                .background(Circle().fill(Color.white.opacity(0.12)))
        }
        .buttonStyle(PlainButtonStyle())
        .help(help)
    }

    private func complete(_ item: TodoItem) {
        guard let index = todos.firstIndex(where: { $0.id == item.id }) else { return }
        todos[index].completedAt = Date()
    }
}
