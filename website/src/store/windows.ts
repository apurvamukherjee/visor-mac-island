import { create } from 'zustand';
import { apps, type AppId } from '../apps/apps';

export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Win {
  id: AppId;
  frame: Frame;
  z: number;
  minimized: boolean;
  zoomed: boolean;
}

interface Windows {
  wins: Partial<Record<AppId, Win>>;
  top: number;
  focused: AppId | null;
  open: (id: AppId, frame?: Frame) => void;
  close: (id: AppId) => void;
  focus: (id: AppId) => void;
  minimize: (id: AppId) => void;
  toggleZoom: (id: AppId) => void;
  setFrame: (id: AppId, frame: Frame) => void;
}

export const MENU_BAR = 28;
export const DOCK_SPACE = 84;
const MIN_W = 320;
const MIN_H = 200;

// Cascade new windows like macOS so a second window never lands exactly on the first.
function initialFrame(id: AppId, openCount: number): Frame {
  const { w: aw, h: ah } = apps[id];
  const w = Math.min(aw, window.innerWidth - 32);
  const h = Math.min(ah, window.innerHeight - MENU_BAR - DOCK_SPACE - 16);
  const step = (openCount % 6) * 26;
  return {
    w,
    h,
    x: Math.max(16, (window.innerWidth - w) / 2 + step),
    y: Math.max(MENU_BAR + 8, MENU_BAR + (window.innerHeight - MENU_BAR - DOCK_SPACE - h) / 2 + step),
  };
}

export function clampFrame(f: Frame): Frame {
  const w = Math.max(MIN_W, Math.min(f.w, window.innerWidth));
  const h = Math.max(MIN_H, Math.min(f.h, window.innerHeight - MENU_BAR));
  return {
    w,
    h,
    // Keep the title bar reachable: never above the menu bar, never fully off a side.
    x: Math.min(Math.max(f.x, 80 - w), window.innerWidth - 80),
    y: Math.min(Math.max(f.y, MENU_BAR), window.innerHeight - 40),
  };
}

export const useWindows = create<Windows>()((set, get) => {
  const patch = (id: AppId, change: Partial<Win>) =>
    set((s) => {
      const win = s.wins[id];
      return win ? { wins: { ...s.wins, [id]: { ...win, ...change } } } : s;
    });

  return {
    wins: {},
    top: 10,
    focused: null,
    open: (id, frame) => {
      const { wins, top } = get();
      const win = wins[id];
      const z = top + 1;
      const fresh = { id, frame: frame ? clampFrame(frame) : initialFrame(id, Object.keys(wins).length), z, minimized: false, zoomed: false };
      set({ top: z, focused: id, wins: { ...wins, [id]: win ? { ...win, z, minimized: false } : fresh } });
    },
    close: (id) =>
      set((s) => {
        const wins = Object.fromEntries(Object.entries(s.wins).filter(([key]) => key !== id));
        return { wins, focused: s.focused === id ? null : s.focused };
      }),
    focus: (id) => {
      const { top, focused } = get();
      if (focused === id) return;
      set({ top: top + 1, focused: id });
      patch(id, { z: top + 1 });
    },
    minimize: (id) => {
      patch(id, { minimized: true });
      set((s) => ({ focused: s.focused === id ? null : s.focused }));
    },
    toggleZoom: (id) => {
      const win = get().wins[id];
      if (win) patch(id, { zoomed: !win.zoomed });
    },
    setFrame: (id, frame) => patch(id, { frame: clampFrame(frame), zoomed: false }),
  };
});
