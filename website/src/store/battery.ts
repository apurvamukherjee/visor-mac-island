import { create } from 'zustand';
import { useNotch } from '../notch/store';

interface BatteryManager extends EventTarget {
  level: number;
  charging: boolean;
}

interface Battery {
  supported: boolean;
  level: number;
  charging: boolean;
}

// The Battery Status API only exists in Chromium; elsewhere the menu bar hides the battery.
function hasBattery(nav: Navigator): nav is Navigator & { getBattery: () => Promise<BatteryManager> } {
  return 'getBattery' in nav;
}

// Green while charging and red under 20%, as in the macOS menu bar.
export const batteryColor = (level: number, charging: boolean, normal = 'currentColor') => (charging ? '#34c759' : level < 0.2 ? '#ff453a' : normal);

export const useBattery = create<Battery>()(() => ({ supported: false, level: 1, charging: false }));

if (typeof navigator !== 'undefined' && hasBattery(navigator)) {
  void navigator.getBattery().then((b) => {
    const sync = () => {
      const was = useBattery.getState();
      useBattery.setState({ supported: true, level: b.level, charging: b.charging });
      // Visor's heads-up when the charger goes in or comes out.
      if (was.supported && was.charging !== b.charging) useNotch.getState().flash({ kind: 'battery', charging: b.charging, level: b.level }, 2500);
    };
    sync();
    b.addEventListener('levelchange', sync);
    b.addEventListener('chargingchange', sync);
  });
}
