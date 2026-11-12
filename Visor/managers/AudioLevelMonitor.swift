import CoreAudio
import Foundation
import os

/// How hard the bass is hitting in whatever the Mac is playing, for the edge glow.
///
/// A Core Audio process tap (macOS 14.2+) hands this the system's output mix.
/// Only its loudness is measured, inside the IO callback; no sample is kept or
/// leaves it. The tap exists only between `start()` and `stop()`, so nothing is
/// listened to while the glow is off or the music is paused.
///
/// Without the System Audio Recording permission the tap delivers silence,
/// which shows here as `isLive == false`. Callers fall back to a glow that
/// does not follow the music.
final class AudioLevelMonitor {
    static let shared = AudioLevelMonitor()

    private struct Reading {
        var level: Float = 0
        var lastSound: TimeInterval = 0
    }

    /// Written on the IO queue, read from the main thread once a frame.
    private let reading = OSAllocatedUnfairLock(initialState: Reading())
    private let queue = DispatchQueue(label: "com.apurvamukherjee.visor.audio-level", qos: .userInteractive)

    private var tapID = AudioObjectID(kAudioObjectUnknown)
    private var deviceID = AudioObjectID(kAudioObjectUnknown)
    private var procID: AudioDeviceIOProcID?
    private var isRunning = false

    private lazy var outputChanged: AudioObjectPropertyListenerBlock = { [weak self] _, _ in
        // The aggregate device is clocked by the output it was built on.
        guard let self, self.isRunning else { return }
        self.stop()
        self.start()
    }

    private init() {}

    /// Bass loudness, 0...1, relative to the loudest the current music has been.
    var level: Float { reading.withLock { $0.level } }

    /// Whether the tap has heard anything in the last second and a half.
    var isLive: Bool {
        ProcessInfo.processInfo.systemUptime - reading.withLock { $0.lastSound } < 1.5
    }

    func start() {
        guard !isRunning, #available(macOS 14.2, *) else { return }
        isRunning = true
        var address = Self.address(kAudioHardwarePropertyDefaultOutputDevice)
        AudioObjectAddPropertyListenerBlock(AudioObjectID(kAudioObjectSystemObject), &address, .main, outputChanged)
        if !startTap() { tearDown() }
    }

    func stop() {
        guard isRunning else { return }
        isRunning = false
        var address = Self.address(kAudioHardwarePropertyDefaultOutputDevice)
        AudioObjectRemovePropertyListenerBlock(AudioObjectID(kAudioObjectSystemObject), &address, .main, outputChanged)
        tearDown()
    }

    @available(macOS 14.2, *)
    private func startTap() -> Bool {
        let description = CATapDescription(stereoGlobalTapButExcludeProcesses: [])
        description.name = "Visor Edge Glow"
        description.isPrivate = true
        description.muteBehavior = .unmuted
        guard AudioHardwareCreateProcessTap(description, &tapID) == noErr else { return false }

        var format = AudioStreamBasicDescription()
        var formatSize = UInt32(MemoryLayout<AudioStreamBasicDescription>.size)
        var formatAddress = Self.address(kAudioTapPropertyFormat)
        // The meter reads Float32 samples; any other format would be measured as noise.
        guard AudioObjectGetPropertyData(tapID, &formatAddress, 0, nil, &formatSize, &format) == noErr,
              format.mFormatFlags & kAudioFormatFlagIsFloat != 0, format.mBitsPerChannel == 32,
              let outputUID = Self.defaultOutputUID()
        else { return false }

        let aggregate: [String: Any] = [
            kAudioAggregateDeviceNameKey: "Visor Edge Glow",
            kAudioAggregateDeviceUIDKey: UUID().uuidString,
            kAudioAggregateDeviceMainSubDeviceKey: outputUID,
            kAudioAggregateDeviceIsPrivateKey: true,
            kAudioAggregateDeviceIsStackedKey: false,
            kAudioAggregateDeviceTapAutoStartKey: true,
            kAudioAggregateDeviceSubDeviceListKey: [[kAudioSubDeviceUIDKey: outputUID]],
            kAudioAggregateDeviceTapListKey: [[
                kAudioSubTapDriftCompensationKey: true,
                kAudioSubTapUIDKey: description.uuid.uuidString,
            ]],
        ]
        guard AudioHardwareCreateAggregateDevice(aggregate as CFDictionary, &deviceID) == noErr else { return false }

        let meter = BassMeter(sampleRate: format.mSampleRate > 0 ? format.mSampleRate : 48000)
        let reading = reading
        let status = AudioDeviceCreateIOProcIDWithBlock(&procID, deviceID, queue) { _, input, _, _, _ in
            guard let measured = meter.measure(input) else { return }
            let now = ProcessInfo.processInfo.systemUptime
            reading.withLock {
                $0.level = measured.level
                if measured.heardSound { $0.lastSound = now }
            }
        }
        return status == noErr && AudioDeviceStart(deviceID, procID) == noErr
    }

    private func tearDown() {
        if deviceID != kAudioObjectUnknown {
            if let procID {
                AudioDeviceStop(deviceID, procID)
                AudioDeviceDestroyIOProcID(deviceID, procID)
            }
            AudioHardwareDestroyAggregateDevice(deviceID)
        }
        if tapID != kAudioObjectUnknown, #available(macOS 14.2, *) {
            AudioHardwareDestroyProcessTap(tapID)
        }
        procID = nil
        deviceID = AudioObjectID(kAudioObjectUnknown)
        tapID = AudioObjectID(kAudioObjectUnknown)
        reading.withLock { $0 = Reading() }
    }

    private static func address(_ selector: AudioObjectPropertySelector) -> AudioObjectPropertyAddress {
        AudioObjectPropertyAddress(mSelector: selector, mScope: kAudioObjectPropertyScopeGlobal, mElement: kAudioObjectPropertyElementMain)
    }

    private static func defaultOutputUID() -> String? {
        var device = AudioObjectID(kAudioObjectUnknown)
        var size = UInt32(MemoryLayout<AudioObjectID>.size)
        var deviceAddress = address(kAudioHardwarePropertyDefaultOutputDevice)
        guard AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &deviceAddress, 0, nil, &size, &device) == noErr,
              device != kAudioObjectUnknown else { return nil }

        var uid: Unmanaged<CFString>?
        var uidSize = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
        var uidAddress = address(kAudioDevicePropertyDeviceUID)
        guard AudioObjectGetPropertyData(device, &uidAddress, 0, nil, &uidSize, &uid) == noErr else { return nil }
        return uid?.takeRetainedValue() as String?
    }
}

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
