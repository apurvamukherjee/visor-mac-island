import Defaults
import SwiftUI

struct LockScreenSettings: View {
    @Default(.lockScreenLook) private var look
    @Default(.lockScreenBackdrop) private var backdrop

    var body: some View {
        Form {
            Section {
                Defaults.Toggle(key: .lockScreenWidgets) {
                    Text("Now Playing and timer on the lock screen")
                }
                Picker("Look", selection: $look) {
                    ForEach(LockScreenLook.allCases) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)
                Picker("Background", selection: $backdrop) {
                    ForEach(LockScreenBackdrop.allCases) { Text($0.rawValue).tag($0) }
                }
                HStack {
                    Text("See it without locking your Mac")
                    Spacer()
                    Button("Preview") { LockScreenPlayer.shared.preview() }
                }
            } header: {
                Text("Now Playing")
            } footer: {
                Text(
                    "On the lock screen, click the record or the cover to step through Record, Cover and Lyrics. "
                        + "The background shows behind the cover and the lyrics."
                )
                .font(.caption)
                .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Lock Screen")
    }
}
