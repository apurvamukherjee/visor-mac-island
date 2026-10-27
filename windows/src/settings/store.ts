import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  hoverOpen: boolean;
  /** Seconds the pointer rests on the closed island before it opens; Visor's minimumHoverDuration. */
  hoverDelay: number;
  set: (patch: Partial<Pick<Settings, 'hoverOpen' | 'hoverDelay'>>) => void;
}

const KEY = 'visor-settings';

export const useSettings = create<Settings>()(
  persist((set) => ({ hoverOpen: true, hoverDelay: 0.3, set: (patch) => set(patch) }), { name: KEY }),
);

// The settings window and every island are separate webviews sharing one localStorage.
window.addEventListener('storage', (e) => {
  if (e.key === KEY) void useSettings.persist.rehydrate();
});
