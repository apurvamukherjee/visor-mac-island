import { create } from 'zustand';
import { ringBell } from './bell';

export type Tab = 'home' | 'shelf';
export type Hud = 'volume' | 'brightness' | 'backlight';

export type Transient =
  | { kind: 'hud'; hud: Hud; value: number }
  | { kind: 'battery'; charging: boolean; level: number }
  | { kind: 'peek' }
  | { kind: 'download'; app: string }
  | { kind: 'join'; app: string; title: string }
  | { kind: 'unlock' };

export interface ShelfFile {
  name: string;
  icon: string;
  thumb: boolean;
}

interface Notch {
  open: boolean;
  tab: Tab;
  playing: boolean;
  track: number;
  position: number;
  transient: Transient | null;
  /** Epoch ms when the running timer rings, or null. */
  timerEnd: number | null;
  /** Files dropped or screenshotted this visit, newest first. */
  shelf: ShelfFile[];
  addToShelf: (files: ShelfFile[]) => void;
  setOpen: (open: boolean) => void;
  setTab: (tab: Tab) => void;
  togglePlay: () => void;
  skip: (by: 1 | -1) => void;
  playTrack: (index: number) => void;
  seek: (position: number) => void;
  /** Set by the audio element as it plays; seek() is for the user moving the scrubber. */
  setPosition: (position: number) => void;
  flash: (t: Transient, ms?: number) => void;
  startTimer: (minutes: number) => void;
  stopTimer: () => void;
}

let clearTransient: ReturnType<typeof setTimeout> | undefined;
// The bell rings from here, not from the closed notch, so it still rings while the notch is open.
let ring: ReturnType<typeof setTimeout> | undefined;

export const useNotch = create<Notch>()((set, get) => ({
  open: false,
  tab: 'home',
  playing: false,
  track: 0,
  position: 0,
  transient: null,
  timerEnd: null,
  shelf: [],
  addToShelf: (files) => set((s) => ({ shelf: [...files, ...s.shelf], tab: 'shelf', open: true })),
  setOpen: (open) => set({ open }),
  setTab: (tab) => set({ tab, open: true }),
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  skip: (by) => {
    // Like Music: going back mid-song restarts it instead of jumping a track.
    if (by === -1 && get().position > 3) return set({ position: 0 });
    set((s) => ({ track: s.track + by, position: 0 }));
    if (!get().open) get().flash({ kind: 'peek' }, 2500);
  },
  playTrack: (index) => {
    set({ track: index, position: 0, playing: true });
    if (!get().open) get().flash({ kind: 'peek' }, 2500);
  },
  seek: (position) => set({ position }),
  setPosition: (position) => set({ position }),
  startTimer: (minutes) => {
    clearTimeout(ring);
    ring = setTimeout(() => {
      ringBell();
      set({ timerEnd: null });
    }, minutes * 60_000);
    set({ timerEnd: Date.now() + minutes * 60_000 });
  },
  stopTimer: () => {
    clearTimeout(ring);
    set({ timerEnd: null });
  },
  flash: (transient, ms = 1800) => {
    clearTimeout(clearTransient);
    set({ transient });
    clearTransient = setTimeout(() => set({ transient: null }), ms);
  },
}));
