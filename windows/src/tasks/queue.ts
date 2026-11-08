export type Priority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  /** Epoch ms, as JSON keeps it; null for no deadline. */
  deadline: number | null;
  createdAt: number;
  completedAt: number | null;
}

const RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
// The alert stays up this long past the deadline, as the Join button does past a call's start.
export const DUE_GRACE = 5 * 60_000;

/** Open tasks in the order the island offers them: priority, then soonest deadline, no deadline last, then oldest. */
export function queue(tasks: Task[]) {
  // Two undated tasks give Infinity − Infinity, NaN, which is falsy, so they fall through to createdAt.
  return tasks
    .filter((t) => t.completedAt === null)
    .sort((a, b) => RANK[a.priority] - RANK[b.priority] || (a.deadline ?? Infinity) - (b.deadline ?? Infinity) || a.createdAt - b.createdAt);
}

/** Whether a task's alert window, from `leadMs` before its deadline to DUE_GRACE after, holds `now`. */
export function isDue(t: Task, now: number, leadMs: number): t is Task & { deadline: number } {
  return t.completedAt === null && t.deadline !== null && now >= t.deadline - leadMs && now <= t.deadline + DUE_GRACE;
}

/** The task to alert about now: of those due, the one with the earliest deadline. */
export function dueTask(tasks: Task[], now: number, leadMs: number) {
  return (
    tasks
      .filter((t) => isDue(t, now, leadMs))
      .sort((a, b) => a.deadline - b.deadline)[0] ?? null
  );
}
