import AppKit
import Combine
import Defaults
import SwiftUI

/// Now Playing on the lock screen: a record under the clock, the cover, or the
/// song's lyrics, with the running timer below.
///
/// Two windows share the screen, both in the above-the-shield SkyLight space
/// the notch uses while locked. The stage is the full screen and never takes a
/// click: the backdrop and the lyrics. The player, with the record, the cover
/// and the buttons, stops short of the bottom of the screen, so no part of it
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
    let style: LyricStyle

    var unit: CGFloat { size.height / 956 }
    func scaled(_ value: CGFloat) -> CGFloat { value * unit }

    /// The lyrics look with a full-width style: the words take the middle of
    /// the screen and the cover moves into the card.
    var wordsTakeTheStage: Bool { look == .lyrics && style != .lines }
    private var splitsTheScreen: Bool { look == .lyrics && style == .lines }

    static let vinylBase: CGFloat = 150
    static let coverBase: CGFloat = 330
    static let slotSide: CGFloat = 44
    static let cardSize = CGSize(width: 304, height: 118)
    private static let cardPadding: CGFloat = 12

    private var columnX: CGFloat { splitsTheScreen ? size.width / 2 - scaled(320) : size.width / 2 }

    var cardCenter: CGPoint {
        let top: CGFloat = switch look {
        case .record: 620
        case .cover: 632
        case .lyrics: style == .lines ? 630 : 626
        }
        return CGPoint(x: columnX, y: scaled(top + Self.cardSize.height / 2))
    }

    /// The small square at the card's top left, where whichever of the record
    /// and the cover is not the main picture waits.
    var slotCenter: CGPoint {
        let inset = Self.cardPadding + Self.slotSide / 2
        return CGPoint(
            x: cardCenter.x - scaled(Self.cardSize.width / 2 - inset),
            y: cardCenter.y - scaled(Self.cardSize.height / 2 - inset)
        )
    }

    var vinyl: (center: CGPoint, side: CGFloat) {
        let (center, side) = look == .record
            ? (CGPoint(x: columnX, y: scaled(515)), scaled(Self.vinylBase))
            : (slotCenter, scaled(Self.slotSide))
        // VinylDisc keeps its right edge for the tonearm, so the record sits
        // left of its box's middle. The nudge puts the record itself on centre.
        return (CGPoint(x: center.x + side * 0.06, y: center.y), side)
    }

    var cover: (center: CGPoint, side: CGFloat) {
        switch look {
        case .record: (slotCenter, scaled(Self.slotSide))
        case .cover: (CGPoint(x: columnX, y: scaled(468)), scaled(274))
        case .lyrics: wordsTakeTheStage ? (slotCenter, scaled(Self.slotSide)) : (CGPoint(x: columnX, y: scaled(443)), scaled(Self.coverBase))
        }
    }

    /// Only one of the two can wait in the card's slot.
    var showsVinyl: Bool { !wordsTakeTheStage }

    /// Where the lyrics are drawn.
    var lyrics: CGRect {
        style == .lines
            ? CGRect(x: size.width / 2 + scaled(20), y: scaled(243), width: scaled(420), height: scaled(400))
            : CGRect(x: size.width / 2 - scaled(560), y: scaled(262), width: scaled(1120), height: scaled(350))
    }
}
