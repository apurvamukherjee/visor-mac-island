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

    struct Connected {
        let kind: DeviceKind
        let name: String
        var battery: DeviceBattery?
    }

    @Published private(set) var connected: Connected?
    private var batteryTask: Task<Void, Never>?

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
            DeviceModels.prewarm()
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
        guard let (name, kind) = arrived.lazy
            .compactMap({ name in DeviceKind(deviceName: name).map { (name, $0) } }).first
        else { return }
        connected = Connected(kind: kind, name: name)
        VisorViewCoordinator.shared.toggleExpandingView(status: true, type: .device)
        batteryTask?.cancel()
        guard kind.hasBattery else { return }
        batteryTask = Task {
            // Headsets report their level a moment after the audio route
            // appears, so a few tries cover the seconds the notch is open.
            for _ in 0..<3 {
                if let battery = await Self.readBattery(of: name) {
                    if connected?.name == name { connected?.battery = battery }
                    return
                }
                try? await Task.sleep(for: .seconds(1))
                if Task.isCancelled { return }
            }
        }
    }

    /// Asks system_profiler, the public route to Bluetooth battery levels.
    /// It takes about a second, so it runs off the main actor.
    private nonisolated static func readBattery(of name: String) async -> DeviceBattery? {
        await Task.detached {
            let process = Process()
            process.executableURL = URL(fileURLWithPath: "/usr/sbin/system_profiler")
            process.arguments = ["SPBluetoothDataType", "-json"]
            let pipe = Pipe()
            process.standardOutput = pipe
            process.standardError = FileHandle.nullDevice
            do { try process.run() } catch {
                print("❌ Reading Bluetooth battery failed: \(error)")
                return nil
            }
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            process.waitUntilExit()
            return DeviceBattery.parse(data, name: name)
        }.value
    }
}
