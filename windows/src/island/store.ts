import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { listen } from '@tauri-apps/api/event';
import { useSystem } from '../native';
import { connectedDevice, type DeviceKind } from './devices';
import { useSettings } from '../settings/store';
import { ringBell } from '../../../website/src/notch/bell';

export type Tab = 'home' | 'shelf';

/** What the closed island briefly grows to show, one at a time, newest wins. */
export type Transient =
  | { kind: 'hud'; hud: 'volume' | 'brightness'; value: number; muted: boolean }
  | { kind: 'battery'; charging: boolean; level: number }
  | { kind: 'peek' }
  | { kind: 'unlock' }
  | { kind: 'screenshot' }
  | { kind: 'device'; device: DeviceKind; name: string };

interface Island {
  open: boolean;
  tab: Tab;
  transient: Transient | null;
  /** Epoch ms when the running timer rings, or null. */
  timerEnd: number | null;
  ringing: boolean;
  mirror: boolean;
  setOpen: (open: boolean) => void;
  setTab: (tab: Tab) => void;
  flash: (t: Transient, ms?: number) => void;
  startTimer: (minutes: number) => void;
  stopTimer: () => void;
  toggleMirror: () => void;
}

// TimerManager.presetMinutes and its four-second ring.
export const TIMER_PRESETS = [1, 5, 10, 15, 25, 60];
const RING_MS = 4000;
const FLASH_MS = 1800;
const PEEK_MS = 2500;
const DEVICE_MS = 5000;

let clearTransient: ReturnType<typeof setTimeout> | undefined;
let ring: ReturnType<typeof setTimeout> | undefined;

export const useIsland = create<Island>()((set, get) => ({
  open: false,
  tab: 'home',
  transient: null,
  timerEnd: null,
  ringing: false,
  mirror: false,
  setOpen: (open) => set({ open }),
  setTab: (tab) => set({ tab, open: true }),
  flash: (transient, ms = FLASH_MS) => {
    clearTimeout(clearTransient);
    set({ transient });
    clearTransient = setTimeout(() => set({ transient: null }), ms);
  },
  startTimer: (minutes) => {
    clearTimeout(ring);
    // One timeout, no ticking: the views redraw from timerEnd on their own clock.
    ring = setTimeout(() => {
      ringBell();
      set({ timerEnd: null, ringing: true });
      ring = setTimeout(() => set({ ringing: false }), RING_MS);
    }, minutes * 60_000);
    set({ timerEnd: Date.now() + minutes * 60_000, ringing: false });
  },
  stopTimer: () => {
    clearTimeout(ring);
    set({ timerEnd: null, ringing: false });
  },
  toggleMirror: () => set({ mirror: !get().mirror }),
}));

/** Files on the shelf, newest first, kept across restarts like the Mac's ShelfPersistenceService. */
export const useShelf = create<{ files: string[]; add: (paths: string[]) => void; remove: (paths: string[]) => void }>()(
  persist(
    (set) => ({
      files: [],
      add: (paths) => set((s) => ({ files: [...paths.filter((p) => !s.files.includes(p)), ...s.files] })),
      remove: (paths) => set((s) => ({ files: s.files.filter((f) => !paths.includes(f)) })),
    }),
    { name: 'visor-shelf' },
  ),
);

// Each monitor's island is its own webview; a drop on one shows on all.
window.addEventListener('storage', (e) => {
  if (e.key === 'visor-shelf') void useShelf.persist.rehydrate();
});

const trackKey = (m: { title: string; artist: string } | null) => (m ? `${m.title}|${m.artist}` : '');

/** Turns system changes into the closed island's live activities. Each island runs its own. */
export function startTransients() {
  const { flash } = useIsland.getState();
  const settings = useSettings.getState;
  const volume = () => {
    const s = useSystem.getState();
    if (settings().replaceHud) flash({ kind: 'hud', hud: 'volume', value: s.volume, muted: s.muted });
  };

  useSystem.subscribe((s, prev) => {
    // The first state is how things are, not a change.
    if (!prev.ready) return;
    if (s.volume !== prev.volume || s.muted !== prev.muted) volume();
    if (s.brightness !== null && prev.brightness !== null && s.brightness !== prev.brightness && settings().replaceHud) {
      flash({ kind: 'hud', hud: 'brightness', value: s.brightness, muted: false });
    }
    if (s.battery && prev.battery && s.battery.plugged !== prev.battery.plugged) {
      flash({ kind: 'battery', charging: s.battery.plugged, level: s.battery.level }, 3000);
    }
    if (prev.locked && !s.locked) flash({ kind: 'unlock' }, 1200);
    if (s.media && trackKey(s.media) !== trackKey(prev.media) && settings().sneakPeek && !useIsland.getState().open) {
      flash({ kind: 'peek' }, PEEK_MS);
    }
    const device = settings().deviceAnimation ? connectedDevice(prev.outputs, s.outputs) : null;
    if (device) flash({ kind: 'device', ...device }, DEVICE_MS);
  });

  // At 0 or 100% the level doesn't change, but the HUD still answers the key.
  void listen('volume-key', volume);
  void listen<string>('screenshot', (e) => {
    if (!settings().catchScreenshots) return;
    useShelf.getState().add([e.payload]);
    flash({ kind: 'screenshot' }, PEEK_MS);
  });
}
