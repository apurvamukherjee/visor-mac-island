import AppKit

/// The light itself: a conic gradient lit along half its sweep, turning behind
/// two masks. One mask is a thin line on the screen's edge, the other a soft
/// band inside it. The render server does the turning.
final class EdgeGlowView: NSView {
    private static let secondsPerLap = 5.0
    private static let rotationKey = "lap"

    private let cornerRadius: CGFloat
    private let rim = CALayer()
    private let halo = CALayer()
    private let rimLight = CAGradientLayer()
    private let haloLight = CAGradientLayer()
    private let rimMask = CAShapeLayer()
    private let haloMask = CALayer()
    private let haloEdges = (0 ..< 4).map { _ in CAGradientLayer() }

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
    }

    /// The sizes below were drawn for a 1470-point-wide screen.
    private var unit: CGFloat { max(bounds.width, 1) / 1470 }

    private func apply(strength: Double) {
        // Doubled: the stroke is centred on the screen's edge, so half of it is off-screen.
        rimMask.lineWidth = 2 * unit * (2.5 + 5.5 * strength)
        halo.opacity = Float(0.3 + 0.6 * strength)
    }
}
