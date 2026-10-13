//
//  DeviceLiveActivity.swift
//  Visor
//

import SceneKit
import SwiftUI

/// What the closed notch grows into when AirPods, OnePlus Buds or the JBL
/// soundbar connect: the device's model turning slowly under the notch,
/// with its name beside it.
struct DeviceLiveActivity: View {
    let device: DeviceMonitor.Connected
    /// The hardware notch's height, kept clear so nothing hides behind it.
    let notchHeight: CGFloat

    @State private var appeared = false

    static let width: CGFloat = 400

    var body: some View {
        VStack(spacing: 0) {
            Color.clear.frame(height: notchHeight)
            HStack(spacing: 12) {
                DeviceModelView(kind: device.kind)
                    .frame(width: 150, height: 84)
                    .background {
                        RadialGradient(colors: [device.kind.glow.opacity(0.35), .clear], center: .center,
                                       startRadius: 0, endRadius: 60)
                    }
                    // The scene grows and spins itself in; SwiftUI only fades the glow.
                    .opacity(appeared ? 1 : 0)

                VStack(alignment: .leading, spacing: 2) {
                    Text(device.name)
                        .font(.headline)
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    if let battery = device.battery {
                        BatteryRow(battery: battery)
                            .transition(.opacity)
                    } else {
                        Text("Connected")
                            .font(.subheadline)
                            .foregroundStyle(.gray)
                    }
                }
                .animation(.smooth, value: device.battery)
                .offset(x: appeared ? 0 : -8)
                .opacity(appeared ? 1 : 0)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 10)
        }
        .frame(width: Self.width)
        .onAppear {
            withAnimation(.spring(response: 0.45, dampingFraction: 0.8)) { appeared = true }
        }
    }
}

/// Left, right and case for AirPods; one level for a headset that reports
/// the pair together.
private struct BatteryRow: View {
    let battery: DeviceBattery

    var body: some View {
        HStack(spacing: 10) {
            if let main = battery.main, battery.left == nil, battery.right == nil {
                level("Buds", main)
            }
            if let left = battery.left { level("L", left) }
            if let right = battery.right { level("R", right) }
            if let caseLevel = battery.caseLevel { level("Case", caseLevel) }
        }
    }

    private func level(_ label: String, _ percent: Int) -> some View {
        HStack(spacing: 4) {
            Text(label).foregroundStyle(.gray)
            Capsule()
                .fill(.white.opacity(0.2))
                .frame(width: 18, height: 7)
                .overlay(alignment: .leading) {
                    Capsule()
                        .fill(percent <= 20 ? .red : .green)
                        .frame(width: 18 * CGFloat(percent) / 100)
                }
            Text("\(percent)%").foregroundStyle(.white).monospacedDigit()
        }
        .font(.caption)
    }
}

/// The turntable in SwiftUI. It only exists while the notch shows the device,
/// so the scene renders for a few seconds and is torn down with the view.
struct DeviceModelView: NSViewRepresentable {
    let kind: DeviceKind

    func makeNSView(context: Context) -> SCNView {
        let view = SCNView()
        view.backgroundColor = .clear
        view.antialiasingMode = .multisampling4X
        view.preferredFramesPerSecond = 30
        view.scene = DeviceModels.scene(for: kind)
        view.isPlaying = true
        return view
    }

    func updateNSView(_ view: SCNView, context: Context) {}
}
