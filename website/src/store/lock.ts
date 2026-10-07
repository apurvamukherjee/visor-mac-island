import { create } from 'zustand';

interface Lock {
  locked: boolean;
  lock: () => void;
  unlock: () => void;
}

export const useLock = create<Lock>()((set) => ({
  locked: false,
  lock: () => set({ locked: true }),
  unlock: () => set({ locked: false }),
}));
