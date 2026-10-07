//
//  OpenNotchHUD.swift
//  
//
//

import SwiftUI
import Defaults

struct OpenNotchHUD: View {
    @Binding var type: SneakContentType
    @Binding var value: CGFloat
    @Default(.liquidGlass) private var liquidGlass
    @Default(.showOpenNotchHUDPercentage) var showPercentage
    
    var body: some View {
        HStack(spacing: 8) {
            // Icon
            Group {
                switch type {
                case .volume:
                    Image(systemName: value.isZero ? "speaker.slash" : "speaker.wave.3", variableValue: value)
                        .contentTransition(.interpolate)
                case .brightness:
                    Image(systemName: "sun.max.fill")
                        .contentTransition(.symbolEffect)
                case .backlight:
                    Image(systemName: value > 0.5 ? "light.max" : "light.min")
                        .contentTransition(.interpolate)
                default:
                    EmptyView()
                }
            }
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(.white)
            .frame(width: 20, alignment: .center)
            
            // Slider
            DraggableProgressBar(value: $value, onChange: { newVal in
                 type.applySystemValue(newVal)
            })
            .frame(width: showPercentage ? 65 : 108) // Fixed width for consistency
            
            // Percentage Text
            if showPercentage {
                Text("\(Int(value * 100))%")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.gray)
                    .monospacedDigit()
                    .frame(width: 35, alignment: .trailing)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(
            Capsule()
                .fill(Color.notchControlFill(glass: liquidGlass))
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }
}
