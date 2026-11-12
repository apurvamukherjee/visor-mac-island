import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applySettings, report } from '../native';

export type HudControls = 'volume' | 'brightness' | 'both';
export type HomePanel = 'calendar' | 'tasks';
export type PaneId = 'general' | 'music' | 'calendar' | 'shelf' | 'extras' | 'about';

// Defaults follow the Mac app's Constants.swift wherever the setting exists there.
const defaults = {
  onboarded: false,
  /** Stored, so an island can open Settings on the pane it needs. */
  settingsPane: 'general' as PaneId,
  hoverOpen: true,
  /** Seconds the pointer rests on the closed island before it opens; Visor's minimumHoverDuration. */
  hoverDelay: 0.3,
  launchAtLogin: false,
  hideInFullscreen: false,
  hideFromCapture: false,
  /** Take the volume keys and show Visor's HUD instead of the Windows flyout. */
  replaceHud: false,
  /** Which HUDs the island takes over, as the Mac's Settings › HUDs › Controls; volume only by default. */
  hudControls: 'volume' as HudControls,
  sneakPeek: false,
  vinyl: false,
  lyrics: false,
  /** A line of light round each monitor while music plays, thickening on the bass; off as on the Mac. */
  edgeGlow: false,
  edgeGlowStrength: 1,
  showBattery: true,
  showCalendar: false,
  showTasks: false,
  /** Which of the two shares the place beside the player when both are on. */
  homePanel: 'calendar' as HomePanel,
  /** ICS feeds, one per line: Outlook, Google and iCloud all publish one. */
  calendars: '',
  showWeather: false,
  meetingAlerts: true,
  taskAlerts: true,
  /** Minutes before a deadline that the closed island starts saying so. */
  taskAlertLead: 15,
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
  persist((set) => ({ ...defaults, set: (patch) => set(patch) }), {
    name: KEY,
    // v1 keeps the island over full-screen apps by default; v0 installs saved the old default.
    version: 1,
    migrate: (saved, version) => {
      const state = { ...defaults, ...(typeof saved === 'object' ? saved : {}) };
      if (version < 1) state.hideInFullscreen = false;
      return state as Settings;
    },
  }),
);

// The settings window and every island are separate webviews sharing one localStorage.
window.addEventListener('storage', (e) => {
  if (e.key === KEY) void useSettings.persist.rehydrate();
});

function syncNative({ replaceHud, hudControls, hideFromCapture, hideInFullscreen, launchAtLogin, edgeGlow }: SettingsValues) {
  // Rust only takes the volume keys; brightness keys are firmware's, so there's nothing to hand it for those.
  applySettings({ replaceHud: replaceHud && hudControls !== 'brightness', hideFromCapture, hideInFullscreen, launchAtLogin, edgeGlow }).catch(report);
}

/** Hands Rust the settings it acts on now and after every change. Idempotent, so every window may call it. */
export function startNativeSettings() {
  syncNative(useSettings.getState());
  // Not on every change: dragging the hover-delay slider would rewrite the registry in every window.
  const NATIVE = ['replaceHud', 'hudControls', 'hideFromCapture', 'hideInFullscreen', 'launchAtLogin', 'edgeGlow'] as const;
  useSettings.subscribe((s, prev) => {
    if (NATIVE.some((k) => s[k] !== prev[k])) syncNative(s);
  });
}
