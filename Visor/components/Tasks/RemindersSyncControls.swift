import Defaults
import SwiftUI

/// The Reminders sync switch and its status. Settings shows it in the Tasks
/// section; the Tasks window's toolbar pill opens it in a popover.
struct RemindersSyncControls: View {
    @ObservedObject private var sync = RemindersSync.shared
    @Default(.syncReminders) private var enabled
    @State private var confirmingCount: Int?

    var body: some View {
        Toggle(isOn: Binding(get: { enabled }, set: { isOn in isOn ? requestEnable() : sync.disable() })) {
            Text("Sync with Apple Reminders")
            Text("Tasks live in a “Visor” list in Reminders, so they reach your iPhone and Apple Watch through iCloud. Turning this off deletes nothing.")
        }
        .confirmationDialog(
            "Copy \(confirmingCount ?? 0) tasks to Reminders?",
            isPresented: Binding(get: { confirmingCount != nil }, set: { if !$0 { confirmingCount = nil } }),
            titleVisibility: .visible
        ) {
            Button("Copy & Sync") { Task { await sync.enable() } }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("They go into a list called “Visor”, or the one already there. Tasks with the same title are matched instead of copied twice.")
        }

        switch sync.state {
        case .off:
            EmptyView()
        case .denied:
            VStack(alignment: .leading, spacing: 6) {
                Text("Visor can't reach Reminders. Allow it in System Settings › Privacy & Security › Reminders.")
                    .foregroundStyle(.red)
                Button("Open Reminders Settings") {
                    if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Reminders") {
                        NSWorkspace.shared.open(url)
                    }
                }
            }
        case .syncing:
            HStack(spacing: 6) {
                ProgressView().controlSize(.small)
                Text("Syncing…").foregroundStyle(.secondary)
            }
        case let .synced(date):
            HStack {
                TimelineView(.everyMinute) { _ in
                    Text("Last synced \(date.formatted(.relative(presentation: .named)))")
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button("Show in Reminders") { sync.showInReminders() }
            }
        case let .failed(message):
            HStack {
                Text(message).foregroundStyle(.red)
                Spacer()
                Button("Try again") { sync.retry() }
            }
        }
    }

    private func requestEnable() {
        let count = sync.unlinkedCount
        if count == 0 {
            Task { await sync.enable() }
        } else {
            confirmingCount = count
        }
    }
}

/// Sync status in the Tasks window's toolbar; a click opens the controls.
struct RemindersSyncPill: View {
    @ObservedObject private var sync = RemindersSync.shared
    @State private var showing = false

    var body: some View {
        Button { showing.toggle() } label: {
            HStack(spacing: 5) {
                if sync.state == .syncing {
                    ProgressView().controlSize(.mini)
                } else {
                    Image(systemName: symbol)
                }
                // Off, a word in the toolbar reads as a nag; the icon and its tooltip are enough.
                if sync.state != .off { Text(label) }
            }
            .foregroundStyle(color)
        }
        .help(help)
        .popover(isPresented: $showing, arrowEdge: .bottom) {
            Form { RemindersSyncControls() }
                .formStyle(.grouped)
                .frame(width: 340)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var symbol: String {
        switch sync.state {
        case .off, .syncing: "arrow.triangle.2.circlepath"
        case .denied: "exclamationmark.triangle"
        case .synced: "checkmark.icloud"
        case .failed: "xmark.icloud"
        }
    }

    private var label: LocalizedStringKey {
        switch sync.state {
        case .off: "Sync off"
        case .denied: "Needs access"
        case .syncing: "Syncing"
        case .synced: "Synced"
        case .failed: "Sync failed"
        }
    }

    private var color: Color {
        switch sync.state {
        case .off, .syncing, .synced: .secondary
        case .denied: .orange
        case .failed: .red
        }
    }

    private var help: String {
        switch sync.state {
        case .off: String(localized: "Sync tasks with Apple Reminders")
        case .denied: String(localized: "Visor needs access to Reminders")
        case .syncing: String(localized: "Syncing with Reminders")
        case let .synced(date): String(localized: "Last synced \(date.formatted(.relative(presentation: .named)))")
        case let .failed(message): message
        }
    }
}
