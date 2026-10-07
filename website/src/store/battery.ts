import { create } from 'zustand';

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

export const useBattery = create<Battery>()(() => ({ supported: false, level: 1, charging: false }));

if (typeof navigator !== 'undefined' && hasBattery(navigator)) {
  void navigator.getBattery().then((b) => {
    const sync = () => useBattery.setState({ supported: true, level: b.level, charging: b.charging });
    sync();
    b.addEventListener('levelchange', sync);
    b.addEventListener('chargingchange', sync);
  });
}
