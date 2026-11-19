import { create } from 'zustand';

// The same rules as the Mac app's Tasks (TodoItem.swift, TaskList.swift,
// QuickEntry.swift), so the demo behaves like the real thing.

export type Priority = 0 | 1 | 2;
export type ListId = 'inbox' | 'today' | 'upcoming' | 'completed';

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  /** Epoch ms, or null for an Inbox task. */
  due: number | null;
  /** Epoch ms it was completed, or null while open. */
  done: number | null;
  notes?: string;
}

export const LISTS: { id: ListId; title: string }[] = [
  { id: 'inbox', title: 'Inbox' },
  { id: 'today', title: 'Today' },
  { id: 'upcoming', title: 'Upcoming' },
  { id: 'completed', title: 'Completed' },
];

const HOUR = 3_600_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const at = (day: Date, hour: number, minute = 0) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute).getTime();
const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

/** Overdue tasks stay in Today rather than vanishing into the past. */
export function listOf(task: Task, now: Date): ListId {
  if (task.done !== null) return 'completed';
  if (task.due === null) return 'inbox';
  return task.due < addDays(startOfDay(now), 1).getTime() ? 'today' : 'upcoming';
}

/** Priority first, then the nearest deadline; undated tasks wait. The notch steps through this order. */
export function queue(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.done === null)
    .sort((a, b) => b.priority - a.priority || (a.due ?? Infinity) - (b.due ?? Infinity));
}

export interface Group {
  id: string;
  title: string | null;
  items: Task[];
}

export function groups(items: Task[], list: ListId, now: Date): Group[] {
  if (!items.length) return [];
  if (list === 'inbox' || list === 'completed') return [{ id: list, title: null, items }];
  if (list === 'today') {
    const overdue = items.filter((t) => (t.due ?? Infinity) < now.getTime());
    const rest = items.filter((t) => !overdue.includes(t));
    return [
      { id: 'overdue', title: 'Overdue', items: overdue },
      // A lone "Today" heading under a "Today" title is noise.
      { id: 'today', title: overdue.length ? 'Today' : null, items: rest },
    ].filter((g) => g.items.length);
  }
  const byDay = new Map<number, Task[]>();
  for (const t of items) {
    const day = startOfDay(new Date(t.due ?? now.getTime())).getTime();
    byDay.set(day, [...(byDay.get(day) ?? []), t]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, dayItems]) => ({ id: String(day), title: dayTitle(new Date(day), now), items: dayItems }));
}

export function dayTitle(day: Date, now: Date): string {
  if (sameDay(day, now)) return 'Today';
  if (sameDay(day, addDays(now, 1))) return 'Tomorrow';
  return day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export const timeOf = (ms: number) => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export type Urgency = 'overdue' | 'soon' | 'later';

/** What a task's date chip says. "Soon" is inside the 15 minute alert lead, as in the app. */
export function dueLabel(due: number, now: Date): { text: string; urgency: Urgency } {
  const left = due - now.getTime();
  if (left < 0) {
    const when = sameDay(new Date(due), now)
      ? timeOf(due)
      : new Date(due).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return { text: `Overdue · ${when}`, urgency: 'overdue' };
  }
  if (left < 15 * 60_000) return { text: `Due in ${Math.max(1, Math.round(left / 60_000))} min`, urgency: 'soon' };
  if (sameDay(new Date(due), now)) return { text: `Due ${timeOf(due)}`, urgency: 'later' };
  return { text: `Due ${dayTitle(new Date(due), now)}, ${timeOf(due)}`, urgency: 'later' };
}

/** 6 pm while it's an hour away, then the next whole hour, never past midnight. */
export function laterToday(now: Date): number {
  const evening = at(now, 18);
  if (evening - now.getTime() >= HOUR) return evening;
  // Local hours, not epoch arithmetic: in a half-hour zone like India's that lands on :30.
  const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1).getTime();
  const candidate = nextHour - now.getTime() < 30 * 60_000 ? nextHour + HOUR : nextHour;
  return Math.min(candidate, addDays(startOfDay(now), 1).getTime() - 60_000);
}

export const tomorrowMorning = (now: Date) => at(addDays(now, 1), 9);

export function todayProgress(tasks: Task[], now: Date): { done: number; total: number } {
  const done = tasks.filter((t) => t.done !== null && sameDay(new Date(t.done), now)).length;
  const left = tasks.filter((t) => listOf(t, now) === 'today').length;
  return { done, total: done + left };
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DANGLING = new Set(['at', 'on', 'by', 'due', 'for']);

export interface Entry {
  title: string;
  due: number | null;
  priority: Priority | null;
}

/**
 * Reads "call the bank tomorrow 5pm !!" as "call the bank", due tomorrow at
 * 5 pm, medium priority. `!` low, `!!` medium, `!!!` high, as in Reminders.
 * Turn `dates` or `priorities` off once one was picked by hand: then those
 * words are the user's, and stay in the title.
 */
export function parseEntry(text: string, now: Date, { dates = true, priorities = true } = {}): Entry {
  const spans: [number, number][] = [];
  const take = (re: RegExp): RegExpExecArray | null => {
    const m = re.exec(text);
    if (m) spans.push([m.index, m.index + m[0].length]);
    return m;
  };

  const bang = priorities ? take(/(?<=^|\s)!{1,3}(?=\s|$)/) : null;
  const priority = bang ? ((bang[0].length - 1) as Priority) : null;

  let day: Date | null = null;
  let evening = false;
  const dayWord = dates && take(/\b(?:(today|tonight|tomorrow)|next week|(?:next\s+)?(sun|mon|tues?|wed(?:nes)?|thu(?:rs?)?|fri|sat(?:ur)?)(?:day)?)\b/i);
  if (dayWord) {
    const word = dayWord[0].toLowerCase();
    if (word === 'today') day = startOfDay(now);
    else if (word === 'tonight') { day = startOfDay(now); evening = true; }
    else if (word === 'tomorrow') day = addDays(now, 1);
    else if (word === 'next week') day = addDays(now, ((8 - now.getDay()) % 7) || 7);
    else {
      const target = WEEKDAYS.findIndex((w) => w.startsWith((dayWord[2] ?? '').toLowerCase().slice(0, 3)));
      const ahead = (target - now.getDay() + 7) % 7 || 7;
      day = addDays(now, ahead);
    }
  }

  let time: [number, number] | null = null;
  const clock = dates && take(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\b(?:at\s+)?(\d{1,2}):(\d{2})\b|\b(?:at\s+)?noon\b/i);
  if (clock) {
    if (/noon/i.test(clock[0])) time = [12, 0];
    else if (clock[3]) {
      const h = Number(clock[1]) % 12 + (clock[3].toLowerCase() === 'pm' ? 12 : 0);
      time = [h, Number(clock[2] ?? 0)];
    } else time = [Number(clock[4]), Number(clock[5])];
    if (time[0] > 23 || time[1] > 59) {
      time = null;
      spans.pop();
    }
  }

  let due: number | null = null;
  if (day && time) due = at(day, ...time);
  else if (day) due = evening ? at(day, 20) : sameDay(day, now) ? laterToday(now) : at(day, 9);
  else if (time) {
    // A bare time that has already gone today means tomorrow.
    const today = at(now, ...time);
    due = today > now.getTime() ? today : at(addDays(now, 1), ...time);
  }

  return { title: strip(text, spans), due, priority };
}

function strip(text: string, spans: [number, number][]): string {
  if (!spans.length) return text.trim();
  let out = text;
  for (const [from, to] of [...spans].sort((a, b) => b[0] - a[0])) out = `${out.slice(0, from)} ${out.slice(to)}`;
  const words = out.split(/\s+/).filter(Boolean);
  // "pay rent by friday" → "pay rent", not "pay rent by".
  while (words.length > 1 && DANGLING.has(words[words.length - 1]?.toLowerCase() ?? '')) words.pop();
  return words.join(' ');
}

export const firstUrl = (text: string) => /https?:\/\/[^\s]+/.exec(text)?.[0] ?? null;

/** Pinned to the visitor's clock, so every list has something in it. */
export function seed(now: Date): Task[] {
  const t = now.getTime();
  const yesterday = addDays(now, -1);
  const id = (n: number) => `seed-${n}`;
  return [
    { id: id(1), title: 'Send invoice to Acme', priority: 2, due: at(yesterday, 17), done: null, notes: 'Net 30, PDF in Drive https://example.com/invoice-114' },
    { id: id(2), title: 'Call the bank about the card', priority: 2, due: laterToday(now), done: null },
    { id: id(3), title: 'Review the onboarding PR', priority: 1, due: t + 9 * 60_000, done: null },
    { id: id(4), title: 'Water the plants', priority: 0, due: Math.min(laterToday(now) + HOUR, addDays(startOfDay(now), 1).getTime() - 60_000), done: null },
    { id: id(5), title: 'Book the dentist', priority: 0, due: at(addDays(now, 1), 10), done: null },
    { id: id(6), title: 'Renew passport photos', priority: 1, due: at(addDays(now, 2), 13), done: null },
    { id: id(7), title: 'Plan the Q1 roadmap', priority: 2, due: at(addDays(now, 4), 16), done: null, notes: 'Draft themes before Monday’s sync' },
    { id: id(8), title: 'Read the Swift concurrency notes', priority: 0, due: null, done: null },
    { id: id(9), title: 'Clean up Downloads', priority: 1, due: null, done: null },
    { id: id(10), title: 'Pay the electricity bill', priority: 1, due: t - 3 * HOUR, done: t - HOUR },
    { id: id(11), title: 'Reply to Sam', priority: 0, due: null, done: t - 26 * HOUR },
  ];
}

export type SyncState = 'off' | 'syncing' | 'synced';

interface Tasks {
  tasks: Task[];
  sync: SyncState;
  add: (task: Omit<Task, 'id' | 'done'>) => void;
  update: (id: string, patch: Partial<Omit<Task, 'id'>>) => void;
  setDone: (ids: string[], done: boolean) => void;
  remove: (ids: string[]) => Task[];
  restore: (tasks: Task[]) => void;
  toggleSync: () => void;
}

let syncTimer: ReturnType<typeof setTimeout> | undefined;

/** Shared by the Tasks window and the notch panel. This visit only, like the shelf. */
export const useTasks = create<Tasks>()((set, get) => ({
  tasks: seed(new Date()),
  sync: 'off',
  add: (task) => set((s) => ({ tasks: [...s.tasks, { ...task, id: crypto.randomUUID(), done: null }] })),
  update: (id, patch) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
  setDone: (ids, done) => set((s) => ({
    tasks: s.tasks.map((t) => (ids.includes(t.id) ? { ...t, done: done ? Date.now() : null } : t)),
  })),
  remove: (ids) => {
    const removed = get().tasks.filter((t) => ids.includes(t.id));
    set((s) => ({ tasks: s.tasks.filter((t) => !ids.includes(t.id)) }));
    return removed;
  },
  restore: (tasks) => set((s) => ({ tasks: [...s.tasks, ...tasks] })),
  toggleSync: () => {
    clearTimeout(syncTimer);
    if (get().sync !== 'off') return set({ sync: 'off' });
    set({ sync: 'syncing' });
    // The real sync is a fetch and a save; this just shows the states.
    syncTimer = setTimeout(() => set({ sync: 'synced' }), 900);
  },
}));
