import IOKit.ps
import SwiftUI

@MainActor
final class BatteryStatusViewModel: ObservableObject {
    static let shared = BatteryStatusViewModel()

    @Published private(set) var levelBattery: Float = 0.0
    @Published private(set) var maxCapacity: Float = 0.0
    @Published private(set) var isPluggedIn: Bool = false
    @Published private(set) var isCharging: Bool = false
    @Published private(set) var isInLowPowerMode: Bool = false
    @Published private(set) var timeToFullCharge: Int = 0
    @Published private(set) var statusText: String = ""

    private var powerSource: CFRunLoopSource?
    private var lowPowerObserver: NSObjectProtocol?

    private init() {
        refresh(showActivity: false)
        statusText = isPluggedIn ? "Plugged In" : "Unplugged"

        let context = Unmanaged.passUnretained(self).toOpaque()
        if let source = IOPSNotificationCreateRunLoopSource({ context in
            guard let context else { return }
            // The source is added to the main run loop below, so this runs on main.
            MainActor.assumeIsolated {
                Unmanaged<BatteryStatusViewModel>.fromOpaque(context).takeUnretainedValue().refresh(showActivity: true)
            }
        }, context)?.takeRetainedValue() {
            powerSource = source
            CFRunLoopAddSource(CFRunLoopGetMain(), source, .defaultMode)
        }

        lowPowerObserver = NotificationCenter.default.addObserver(
            forName: .NSProcessInfoPowerStateDidChange, object: nil, queue: .main
        ) { [weak self] _ in
            MainActor.assumeIsolated { self?.refresh(showActivity: true) }
        }
    }

    private func refresh(showActivity: Bool) {
        guard let snapshot = IOPSCopyPowerSourcesInfo()?.takeRetainedValue(),
              let source = (IOPSCopyPowerSourcesList(snapshot)?.takeRetainedValue() as? [CFTypeRef])?.first,
              let description = IOPSGetPowerSourceDescription(snapshot, source)?.takeUnretainedValue() as? [String: Any],
              let currentCapacity = description[kIOPSCurrentCapacityKey] as? Float,
              let maxCapacity = description[kIOPSMaxCapacityKey] as? Float,
              let isCharging = description["Is Charging"] as? Bool,
              let powerState = description[kIOPSPowerSourceStateKey] as? String
        else { return }

        let isPluggedIn = powerState == kIOPSACPowerValue
        let isInLowPowerMode = ProcessInfo.processInfo.isLowPowerModeEnabled

        // Most specific change wins, matching the order the old event queue settled in.
        var newStatus: String?
        if isPluggedIn != self.isPluggedIn { newStatus = isPluggedIn ? "Plugged In" : "Unplugged" }
        if isCharging != self.isCharging {
            newStatus = isCharging ? "Charging battery" : (currentCapacity < maxCapacity ? "Not charging" : "Full charge")
        }
        if isInLowPowerMode != self.isInLowPowerMode { newStatus = "Low Power: \(isInLowPowerMode ? "On" : "Off")" }

        withAnimation {
            self.levelBattery = currentCapacity
            self.maxCapacity = maxCapacity
            self.isPluggedIn = isPluggedIn
            self.isCharging = isCharging
            self.isInLowPowerMode = isInLowPowerMode
            self.timeToFullCharge = description[kIOPSTimeToFullChargeKey] as? Int ?? 0
            if let newStatus { self.statusText = newStatus }
        }

        if showActivity, newStatus != nil {
            VisorViewCoordinator.shared.toggleExpandingView(status: true, type: .battery)
        }
    }
}
