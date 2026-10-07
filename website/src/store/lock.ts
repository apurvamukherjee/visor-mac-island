import { create } from 'zustand';

// Also read by the inline script in index.html, which skips the boot screen for returning visitors.
export const WELCOMED_KEY = 'visor.welcomed';

function welcomed(): boolean {
  try {
    return localStorage.getItem(WELCOMED_KEY) !== null;
  } catch {
    // Storage blocked: treat as a returning visitor rather than replaying the welcome on every load.
    return true;
  }
}

interface Lock {
  locked: boolean;
  /** First visit: the lock screen doubles as the login window while assets download. */
  welcome: boolean;
  lock: () => void;
  unlock: () => void;
}

const first = !welcomed();

export const useLock = create<Lock>()((set) => ({
  locked: first,
  welcome: first,
  lock: () => set({ locked: true }),
  unlock: () => {
    try {
      localStorage.setItem(WELCOMED_KEY, '1');
    } catch {
      // Storage blocked: the welcome simply shows again next visit.
    }
    set({ locked: false, welcome: false });
  },
}));
