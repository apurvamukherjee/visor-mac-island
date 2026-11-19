import SwiftUI

/// What has keyboard focus in the Tasks window: one value, so ⌘N, Return
/// and Esc can move it between the add bar and a row's title.
enum TaskFocus: Hashable {
    case add
    case row(UUID)
}

extension TaskList {
    var tint: Color {
        switch self {
        case .inbox: .blue
        case .today: .orange
        case .upcoming: .purple
        case .completed: .green
        }
    }
}

/// The list's large colored title, a line of counts, and Today's progress.
struct TasksHeader: View {
    let list: TaskList
    let items: [TodoItem]
    let todos: [TodoItem]
    let now: Date

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(list.title)
                .font(.system(size: 26, weight: .bold, design: .rounded))
                .foregroundStyle(list.tint)
            subtitle
                .font(.callout)
                .foregroundStyle(.secondary)
            if list == .today {
                let progress = TodoItem.todayProgress(todos, now: now)
                if progress.total > 0 {
                    ProgressBar(fraction: Double(progress.done) / Double(progress.total), tint: list.tint)
                        .padding(.top, 4)
                        .help("\(progress.done) of \(progress.total) done today")
                }
            }
        }
    }

    private var subtitle: Text {
        switch list {
        case .today:
            let date = Text(now, format: .dateTime.weekday(.wide).day().month(.wide))
            let overdue = items.filter { ($0.deadline ?? .distantFuture) < now }.count
            if items.isEmpty { return date + Text(" · All clear") }
            let left = date + Text(" · ^[\(items.count) task](inflect: true) left")
            return overdue > 0 ? left + Text(" · \(overdue) overdue") : left
        case .inbox:
            return Text("^[\(items.count) task](inflect: true) without a date")
        case .upcoming:
            return Text("^[\(items.count) task](inflect: true) ahead")
        case .completed:
            let today = items.filter { $0.completedAt.map { Calendar.current.isDate($0, inSameDayAs: now) } ?? false }.count
            return Text("^[\(items.count) task](inflect: true) done · \(today) today")
        }
    }
}

private struct ProgressBar: View {
    let fraction: Double
    let tint: Color

    var body: some View {
        Capsule()
            .fill(.quaternary)
            .frame(height: 4)
            .overlay(alignment: .leading) {
                Capsule()
                    .fill(tint)
                    .scaleEffect(x: max(0.001, min(1, fraction)), anchor: .leading)
            }
            .frame(maxWidth: 260)
            .animation(.smooth, value: fraction)
    }
}
