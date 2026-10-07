import { create } from 'zustand';
import { trackAt } from './tracks';

export type Tab = 'home' | 'shelf';

export type Transient =
  | { kind: 'hud'; hud: 'volume' | 'brightness'; value: number }
  | { kind: 'battery'; charging: boolean; level: number }
  | { kind: 'peek' }
  | { kind: 'download'; progress: number };

interface Notch {
  open: boolean;
  tab: Tab;
  playing: boolean;
  track: number;
  position: number;
  transient: Transient | null;
  setOpen: (open: boolean) => void;
  setTab: (tab: Tab) => void;
  togglePlay: () => void;
  skip: (by: 1 | -1) => void;
  seek: (position: number) => void;
  tick: (seconds: number) => void;
  flash: (t: Transient, ms?: number) => void;
}

let clearTransient: ReturnType<typeof setTimeout> | undefined;

export const useNotch = create<Notch>()((set, get) => ({
  open: false,
  tab: 'home',
  playing: true,
  track: 0,
  position: 42,
  transient: null,
  setOpen: (open) => set({ open }),
  setTab: (tab) => set({ tab, open: true }),
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  skip: (by) => {
    // Like Music: going back mid-song restarts it instead of jumping a track.
    if (by === -1 && get().position > 3) return set({ position: 0 });
    set((s) => ({ track: s.track + by, position: 0 }));
    if (!get().open) get().flash({ kind: 'peek' }, 2500);
  },
  seek: (position) => set({ position }),
  tick: (seconds) => {
    const { playing, position, track } = get();
    if (!playing) return;
    if (position + seconds >= trackAt(track).duration) get().skip(1);
    else set({ position: position + seconds });
  },
  flash: (transient, ms = 1800) => {
    clearTimeout(clearTransient);
    set({ transient });
    clearTransient = setTimeout(() => set({ transient: null }), ms);
  },
}));
