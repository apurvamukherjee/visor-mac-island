

import Defaults
import SwiftUI

struct VisorHeader: View {
    @EnvironmentObject var vm: VisorViewModel
    @ObservedObject var batteryModel = BatteryStatusViewModel.shared
    @ObservedObject var coordinator = VisorViewCoordinator.shared
    @StateObject var tvm = ShelfStateViewModel.shared
    @ObservedObject var timer = TimerManager.shared
    @ObservedObject var meetings = MeetingMonitor.shared
    @State private var isChoosingTimer = false
    @Default(.liquidGlass) private var liquidGlass
    var body: some View {
        HStack(spacing: 0) {
            HStack {
                if (!tvm.isEmpty || coordinator.alwaysShowTabs) && Defaults[.visorShelf] {
                    TabSelectionView()
                } else if vm.notchState == .open {
                    EmptyView()
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .opacity(vm.notchState == .closed ? 0 : 1)
            .zIndex(2)

            if vm.notchState == .open {
                Rectangle()
                    .fill(NSScreen.screen(withUUID: coordinator.selectedScreenUUID)?.safeAreaInsets.top ?? 0 > 0 ? .black : .clear)
                    .frame(width: vm.closedNotchSize.width)
                    .mask {
                        NotchShape()
                    }
            }

            HStack(spacing: 4) {
                if vm.notchState == .open {
                    if isHUDType(coordinator.sneakPeek.type) && coordinator.sneakPeek.show && Defaults[.showOpenNotchHUD] {
                        OpenNotchHUD(type: $coordinator.sneakPeek.type, value: $coordinator.sneakPeek.value)
                            .transition(.scale(scale: 0.8).combined(with: .opacity))
                    } else if isChoosingTimer {
                        timerPresets
                    } else {
                        if let meeting = meetings.active {
                            Button {
                                meetings.join()
                            } label: {
                                Label("Join", systemImage: "video.fill")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 10)
                                    .frame(height: 30)
                                    .background(Capsule().fill(Color.effectiveAccent))
                            }
                            .buttonStyle(PlainButtonStyle())
                            .help("Join \(meeting.title)")
                        }
                        if Defaults[.showTimer] {
                            timerControl
                        }
                        if Defaults[.showMirror] {
                            headerButton(systemImage: "web.camera") {
                                vm.toggleCameraPreview()
                            }
                        }
                        if Defaults[.settingsIconInNotch] {
                            headerButton(systemImage: "gear") {
                                DispatchQueue.main.async {
                                    SettingsWindowController.shared.showWindow()
                                }
                            }
                        }
                        if Defaults[.showBatteryIndicator] {
                            VisorBatteryView(
                                batteryWidth: 30,
                                isCharging: batteryModel.isCharging,
                                isInLowPowerMode: batteryModel.isInLowPowerMode,
                                isPluggedIn: batteryModel.isPluggedIn,
                                levelBattery: batteryModel.levelBattery,
                                maxCapacity: batteryModel.maxCapacity,
                                timeToFullCharge: batteryModel.timeToFullCharge,
                                isForNotification: false
                            )
                        }
                    }
                }
            }
            .font(.system(.headline, design: .rounded))
            .frame(maxWidth: .infinity, alignment: .trailing)
            .opacity(vm.notchState == .closed ? 0 : 1)
            .zIndex(2)
        }
        .foregroundColor(.gray)
    }

    // Visor: a running timer shows its countdown; tapping it cancels.
    @ViewBuilder
    private var timerControl: some View {
        if let start = timer.startDate, let end = timer.endDate {
            Button {
                timer.cancel()
            } label: {
                HStack(spacing: 4) {
                    Text(timerInterval: start...end, countsDown: true)
                        .monospacedDigit()
                    Image(systemName: "xmark")
                        .imageScale(.small)
                }
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.white)
                .padding(.horizontal, 10)
                .frame(height: 30)
                .background(Capsule().fill(Color.effectiveAccentBackground))
            }
            .buttonStyle(PlainButtonStyle())
            .help("Cancel timer")
        } else {
            headerButton(systemImage: "timer") {
                withAnimation(.smooth) { isChoosingTimer = true }
            }
        }
    }

    private var timerPresets: some View {
        HStack(spacing: 4) {
            ForEach(TimerManager.presetMinutes, id: \.self) { minutes in
                Button {
                    timer.start(minutes: minutes)
                    withAnimation(.smooth) { isChoosingTimer = false }
                } label: {
                    Text("\(minutes)")
                        .font(.system(size: 12, weight: .semibold).monospacedDigit())
                        .foregroundStyle(.white)
                        .frame(width: 28, height: 26)
                        .background(Capsule().fill(Color(nsColor: .secondarySystemFill)))
                }
                .buttonStyle(PlainButtonStyle())
                .help("\(minutes) min")
            }
            headerButton(systemImage: "xmark") {
                withAnimation(.smooth) { isChoosingTimer = false }
            }
        }
        .transition(.opacity)
    }

    // Visor: the mirror and settings buttons were two copies of this.
    private func headerButton(systemImage: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Capsule()
                .fill(Color.notchControlFill(glass: liquidGlass))
                .frame(width: 30, height: 30)
                .overlay {
                    Image(systemName: systemImage)
                        .foregroundColor(.white)
                        .padding()
                        .imageScale(.medium)
                }
        }
        .buttonStyle(PlainButtonStyle())
    }

    func isHUDType(_ type: SneakContentType) -> Bool {
        switch type {
        case .volume, .brightness, .backlight:
            return true
        default:
            return false
        }
    }
}
