import AppKit
import Combine
import Defaults
import SwiftUI

/// Now Playing on the lock screen: the cover over its controls, alone or
/// beside the song's lyrics, with the running timer below.
///
/// Two windows share the screen, both in the above-the-shield SkyLight space
/// the notch uses while locked. The stage is the full screen and never takes a
/// click: the backdrop and the lyrics. The player, with the cover and the
/// buttons, stops short of the bottom of the screen, so no part of it
/// can ever sit over the password field.
///
/// Both are created on lock and their SwiftUI trees dropped on unlock, so
/// nothing renders for them the rest of the time.
@MainActor
final class LockScreenPlayer: ObservableObject {
    static let shared = LockScreenPlayer()

    /// The share of the screen's height, from the top, the player window covers.
    static let playerHeightShare: CGFloat = 0.86

    /// Words for the settings preview when the song playing has none, or
    /// nothing is playing. `previewLoop` seconds long.
    static let sampleLines: [(time: Double, text: String)] = [
        (0.4, "Lock the screen and let it play"),
        (3.4, "The cover glows, the record turns"),
        (6.4, "Words fall in time with every beat"),
        (9.4, "Light runs round the edge of night"),
        (12.4, "Stay a while, the song's not done"),
    ]
    static let previewLoop = 15.5

    /// True while the windows are up over the desktop from Settings, not on a locked screen.
    @Published private(set) var isPreview = false
    private(set) var previewStart = Date()

    private var stage: SkyLightWindow?
    private var player: SkyLightWindow?
    private var isLocked = false
    private var awake: NSObjectProtocol?
    private var cancellables: Set<AnyCancellable> = []

    private init() {
        Publishers.MergeMany(
            MusicManager.shared.$isPlaying.removeDuplicates().map { _ in () }.eraseToAnyPublisher(),
            Defaults.publisher(.lockScreenLook).map { _ in () }.eraseToAnyPublisher(),
            Defaults.publisher(.lockScreenKeepAwake).map { _ in () }.eraseToAnyPublisher()
        )
        // @Published fires before the value is stored; a hop reads the new one.
        .receive(on: DispatchQueue.main)
        .sink { MainActor.assumeIsolated { LockScreenPlayer.shared.sync() } }
        .store(in: &cancellables)
    }

    func show() {
        endPreview()
        guard Defaults[.lockScreenWidgets] else { return }
        isLocked = true
        present()
        [stage, player].forEach { $0?.enableSkyLight() }
        sync()
    }

    func hide() {
        isLocked = false
        dismiss()
    }

    /// Shows the lock screen player over the desktop until it is clicked.
    func preview() {
        guard !isLocked, !isPreview else { return }
        previewStart = Date()
        isPreview = true
        present()
        // Unlike on the lock screen, the stage takes the click that closes it.
        stage?.ignoresMouseEvents = false
        sync()
    }

    func endPreview() {
        guard isPreview else { return }
        isPreview = false
        dismiss()
    }

    private func present() {
        guard let screen = NSScreen.screens.first else { return }
        let frame = screen.frame
        let playerHeight = frame.height * Self.playerHeightShare
        let playerFrame = NSRect(x: frame.minX, y: frame.maxY - playerHeight, width: frame.width, height: playerHeight)

        let stage = stage ?? makeWindow(frame)
        let player = player ?? makeWindow(playerFrame)
        self.stage = stage
        self.player = player
        stage.ignoresMouseEvents = true
        stage.setFrame(frame, display: false)
        player.setFrame(playerFrame, display: false)
        stage.contentView = NSHostingView(rootView: LockScreenStageView(screenSize: frame.size).environmentObject(self))
        player.contentView = NSHostingView(rootView: LockScreenPlayerView(screenSize: frame.size).environmentObject(self))
        stage.orderFrontRegardless()
        player.orderFrontRegardless()
    }

    private func dismiss() {
        for window in [stage, player] {
            guard let window else { continue }
            window.orderOut(nil)
            window.disableSkyLight()
            window.contentView = nil
        }
        sync()
    }

    private func makeWindow(_ frame: NSRect) -> SkyLightWindow {
        SkyLightWindow(contentRect: frame, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
    }

    /// Lyrics are looked up, and the display kept awake, only while the lyrics
    /// are actually on screen.
    private func sync() {
        let showingLyrics = (isLocked || isPreview) && Defaults[.lockScreenLook] == .lyrics
        MusicManager.shared.lyricsWanted = showingLyrics

        let keepAwake = isLocked && showingLyrics && MusicManager.shared.isPlaying && Defaults[.lockScreenKeepAwake]
        if keepAwake, awake == nil {
            awake = ProcessInfo.processInfo.beginActivity(
                options: .idleDisplaySleepDisabled, reason: "Lyrics are playing on the lock screen"
            )
        } else if !keepAwake, let token = awake {
            ProcessInfo.processInfo.endActivity(token)
            awake = nil
        }
    }
}

/// Where everything on the lock screen sits, shared by both windows so the
/// cover in one lines up with the lyrics in the other.
///
/// Sizes were drawn for a 956-point-tall screen and scale with the height.
/// The clock above and the password field below are macOS's own; everything
/// here stays between them.
struct LockScreenLayout {
    let size: CGSize
    let look: LockScreenLook

    static let coverSide: CGFloat = 310
    static let cardHeight: CGFloat = 122

    var unit: CGFloat { size.height / 956 }
    func scaled(_ value: CGFloat) -> CGFloat { value * unit }

    /// The cover and the card are one column: centred on its own, moved left
    /// to make room for the lyrics.
    private var columnX: CGFloat { size.width / 2 - (look == .lyrics ? scaled(300) : 0) }

    var coverCenter: CGPoint { CGPoint(x: columnX, y: scaled(446)) }
    var cardCenter: CGPoint { CGPoint(x: columnX, y: scaled(620 + Self.cardHeight / 2)) }

    /// Where the lyrics are drawn.
    var lyrics: CGRect {
        CGRect(x: size.width / 2 - scaled(90), y: scaled(262), width: scaled(560), height: scaled(490))
    }
}
