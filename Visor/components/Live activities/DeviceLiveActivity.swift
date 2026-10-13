//
//  DeviceLiveActivity.swift
//  Visor
//

import SwiftUI

/// What the closed notch grows into when AirPods, OnePlus Buds or the JBL
/// soundbar connect: the device's model turning slowly under the notch,
/// with its name beside it.
struct DeviceLiveActivity: View {
    let kind: DeviceKind
    let name: String
    /// The hardware notch's height, kept clear so nothing hides behind it.
    let notchHeight: CGFloat

    @State private var appeared = false

    static let width: CGFloat = 360

    var body: some View {
        VStack(spacing: 0) {
            Color.clear.frame(height: notchHeight)
            HStack(spacing: 12) {
                DeviceModelView(kind: kind)
                    .frame(width: 140, height: 68)
                    .background {
                        RadialGradient(colors: [kind.glow.opacity(0.35), .clear], center: .center,
                                       startRadius: 0, endRadius: 60)
                    }
                    .scaleEffect(appeared ? 1 : 0.5)
                    .opacity(appeared ? 1 : 0)

                VStack(alignment: .leading, spacing: 2) {
                    Text(name)
                        .font(.headline)
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    Text("Connected")
                        .font(.subheadline)
                        .foregroundStyle(.gray)
                }
                .offset(x: appeared ? 0 : -8)
                .opacity(appeared ? 1 : 0)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 10)
        }
        .frame(width: Self.width)
        .onAppear {
            withAnimation(.spring(response: 0.55, dampingFraction: 0.7).delay(0.1)) { appeared = true }
        }
    }
}
