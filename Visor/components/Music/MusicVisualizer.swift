
import AppKit
import SwiftUI

class AudioSpectrum: NSView {
    private var barLayers: [CAShapeLayer] = []
    private var isPlaying: Bool = true
    
    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        setupBars()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        wantsLayer = true
        setupBars()
    }

    private func setupBars() {
        let barWidth: CGFloat = 2
        let barCount = 4
        let spacing: CGFloat = barWidth
        let totalWidth = CGFloat(barCount) * (barWidth + spacing)
        let totalHeight: CGFloat = 14
        frame.size = CGSize(width: totalWidth, height: totalHeight)

        for i in 0 ..< barCount {
            let xPosition = CGFloat(i) * (barWidth + spacing)
            let barLayer = CAShapeLayer()
            barLayer.frame = CGRect(x: xPosition, y: 0, width: barWidth, height: totalHeight)
            barLayer.fillColor = NSColor.white.cgColor
            barLayer.backgroundColor = NSColor.white.cgColor
            barLayer.allowsGroupOpacity = false
            barLayer.masksToBounds = true
            let path = NSBezierPath(roundedRect: CGRect(x: 0, y: 0, width: barWidth, height: totalHeight),
                                    xRadius: barWidth / 2,
                                    yRadius: barWidth / 2)
            barLayer.path = path.cgPath
            barLayers.append(barLayer)
            layer?.addSublayer(barLayer)
        }
    }
    
    // Visor: each bar gets one looping keyframe animation, so the render
    // server moves the bars on its own and the app never wakes for them.
    // It reproduces the old timer's look: a straight move to a new random
    // height every 0.3 s. Sixteen steps make the loop too long to notice.
    private static let stepDuration: CFTimeInterval = 0.3
    private static let stepCount = 16
    private static let animationKey = "scaleY"

    private func startAnimating() {
        guard barLayers.first?.animation(forKey: Self.animationKey) == nil else { return }
        for barLayer in barLayers {
            var heights = (0..<Self.stepCount).map { _ in CGFloat.random(in: 0.35 ... 1.0) }
            heights.append(heights[0])
            let animation = CAKeyframeAnimation(keyPath: "transform.scale.y")
            animation.values = heights
            animation.duration = Self.stepDuration * Double(Self.stepCount)
            animation.repeatCount = .infinity
            animation.isRemovedOnCompletion = false
            animation.preferredFrameRateRange = CAFrameRateRange(minimum: 24, maximum: 24, preferred: 24)
            barLayer.add(animation, forKey: Self.animationKey)
        }
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
        resetBars()
    }

    private func resetBars() {
        for barLayer in barLayers {
            barLayer.removeAllAnimations()
            barLayer.transform = CATransform3DMakeScale(1, 0.35, 1)
        }
    }
    
    func setPlaying(_ playing: Bool) {
        isPlaying = playing
        if isPlaying {
            startAnimating()
        } else {
            stopAnimating()
        }
    }
}

struct AudioSpectrumView: NSViewRepresentable {
    @Binding var isPlaying: Bool
    
    func makeNSView(context: Context) -> AudioSpectrum {
        let spectrum = AudioSpectrum()
        spectrum.setPlaying(isPlaying)
        return spectrum
    }
    
    func updateNSView(_ nsView: AudioSpectrum, context: Context) {
        nsView.setPlaying(isPlaying)
    }
}
