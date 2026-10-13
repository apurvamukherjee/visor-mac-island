import Combine
import CoreAudio
import Defaults
import Foundation

/// Notices a known audio device (AirPods, OnePlus Buds, a JBL soundbar)
/// connecting and asks the notch to show its model.
///
/// It watches CoreAudio's device list rather than Bluetooth, so it needs no
/// Bluetooth permission: a device "connects" when it becomes an output.
@MainActor
final class DeviceMonitor: ObservableObject {
    static let shared = DeviceMonitor()

    @Published private(set) var connected: (kind: DeviceKind, name: String)?

    private var known: Set<String> = []
    private var listener: AudioObjectPropertyListenerBlock?
    private var cancellables: Set<AnyCancellable> = []

    private static var devicesAddress = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDevices,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )

    private init() {
        Defaults.publisher(.deviceConnectAnimation)
            .sink { [weak self] change in
                Task { @MainActor in self?.setEnabled(change.newValue) }
            }
            .store(in: &cancellables)
    }

    private func setEnabled(_ enabled: Bool) {
        let system = AudioObjectID(kAudioObjectSystemObject)
        if enabled {
            guard listener == nil else { return }
            // Seeded first, so whatever is already connected at launch is not announced.
            known = Set(AudioOutputs.list().map(\.name))
            let block: AudioObjectPropertyListenerBlock = { _, _ in
                MainActor.assumeIsolated { DeviceMonitor.shared.devicesChanged() }
            }
            let status = AudioObjectAddPropertyListenerBlock(system, &Self.devicesAddress, .main, block)
            if status != noErr { return print("❌ Watching audio devices failed: \(status)") }
            listener = block
        } else if let listener {
            AudioObjectRemovePropertyListenerBlock(system, &Self.devicesAddress, .main, listener)
            self.listener = nil
        }
    }

    private func devicesChanged() {
        let names = Set(AudioOutputs.list().map(\.name))
        let arrived = names.subtracting(known)
        known = names
        guard let name = arrived.first(where: { DeviceKind(deviceName: $0) != nil }),
              let kind = DeviceKind(deviceName: name) else { return }
        connected = (kind, name)
        VisorViewCoordinator.shared.toggleExpandingView(status: true, type: .device)
    }
}
