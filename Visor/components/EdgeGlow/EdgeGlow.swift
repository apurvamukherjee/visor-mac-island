import AppKit
import Combine
import Defaults

/// A line of light that runs round the edge of every screen while music
/// plays, in the cover's colours, thickening on the bass.
///
/// The windows exist only while the glow is on and something is playing, and
/// the audio tap behind it runs for exactly as long.
@MainActor
final class EdgeGlow {
    static let shared = EdgeGlow()

    private static let fadeDuration = 0.6

    private var windows: [SkyLightWindow] = []
    private var cancellables: Set<AnyCancellable> = []
    private var isLocked = false

    private init() {}

    func start() {
        let music = MusicManager.shared
        Publishers.MergeMany(
            music.$isPlaying.removeDuplicates().map { _ in () }.eraseToAnyPublisher(),
            Defaults.publisher(.edgeGlow).map { _ in () }.eraseToAnyPublisher(),
            Defaults.publisher(.edgeGlowPlacement).map { _ in () }.eraseToAnyPublisher(),
            NotificationCenter.default.publisher(for: NSApplication.didChangeScreenParametersNotification)
                .map { _ in () }.eraseToAnyPublisher()
        )
        // @Published fires before the value is stored; a hop reads the new one.
        .receive(on: DispatchQueue.main)
        .sink { MainActor.assumeIsolated { EdgeGlow.shared.refresh() } }
        .store(in: &cancellables)

        music.$palette
            .receive(on: DispatchQueue.main)
            .sink { palette in MainActor.assumeIsolated { EdgeGlow.shared.views.forEach { $0.setColors(palette) } } }
            .store(in: &cancellables)
    }

    func setLocked(_ locked: Bool) {
        isLocked = locked
        refresh()
        if locked {
            windows.forEach { $0.enableSkyLight() }
        } else {
            // The same beat the notch waits, so the glow does not blink as the lock shield lifts.
            Task {
                try? await Task.sleep(for: .milliseconds(150))
                if !isLocked { windows.forEach { $0.disableSkyLight() } }
            }
        }
    }

    private var views: [EdgeGlowView] { windows.compactMap { $0.contentView as? EdgeGlowView } }

    private var isWanted: Bool {
        Defaults[.edgeGlow] && MusicManager.shared.isPlaying && Defaults[.edgeGlowPlacement].shows(locked: isLocked)
    }

    private func refresh() {
        guard isWanted else {
            hide()
            return
        }
        AudioLevelMonitor.shared.start()
        let screens = NSScreen.screens
        if windows.map(\.frame) != screens.map(\.frame) {
            closeWindows()
            windows = screens.map(makeWindow)
        }
        windows.forEach { $0.animator().alphaValue = 1 }
    }

    private func hide() {
        guard !windows.isEmpty else { return }
        NSAnimationContext.runAnimationGroup { context in
            context.duration = Self.fadeDuration
            windows.forEach { $0.animator().alphaValue = 0 }
        } completionHandler: {
            MainActor.assumeIsolated {
                // Playback may have resumed during the fade.
                guard !self.isWanted else { return }
                self.closeWindows()
                AudioLevelMonitor.shared.stop()
            }
        }
    }

    private func closeWindows() {
        for window in windows {
            // Taking the view out is what stops its display link, which
            // otherwise holds the view for good.
            window.contentView = nil
            window.close()
        }
        windows = []
    }

    private func makeWindow(for screen: NSScreen) -> SkyLightWindow {
        let window = SkyLightWindow(
            contentRect: screen.frame, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false
        )
        window.ignoresMouseEvents = true
        // One below the notch's level so the notch draws over the line.
        window.level = .mainMenu + 2
        // A notched display is rounded at its corners; the line follows them.
        let view = EdgeGlowView(cornerRadius: screen.safeAreaInsets.top > 0 ? 10 : 0)
        view.setColors(MusicManager.shared.palette)
        window.contentView = view
        window.setFrame(screen.frame, display: false)
        window.alphaValue = 0
        if isLocked { window.enableSkyLight() }
        window.orderFrontRegardless()
        NSAnimationContext.runAnimationGroup { context in
            context.duration = Self.fadeDuration
            window.animator().alphaValue = 1
        }
        return window
    }
}

/// The light itself: a conic gradient lit along half its sweep, turning behind
/// two masks. One mask is a thin line on the screen's edge, the other a soft
/// band inside it. The render server does the turning; the app only sets the
/// line's width and the band's strength once a frame, from the music.
final class EdgeGlowView: NSView {
    private static let secondsPerLap = 5.0
    private static let rotationKey = "lap"
    /// Rises fast enough to land on a kick, falls slowly enough not to flicker.
    private static let attack = 18.0
    private static let release = 6.0

    private let cornerRadius: CGFloat
    private let rim = CALayer()
    private let halo = CALayer()
    private let rimLight = CAGradientLayer()
    private let haloLight = CAGradientLayer()
    private let rimMask = CAShapeLayer()
    private let haloMask = CALayer()
    private let haloEdges = (0 ..< 4).map { _ in CAGradientLayer() }

    private var link: CADisplayLink?
    private var lastTick: CFTimeInterval = 0
    private var glow = 0.0

    private var reduceMotion: Bool { NSWorkspace.shared.accessibilityDisplayShouldReduceMotion }

    init(cornerRadius: CGFloat) {
        self.cornerRadius = cornerRadius
        super.init(frame: .zero)
        wantsLayer = true
        for (container, light, mask) in [(rim, rimLight, rimMask as CALayer), (halo, haloLight, haloMask)] {
            light.type = .conic
            light.startPoint = CGPoint(x: 0.5, y: 0.5)
            light.endPoint = CGPoint(x: 0.5, y: 1)
            container.addSublayer(light)
            // On the container, not the light: a mask turns with its layer.
            container.mask = mask
            layer?.addSublayer(container)
        }
        rimMask.fillColor = nil
        rimMask.strokeColor = NSColor.black.cgColor
        for edge in haloEdges {
            // Eased, so the band dies away instead of ending at a line.
            edge.colors = [1, 0.42, 0.12, 0].map { NSColor(white: 0, alpha: $0).cgColor }
            edge.locations = [0, 0.3, 0.65, 1]
            haloMask.addSublayer(edge)
        }
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
        nil
    }

    func setColors(_ palette: [NSColor]) {
        guard let first = palette.first, let last = palette.last else { return }
        let colors: [NSColor]
        let locations: [NSNumber]
        if reduceMotion {
            // Nothing turns, so the whole edge is lit rather than a stalled half.
            colors = [first, last, first]
            locations = [0, 0.5, 1]
        } else {
            colors = [first.withAlphaComponent(0), first, last, last.withAlphaComponent(0), last.withAlphaComponent(0)]
            locations = [0.02, 0.09, 0.42, 0.5, 1]
        }
        for light in [rimLight, haloLight] {
            light.colors = colors.map(\.cgColor)
            light.locations = locations
        }
    }

    override func layout() {
        super.layout()
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        let size = bounds.size
        // Square and as wide as the diagonal, so no corner is uncovered at any angle.
        let diagonal = hypot(size.width, size.height)
        for (container, light) in [(rim, rimLight), (halo, haloLight)] {
            container.frame = bounds
            light.bounds = CGRect(x: 0, y: 0, width: diagonal, height: diagonal)
            light.position = CGPoint(x: bounds.midX, y: bounds.midY)
        }
        rimMask.frame = bounds
        rimMask.path = CGPath(roundedRect: bounds, cornerWidth: cornerRadius, cornerHeight: cornerRadius, transform: nil)
        haloMask.frame = bounds

        let depth = unit * 46
        // Each band with the side of it that touches the screen's edge, where it is strongest.
        let edges: [(CGRect, CGPoint)] = [
            (CGRect(x: 0, y: size.height - depth, width: size.width, height: depth), CGPoint(x: 0.5, y: 1)),
            (CGRect(x: 0, y: 0, width: size.width, height: depth), CGPoint(x: 0.5, y: 0)),
            (CGRect(x: 0, y: 0, width: depth, height: size.height), CGPoint(x: 0, y: 0.5)),
            (CGRect(x: size.width - depth, y: 0, width: depth, height: size.height), CGPoint(x: 1, y: 0.5)),
        ]
        for (edge, (frame, outer)) in zip(haloEdges, edges) {
            edge.frame = frame
            edge.startPoint = outer
            edge.endPoint = CGPoint(x: 1 - outer.x, y: 1 - outer.y)
        }
        apply(strength: glow)
        CATransaction.commit()
    }

    override func viewDidMoveToWindow() {
        super.viewDidMoveToWindow()
        link?.invalidate()
        link = nil
        for light in [rimLight, haloLight] { light.removeAnimation(forKey: Self.rotationKey) }
        guard window != nil else { return }

        if !reduceMotion {
            let lap = CABasicAnimation(keyPath: "transform.rotation.z")
            lap.fromValue = 0
            lap.toValue = -2 * Double.pi
            lap.duration = Self.secondsPerLap
            lap.repeatCount = .infinity
            lap.isRemovedOnCompletion = false
            // One object on both, so the line and its band stay in step.
            for light in [rimLight, haloLight] { light.add(lap, forKey: Self.rotationKey) }
        }
        let link = displayLink(target: self, selector: #selector(tick))
        link.preferredFrameRateRange = CAFrameRateRange(minimum: 30, maximum: 60, preferred: 60)
        link.add(to: .main, forMode: .common)
        self.link = link
    }

    /// The sizes below were drawn for a 1470-point-wide screen.
    private var unit: CGFloat { max(bounds.width, 1) / 1470 }

    @objc private func tick(_ link: CADisplayLink) {
        let elapsed = min(0.05, link.targetTimestamp - lastTick)
        lastTick = link.targetTimestamp

        let monitor = AudioLevelMonitor.shared
        // With no audio to follow (no permission, or macOS before 14.2) the
        // glow breathes slowly instead of sitting still.
        let target = monitor.isLive
            ? pow(Double(monitor.level), 1.5)
            : 0.3 + 0.15 * sin(link.targetTimestamp * 2 * Double.pi / 3.2)
        glow += (target - glow) * (1 - exp(-elapsed * (target > glow ? Self.attack : Self.release)))

        CATransaction.begin()
        CATransaction.setDisableActions(true)
        apply(strength: min(1, glow * Defaults[.edgeGlowIntensity]))
        CATransaction.commit()
    }

    private func apply(strength: Double) {
        // Doubled: the stroke is centred on the screen's edge, so half of it is off-screen.
        rimMask.lineWidth = 2 * unit * (2.5 + 5.5 * strength)
        halo.opacity = Float(0.3 + 0.6 * strength)
    }
}
