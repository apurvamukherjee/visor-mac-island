import Defaults
import SwiftUI

struct LockScreenSettings: View {
    @Default(.lockScreenLook) private var look
    @Default(.lockScreenBackdrop) private var backdrop
    @Default(.lockScreenLyricStyle) private var style

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

            Section {
                Picker("Style", selection: $style) {
                    ForEach(LyricStyle.allCases) { Text($0.rawValue).tag($0) }
                }
                Defaults.Toggle(key: .lockScreenLyricsAlbumColor) {
                    Text("Color the words from the album cover")
                }
                Defaults.Toggle(key: .lockScreenKeepAwake) {
                    Text("Keep the screen awake while lyrics play")
                }
            } header: {
                Text("Lyrics")
            } footer: {
                Text(
                    "Lyrics come from LRCLIB. The song's title and artist are sent to look them up, "
                        + "and only while the lyrics are showing."
                )
                .font(.caption)
                .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Lock Screen")
    }
}
