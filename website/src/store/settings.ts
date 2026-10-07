import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  wallpaper: number | 'auto';
  dim: number;
  volume: number;
  backlight: number;
  appearance: 'light' | 'dark';
  accent: string;
  hoverOpen: boolean;
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
      accent: '#ff2d55',
      hoverOpen: true,
      set: (patch) => set(patch),
    }),
    { name: 'visor-site-settings' },
  ),
);
