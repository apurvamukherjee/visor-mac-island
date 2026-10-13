import Foundation
import SwiftUI

/// The audio devices Visor shows a model for. Anything else that connects
/// is left alone: an unknown speaker has no model to turn.
enum DeviceKind: CaseIterable {
    case airpods, oneplusBuds, jblBar

    init?(deviceName: String) {
        let name = deviceName.lowercased()
        if name.contains("airpods") {
            self = .airpods
        } else if name.contains("oneplus buds") {
            self = .oneplusBuds
        } else if name.contains("jbl cinema") || name.contains("jbl bar") {
            self = .jblBar
        } else {
            return nil
        }
    }

    var glow: Color {
        switch self {
        case .airpods: Color(white: 0.9)
        case .oneplusBuds: Color(red: 0.25, green: 0.5, blue: 1)
        case .jblBar: Color(red: 1, green: 0.45, blue: 0.1)
        }
    }

    var hasBattery: Bool { self != .jblBar }

    /// How far the model sits from the camera's frame: the soundbar is a
    /// metre wide where the earbuds are a thumb tall.
    var scale: Float {
        switch self {
        case .airpods, .oneplusBuds: 1.35
        case .jblBar: 0.95
        }
    }
}

/// Battery levels as macOS reports them, 0–100. AirPods give left, right and
/// case; most other headsets give one level for the pair.
struct DeviceBattery: Equatable {
    var left: Int?
    var right: Int?
    var caseLevel: Int?
    var main: Int?

    var isEmpty: Bool { left == nil && right == nil && caseLevel == nil && main == nil }

    /// Reads `system_profiler SPBluetoothDataType -json` output for the
    /// connected device called `name`.
    static func parse(_ json: Data, name: String) -> DeviceBattery? {
        guard let root = try? JSONSerialization.jsonObject(with: json) as? [String: Any],
              let controller = (root["SPBluetoothDataType"] as? [[String: Any]])?.first,
              let connected = controller["device_connected"] as? [[String: [String: Any]]],
              let info = connected.lazy.compactMap({ $0[name] }).first
        else { return nil }
        func level(_ key: String) -> Int? {
            (info[key] as? String).flatMap { Int($0.replacingOccurrences(of: "%", with: "")) }
        }
        let battery = DeviceBattery(
            left: level("device_batteryLevelLeft"), right: level("device_batteryLevelRight"),
            caseLevel: level("device_batteryLevelCase"), main: level("device_batteryLevelMain")
        )
        return battery.isEmpty ? nil : battery
    }
}
