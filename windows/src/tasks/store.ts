import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task } from './queue';

interface Tasks {
  tasks: Task[];
  add: (task: Pick<Task, 'title' | 'priority' | 'deadline'>) => void;
  update: (id: string, patch: Partial<Omit<Task, 'id'>>) => void;
  remove: (id: string) => void;
  complete: (id: string) => void;
  clearCompleted: () => void;
}

/** Written by the Tasks window, read by every island, which can only mark one done. */
export const useTasks = create<Tasks>()(
  persist(
    (set) => ({
      tasks: [],
      add: (task) => set((s) => ({ tasks: [...s.tasks, { ...task, id: crypto.randomUUID(), createdAt: Date.now(), completedAt: null }] })),
      update: (id, patch) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      remove: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      complete: (id) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, completedAt: Date.now() } : t)) })),
      clearCompleted: () => set((s) => ({ tasks: s.tasks.filter((t) => t.completedAt === null) })),
    }),
    { name: 'visor-tasks' },
  ),
);

// The Tasks window and every island are separate webviews sharing one localStorage.
window.addEventListener('storage', (e) => {
  if (e.key === 'visor-tasks') void useTasks.persist.rehydrate();
});
