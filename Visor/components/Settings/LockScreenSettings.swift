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

/// The edge glow's settings, shown in the Media pane: it follows the music on
/// the desktop as well as the lock screen.
struct EdgeGlowSettings: View {
    @Default(.edgeGlow) private var isOn
    @Default(.edgeGlowIntensity) private var intensity

    private static let privacyPane = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture")

    var body: some View {
        Section {
            Defaults.Toggle(key: .edgeGlow) {
                Text("Glow around the screen edge while music plays")
            }
            Defaults.Toggle(key: .edgeGlowOnLockScreen) {
                Text("Show on the lock screen")
            }
            .disabled(!isOn)
            Slider(value: $intensity, in: 0.4 ... 2) {
                Text("Strength")
            }
            .disabled(!isOn)
            if let url = Self.privacyPane {
                HStack {
                    Text("System Audio Recording permission")
                    Spacer()
                    Button("Open Privacy Settings…") { NSWorkspace.shared.open(url) }
                }
            }
        } header: {
            Text("Edge glow")
        } footer: {
            Text(
                "A line of light in the album's colors runs around the screen and thickens on the bass. "
                    + "To hear the bass, Visor asks for System Audio Recording permission the first time. "
                    + "It only measures how loud the music is and saves nothing. "
                    + "Without the permission, or before macOS 14.2, the glow breathes slowly instead."
            )
            .font(.caption)
            .foregroundStyle(.secondary)
        }
    }
}
