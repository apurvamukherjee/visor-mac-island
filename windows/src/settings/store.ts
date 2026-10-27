import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applySettings, report } from '../native';

// Defaults follow the Mac app's Constants.swift wherever the setting exists there.
const defaults = {
  onboarded: false,
  hoverOpen: true,
  /** Seconds the pointer rests on the closed island before it opens; Visor's minimumHoverDuration. */
  hoverDelay: 0.3,
  launchAtLogin: false,
  hideInFullscreen: true,
  hideFromCapture: false,
  /** Take the volume keys and show Visor's HUD instead of the Windows flyout. */
  replaceHud: false,
  sneakPeek: false,
  vinyl: false,
  lyrics: false,
  showBattery: true,
  showCalendar: false,
  /** ICS feeds, one per line: Outlook, Google and iCloud all publish one. */
  calendars: '',
  showWeather: false,
  meetingAlerts: true,
  showTimer: true,
  showMirror: false,
  showDownloads: true,
  catchScreenshots: true,
  deviceAnimation: true,
  checkForUpdates: true,
};

export type SettingsValues = typeof defaults;

interface Settings extends SettingsValues {
  set: (patch: Partial<SettingsValues>) => void;
}

const KEY = 'visor-settings';

export const useSettings = create<Settings>()(
  persist((set) => ({ ...defaults, set: (patch) => set(patch) }), { name: KEY }),
);

// The settings window and every island are separate webviews sharing one localStorage.
window.addEventListener('storage', (e) => {
  if (e.key === KEY) void useSettings.persist.rehydrate();
});

function syncNative({ replaceHud, hideFromCapture, hideInFullscreen, launchAtLogin }: SettingsValues) {
  applySettings({ replaceHud, hideFromCapture, hideInFullscreen, launchAtLogin }).catch(report);
}

/** Hands Rust the settings it acts on now and after every change. Idempotent, so every window may call it. */
export function startNativeSettings() {
  syncNative(useSettings.getState());
  useSettings.subscribe(syncNative);
}
