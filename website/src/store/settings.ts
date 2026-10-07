import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  wallpaper: number | 'auto';
  dim: number;
  set: (patch: Partial<Omit<Settings, 'set'>>) => void;
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      wallpaper: 'auto',
      dim: 0,
      set: (patch) => set(patch),
    }),
    { name: 'visor-site-settings' },
  ),
);
