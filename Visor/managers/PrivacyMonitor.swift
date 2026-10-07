import Combine
import CoreAudio
import CoreMediaIO
import Defaults
import Foundation

/// Whether any app is using the microphone or a camera, for the dots in the
/// closed notch. Everything here is a Core Audio or CoreMediaIO property
/// listener, so it does nothing until something changes.
///
/// The microphone is judged per process (macOS 14.2+): a Bluetooth headset
/// that is only playing music still reports its device as running, which
/// would light the dot for every song. Older systems fall back to that
/// device-wide flag on the default input.
@MainActor
final class PrivacyMonitor: ObservableObject {
    static let shared = PrivacyMonitor()

    @Published private(set) var micInUse = false
    @Published private(set) var cameraInUse = false

    private var isRunning = false
    private var audioObjects: [AudioObjectID] = []
    private var cameraObjects: [CMIOObjectID] = []
    private var cancellables: Set<AnyCancellable> = []

    private let system = AudioObjectID(kAudioObjectSystemObject)
    private let cameraSystem = CMIOObjectID(kCMIOObjectSystemObject)

    private lazy var audioListChanged: AudioObjectPropertyListenerBlock = { _, _ in
        MainActor.assumeIsolated { PrivacyMonitor.shared.rewireAudio() }
    }
    private lazy var audioFlagChanged: AudioObjectPropertyListenerBlock = { _, _ in
        MainActor.assumeIsolated { PrivacyMonitor.shared.refreshMic() }
    }
    private lazy var cameraListChanged: CMIOObjectPropertyListenerBlock = { _, _ in
        MainActor.assumeIsolated { PrivacyMonitor.shared.rewireCameras() }
    }
    private lazy var cameraFlagChanged: CMIOObjectPropertyListenerBlock = { _, _ in
        MainActor.assumeIsolated { PrivacyMonitor.shared.refreshCamera() }
    }

    private init() {
        Defaults.publisher(.showPrivacyIndicators)
            .sink { change in
                Task { @MainActor in
                    change.newValue ? PrivacyMonitor.shared.start() : PrivacyMonitor.shared.stop()
                }
            }
            .store(in: &cancellables)
    }

    private var audioListSelector: AudioObjectPropertySelector {
        if #available(macOS 14.2, *) { return kAudioHardwarePropertyProcessObjectList }
        return kAudioHardwarePropertyDefaultInputDevice
    }

    private var audioFlagSelector: AudioObjectPropertySelector {
        if #available(macOS 14.2, *) { return kAudioProcessPropertyIsRunningInput }
        return kAudioDevicePropertyDeviceIsRunningSomewhere
    }

    private func start() {
        guard !isRunning else { return }
        isRunning = true
        var audioList = Self.audioAddress(audioListSelector)
        AudioObjectAddPropertyListenerBlock(system, &audioList, .main, audioListChanged)
        var cameraList = Self.cameraAddress(CMIOObjectPropertySelector(kCMIOHardwarePropertyDevices))
        CMIOObjectAddPropertyListenerBlock(cameraSystem, &cameraList, .main, cameraListChanged)
        rewireAudio()
        rewireCameras()
    }

    private func stop() {
        guard isRunning else { return }
        isRunning = false
        var audioList = Self.audioAddress(audioListSelector)
        AudioObjectRemovePropertyListenerBlock(system, &audioList, .main, audioListChanged)
        var cameraList = Self.cameraAddress(CMIOObjectPropertySelector(kCMIOHardwarePropertyDevices))
        CMIOObjectRemovePropertyListenerBlock(cameraSystem, &cameraList, .main, cameraListChanged)
        unwireAudio()
        unwireCameras()
        micInUse = false
        cameraInUse = false
    }

    // MARK: Microphone

    private func rewireAudio() {
        unwireAudio()
        if #available(macOS 14.2, *) {
            audioObjects = Self.audioIDs(system, kAudioHardwarePropertyProcessObjectList)
        } else {
            let input: AudioObjectID = Self.audioValue(system, kAudioHardwarePropertyDefaultInputDevice)
            audioObjects = input == kAudioObjectUnknown ? [] : [input]
        }
        var flag = Self.audioAddress(audioFlagSelector)
        for id in audioObjects {
            AudioObjectAddPropertyListenerBlock(id, &flag, .main, audioFlagChanged)
        }
        refreshMic()
    }

    private func unwireAudio() {
        var flag = Self.audioAddress(audioFlagSelector)
        for id in audioObjects {
            AudioObjectRemovePropertyListenerBlock(id, &flag, .main, audioFlagChanged)
        }
        audioObjects = []
    }

    private func refreshMic() {
        let selector = audioFlagSelector
        let inUse = audioObjects.contains { Self.audioValue($0, selector) != 0 }
        if inUse != micInUse { micInUse = inUse }
    }

    // MARK: Camera

    private func rewireCameras() {
        unwireCameras()
        cameraObjects = Self.cameraIDs()
        var flag = Self.cameraAddress(CMIOObjectPropertySelector(kCMIODevicePropertyDeviceIsRunningSomewhere))
        for id in cameraObjects {
            CMIOObjectAddPropertyListenerBlock(id, &flag, .main, cameraFlagChanged)
        }
        refreshCamera()
    }

    private func unwireCameras() {
        var flag = Self.cameraAddress(CMIOObjectPropertySelector(kCMIODevicePropertyDeviceIsRunningSomewhere))
        for id in cameraObjects {
            CMIOObjectRemovePropertyListenerBlock(id, &flag, .main, cameraFlagChanged)
        }
        cameraObjects = []
    }

    private func refreshCamera() {
        let inUse = cameraObjects.contains { id in
            var flag = Self.cameraAddress(CMIOObjectPropertySelector(kCMIODevicePropertyDeviceIsRunningSomewhere))
            var running: UInt32 = 0
            var used: UInt32 = 0
            return CMIOObjectGetPropertyData(id, &flag, 0, nil, UInt32(MemoryLayout<UInt32>.size), &used, &running) == noErr
                && running != 0
        }
        if inUse != cameraInUse { cameraInUse = inUse }
    }

    // MARK: Property plumbing

    private static func audioAddress(_ selector: AudioObjectPropertySelector) -> AudioObjectPropertyAddress {
        AudioObjectPropertyAddress(mSelector: selector, mScope: kAudioObjectPropertyScopeGlobal, mElement: kAudioObjectPropertyElementMain)
    }

    private static func audioValue(_ id: AudioObjectID, _ selector: AudioObjectPropertySelector) -> UInt32 {
        var address = audioAddress(selector)
        var value: UInt32 = 0
        var size = UInt32(MemoryLayout<UInt32>.size)
        return AudioObjectGetPropertyData(id, &address, 0, nil, &size, &value) == noErr ? value : 0
    }

    private static func audioIDs(_ id: AudioObjectID, _ selector: AudioObjectPropertySelector) -> [AudioObjectID] {
        var address = audioAddress(selector)
        var size: UInt32 = 0
        guard AudioObjectGetPropertyDataSize(id, &address, 0, nil, &size) == noErr else { return [] }
        var ids = [AudioObjectID](repeating: 0, count: Int(size) / MemoryLayout<AudioObjectID>.size)
        guard AudioObjectGetPropertyData(id, &address, 0, nil, &size, &ids) == noErr else { return [] }
        return ids
    }

    private static func cameraAddress(_ selector: CMIOObjectPropertySelector) -> CMIOObjectPropertyAddress {
        CMIOObjectPropertyAddress(
            mSelector: selector,
            mScope: CMIOObjectPropertyScope(kCMIOObjectPropertyScopeGlobal),
            mElement: CMIOObjectPropertyElement(kCMIOObjectPropertyElementMain)
        )
    }

    private static func cameraIDs() -> [CMIOObjectID] {
        var address = cameraAddress(CMIOObjectPropertySelector(kCMIOHardwarePropertyDevices))
        let system = CMIOObjectID(kCMIOObjectSystemObject)
        var size: UInt32 = 0
        guard CMIOObjectGetPropertyDataSize(system, &address, 0, nil, &size) == noErr else { return [] }
        var ids = [CMIOObjectID](repeating: 0, count: Int(size) / MemoryLayout<CMIOObjectID>.size)
        var used: UInt32 = 0
        guard CMIOObjectGetPropertyData(system, &address, 0, nil, size, &used, &ids) == noErr else { return [] }
        return ids
    }
}
