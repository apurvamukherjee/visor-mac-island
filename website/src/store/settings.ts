import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  wallpaper: number | 'auto';
  dim: number;
  volume: number;
  backlight: number;
  appearance: 'light' | 'dark';
  set: (patch: Partial<Omit<Settings, 'set'>>) => void;
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      wallpaper: 'auto',
      dim: 0,
      volume: 0.6,
      backlight: 0.7,
      appearance: 'light',
      set: (patch) => set(patch),
    }),
    { name: 'visor-site-settings' },
  ),
);
