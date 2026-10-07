import CoreAudio
import Foundation

struct AudioOutputDevice: Identifiable, Equatable {
    let id: AudioObjectID
    let name: String
    let symbol: String
}

/// The Mac's audio outputs and which one is in use. Read fresh each time the
/// picker opens rather than watched: devices come and go (AirPods, a display
/// waking), and a list kept from launch would be stale.
enum AudioOutputs {
    static func currentID() -> AudioObjectID {
        read(AudioObjectID(kAudioObjectSystemObject), kAudioHardwarePropertyDefaultOutputDevice, default: kAudioObjectUnknown)
    }

    static func select(_ device: AudioOutputDevice) {
        var address = propertyAddress(kAudioHardwarePropertyDefaultOutputDevice)
        var id = device.id
        let status = AudioObjectSetPropertyData(
            AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, UInt32(MemoryLayout<AudioObjectID>.size), &id
        )
        if status != noErr { print("❌ Switching audio output to \(device.name) failed: \(status)") }
    }

    /// Outputs the system would let you pick in Sound settings: they have
    /// output streams, can be the default and aren't hidden.
    static func list() -> [AudioOutputDevice] {
        var address = propertyAddress(kAudioHardwarePropertyDevices)
        let system = AudioObjectID(kAudioObjectSystemObject)
        var size: UInt32 = 0
        guard AudioObjectGetPropertyDataSize(system, &address, 0, nil, &size) == noErr else { return [] }
        var ids = [AudioObjectID](repeating: 0, count: Int(size) / MemoryLayout<AudioObjectID>.size)
        guard AudioObjectGetPropertyData(system, &address, 0, nil, &size, &ids) == noErr else { return [] }

        return ids.compactMap { id in
            var streams = propertyAddress(kAudioDevicePropertyStreams, scope: kAudioDevicePropertyScopeOutput)
            var streamSize: UInt32 = 0
            guard AudioObjectGetPropertyDataSize(id, &streams, 0, nil, &streamSize) == noErr, streamSize > 0,
                  read(id, kAudioDevicePropertyDeviceCanBeDefaultDevice, scope: kAudioDevicePropertyScopeOutput, default: 0) != 0,
                  read(id, kAudioDevicePropertyIsHidden, default: 0) == 0,
                  let name = name(of: id)
            else { return nil }
            return AudioOutputDevice(id: id, name: name, symbol: symbol(for: id, name: name))
        }
    }

    private static func symbol(for id: AudioObjectID, name: String) -> String {
        let lowered = name.lowercased()
        if lowered.contains("airpods max") { return "airpodsmax" }
        if lowered.contains("airpods pro") { return "airpodspro" }
        if lowered.contains("airpods") { return "airpods" }
        switch read(id, kAudioDevicePropertyTransportType, default: 0) {
        case kAudioDeviceTransportTypeBluetooth, kAudioDeviceTransportTypeBluetoothLE: return "headphones"
        case kAudioDeviceTransportTypeBuiltIn: return "laptopcomputer"
        case kAudioDeviceTransportTypeHDMI, kAudioDeviceTransportTypeDisplayPort: return "tv"
        case kAudioDeviceTransportTypeAirPlay: return "airplayaudio"
        case kAudioDeviceTransportTypeUSB: return "hifispeaker"
        default: return "speaker.wave.2"
        }
    }

    private static func name(of id: AudioObjectID) -> String? {
        var address = propertyAddress(kAudioObjectPropertyName)
        var name: Unmanaged<CFString>?
        var size = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
        guard AudioObjectGetPropertyData(id, &address, 0, nil, &size, &name) == noErr,
              let value = name?.takeRetainedValue() as String?, !value.isEmpty
        else { return nil }
        return value
    }

    // Every property read here is a UInt32 (IDs, flags, transport types).
    private static func read(_ id: AudioObjectID, _ selector: AudioObjectPropertySelector,
                             scope: AudioObjectPropertyScope = kAudioObjectPropertyScopeGlobal, default value: UInt32) -> UInt32 {
        var address = propertyAddress(selector, scope: scope)
        var result = value
        var size = UInt32(MemoryLayout<UInt32>.size)
        return AudioObjectGetPropertyData(id, &address, 0, nil, &size, &result) == noErr ? result : value
    }

    private static func propertyAddress(_ selector: AudioObjectPropertySelector,
                                scope: AudioObjectPropertyScope = kAudioObjectPropertyScopeGlobal) -> AudioObjectPropertyAddress {
        AudioObjectPropertyAddress(mSelector: selector, mScope: scope, mElement: kAudioObjectPropertyElementMain)
    }
}
