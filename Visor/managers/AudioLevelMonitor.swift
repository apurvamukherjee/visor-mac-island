import CoreAudio
import Foundation

/// Turns each buffer of samples into one bass level. Lives on the IO queue.
private final class BassMeter {
    /// Kick drums and bass sit below this; above it the glow would follow hi-hats.
    private static let cutoff = 150.0
    /// Quietest reference the level is measured against, so silence between
    /// tracks is not amplified into a glow.
    private static let floor: Float = 0.02
    /// Per buffer. At about 94 buffers a second the reference halves in 15 s,
    /// so a quiet track after a loud one finds its own range again.
    private static let peakDecay: Float = 0.9995
    private static let audible: Float = 1e-5

    private let coefficient: Float
    private var lowpass: Float = 0
    private var peak = BassMeter.floor

    init(sampleRate: Double) {
        coefficient = Float(1 - exp(-2 * Double.pi * Self.cutoff / sampleRate))
    }

    func measure(_ input: UnsafePointer<AudioBufferList>) -> (level: Float, heardSound: Bool)? {
        var sum: Float = 0
        var loudest: Float = 0
        var frames = 0
        for buffer in UnsafeMutableAudioBufferListPointer(UnsafeMutablePointer(mutating: input)) {
            guard let data = buffer.mData else { continue }
            let channels = max(1, Int(buffer.mNumberChannels))
            let samples = UnsafeBufferPointer(
                start: data.assumingMemoryBound(to: Float32.self),
                count: Int(buffer.mDataByteSize) / MemoryLayout<Float32>.size
            )
            var index = 0
            while index + channels <= samples.count {
                var mono: Float = 0
                for channel in 0 ..< channels { mono += samples[index + channel] }
                mono /= Float(channels)
                loudest = max(loudest, abs(mono))
                lowpass += coefficient * (mono - lowpass)
                sum += lowpass * lowpass
                frames += 1
                index += channels
            }
        }
        guard frames > 0 else { return nil }
        let rms = (sum / Float(frames)).squareRoot()
        peak = max(rms, peak * Self.peakDecay, Self.floor)
        return (min(1, rms / peak), loudest > Self.audible)
    }
}
