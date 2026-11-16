import AppKit
import SwiftUI

class AudioSpectrum: NSView {
    private var barLayers: [CALayer] = []
    private var isPlaying: Bool = true
    private(set) var style: VisualizerStyle = .bars

    private static let totalHeight: CGFloat = 14

    init(style: VisualizerStyle) {
        self.style = style
        super.init(frame: .zero)
        wantsLayer = true
        setupLayers()
    }

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        setupLayers()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        wantsLayer = true
        setupLayers()
    }

    func setStyle(_ newStyle: VisualizerStyle) {
        guard newStyle != style else { return }
        style = newStyle
        barLayers.forEach { $0.removeFromSuperlayer() }
        barLayers = []
        setupLayers()
        if isPlaying, window != nil { startAnimating() } else { stopAnimating() }
    }

    private func setupLayers() {
        switch style {
        case .bars: addBars(count: 4, width: 2, spacing: 2)
        case .wave: addBars(count: 7, width: 1.5, spacing: 1)
        case .dots: addDots()
        case .pet: addPet()
        }
    }

    private func addBars(count: Int, width: CGFloat, spacing: CGFloat) {
        frame.size = CGSize(width: CGFloat(count) * (width + spacing), height: Self.totalHeight)
        for i in 0 ..< count {
            let bar = CAShapeLayer()
            bar.frame = CGRect(x: CGFloat(i) * (width + spacing), y: 0, width: width, height: Self.totalHeight)
            bar.fillColor = NSColor.white.cgColor
            bar.backgroundColor = NSColor.white.cgColor
            bar.allowsGroupOpacity = false
            bar.masksToBounds = true
            bar.path = NSBezierPath(roundedRect: CGRect(x: 0, y: 0, width: width, height: Self.totalHeight),
                                    xRadius: width / 2, yRadius: width / 2).cgPath
            barLayers.append(bar)
            layer?.addSublayer(bar)
        }
    }

    private func addDots() {
        let size: CGFloat = 3, spacing: CGFloat = 1.5
        frame.size = CGSize(width: 4 * (size + spacing), height: Self.totalHeight)
        for i in 0 ..< 4 {
            let dot = CALayer()
            dot.frame = CGRect(x: CGFloat(i) * (size + spacing), y: (Self.totalHeight - size) / 2, width: size, height: size)
            dot.backgroundColor = NSColor.white.cgColor
            dot.cornerRadius = size / 2
            barLayers.append(dot)
            layer?.addSublayer(dot)
        }
    }

    // The sheet is six 16x12 frames: four bobbing, two asleep. Drawn at 1.5x
    // with nearest-neighbour scaling so the pixels stay sharp.
    private static let petImage: CGImage? = NSImage(named: "VisualizerPet")?
        .cgImage(forProposedRect: nil, context: nil, hints: nil)
    private static let petFrames = 6

    private func addPet() {
        let size = CGSize(width: 24, height: 18)
        frame.size = size
        let pet = CALayer()
        pet.frame = CGRect(origin: .zero, size: size)
        pet.contents = Self.petImage
        pet.magnificationFilter = .nearest
        pet.contentsRect = Self.petRect(4)
        barLayers.append(pet)
        layer?.addSublayer(pet)
    }

    private static func petRect(_ frame: Int) -> CGRect {
        CGRect(x: CGFloat(frame) / CGFloat(petFrames), y: 0, width: 1 / CGFloat(petFrames), height: 1)
    }

    // Visor: each layer gets one looping keyframe animation, so the render
    // server moves them on its own and the app never wakes for them.
    private static let stepDuration: CFTimeInterval = 0.3
    private static let stepCount = 16
    private static let animationKey = "visualizer"

    private func loop(_ keyPath: String, values: [Any], duration: CFTimeInterval, offset: CFTimeInterval = 0) -> CAKeyframeAnimation {
        let animation = CAKeyframeAnimation(keyPath: keyPath)
        animation.values = values
        animation.duration = duration
        animation.timeOffset = offset
        animation.repeatCount = .infinity
        animation.isRemovedOnCompletion = false
        animation.preferredFrameRateRange = CAFrameRateRange(minimum: 24, maximum: 24, preferred: 24)
        return animation
    }

    private func startAnimating() {
        guard barLayers.first?.animation(forKey: Self.animationKey) == nil else { return }
        switch style {
        case .bars:
            for bar in barLayers {
                var heights = (0 ..< Self.stepCount).map { _ in CGFloat.random(in: 0.35 ... 1.0) }
                heights.append(heights[0])
                bar.add(loop("transform.scale.y", values: heights, duration: Self.stepDuration * Double(Self.stepCount)),
                        forKey: Self.animationKey)
            }
        case .wave:
            let period: CFTimeInterval = 1.2
            let heights: [Double] = (0 ... 12).map { step in
                let phase = Double(step) / 12 * 2 * Double.pi
                return 0.3 + 0.35 * (1 + sin(phase))
            }
            for (i, bar) in barLayers.enumerated() {
                let animation = loop("transform.scale.y", values: heights, duration: period,
                                     offset: period * Double(i) / Double(barLayers.count))
                animation.calculationMode = .cubic
                bar.add(animation, forKey: Self.animationKey)
            }
        case .dots:
            let period: CFTimeInterval = 1.0
            for (i, dot) in barLayers.enumerated() {
                let group = CAAnimationGroup()
                group.animations = [
                    loop("transform.scale", values: [0.6, 1.25, 0.6, 0.6], duration: period),
                    loop("opacity", values: [0.4, 1.0, 0.4, 0.4], duration: period),
                ]
                group.duration = period
                group.timeOffset = period * Double(barLayers.count - i) / Double(barLayers.count)
                group.repeatCount = .infinity
                group.isRemovedOnCompletion = false
                dot.add(group, forKey: Self.animationKey)
            }
        case .pet:
            setPetLoop(frames: [0, 1, 2, 3, 0], duration: 0.6)
        }
    }

    private func setPetLoop(frames: [Int], duration: CFTimeInterval) {
        guard let pet = barLayers.first else { return }
        let animation = loop("contentsRect", values: frames.map { NSValue(rect: Self.petRect($0)) }, duration: duration)
        animation.calculationMode = .discrete
        pet.add(animation, forKey: Self.animationKey)
    }

    // Visor: stopped when the view leaves its window and restarted when it
    // returns, so a torn-down player leaves nothing animating.
    override func viewDidMoveToWindow() {
        super.viewDidMoveToWindow()
        if window == nil {
            stopAnimating()
        } else if isPlaying {
            startAnimating()
        }
    }

    private func stopAnimating() {
        for layer in barLayers {
            layer.removeAllAnimations()
            switch style {
            case .bars, .wave: layer.transform = CATransform3DMakeScale(1, 0.35, 1)
            case .dots: layer.transform = CATransform3DMakeScale(0.6, 0.6, 1); layer.opacity = 0.5
            case .pet: break
            }
        }
        // The pet naps while paused: a slow breath rather than a frozen frame.
        if style == .pet, window != nil {
            setPetLoop(frames: [4, 5, 4], duration: 2.4)
        }
    }

    func setPlaying(_ playing: Bool) {
        guard playing != isPlaying || barLayers.first?.animation(forKey: Self.animationKey) == nil else { return }
        isPlaying = playing
        stopAnimating()
        if isPlaying { startAnimating() }
    }
}

struct AudioSpectrumView: NSViewRepresentable {
    @Binding var isPlaying: Bool
    var style: VisualizerStyle = .bars

    func makeNSView(context: Context) -> AudioSpectrum {
        let spectrum = AudioSpectrum(style: style)
        spectrum.setPlaying(isPlaying)
        return spectrum
    }

    func updateNSView(_ nsView: AudioSpectrum, context: Context) {
        nsView.setStyle(style)
        nsView.setPlaying(isPlaying)
    }
}
