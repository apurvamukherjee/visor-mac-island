import { useEffect, useRef, useState } from 'react';
import { useNotch } from '../../notch/store';
import { useNow } from '../../os/useNow';
import { QuickAdd } from './QuickAdd';
import { TaskRow } from './TaskRow';
import { LISTS, groups, laterToday, listOf, queue, todayProgress, tomorrowMorning, useTasks, type ListId, type Task } from './store';
import './Tasks.css';

// How long a ticked task shows its checkmark before moving to Completed, as in the app.
const COMPLETE_DELAY_MS = 650;
const TOAST_MS = 5000;

const ICONS: Record<ListId, string> = {
  inbox: 'M3 11.5 5.5 4h9l2.5 7.5V16H3zm0 0h4l1 2h4l1-2h4',
  today: 'M10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4',
  upcoming: 'M3 6.5A2.5 2.5 0 0 1 5.5 4h9A2.5 2.5 0 0 1 17 6.5v8a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 3 14.5zM3 8.5h14M7 2.5v3M13 2.5v3',
  completed: 'M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM6.5 10.2l2.4 2.4 4.6-5',
};

interface Toast {
  id: number;
  message: string;
  undo: () => void;
}

export function Tasks() {
  const now = useNow(30_000);
  const { tasks, add, update, setDone, remove, restore, sync, toggleSync } = useTasks();
  const [chosen, setChosen] = useState<ListId | null>(null);
  const [completing, setCompleting] = useState<string[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [dropTarget, setDropTarget] = useState<ListId | null>(null);
  const pending = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const toastCount = useRef(0);

  // The notch shows tasks while their window is open, the way you'd set it up in the app.
  useEffect(() => {
    useNotch.getState().setPanel('tasks');
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const timers = pending.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const open = queue(tasks);
  const byList = (id: ListId) => open.filter((t) => listOf(t, now) === id);
  const list = chosen ?? (byList('today').length ? 'today' : 'inbox');
  const items = list === 'completed'
    ? tasks.filter((t) => t.done !== null).sort((a, b) => (b.done ?? 0) - (a.done ?? 0))
    : byList(list);
  const overdue = byList('today').filter((t) => (t.due ?? Infinity) < now.getTime());

  const show = (message: string, undo: () => void) => setToast({ id: ++toastCount.current, message, undo });
  const quote = (ts: Task[]) => (ts.length === 1 ? `“${ts[0]?.title ?? ''}”` : `${ts.length} tasks`);

  const complete = (ids: string[]) => {
    const done = tasks.filter((t) => ids.includes(t.id));
    if (!done.length) return;
    setDone(ids, true);
    show(`Completed ${quote(done)}`, () => setDone(ids, false));
  };

  // Open tasks show their checkmark first; a second click in that moment keeps them open.
  const toggle = (task: Task) => {
    if (task.done !== null) return setDone([task.id], false);
    const timer = pending.current.get(task.id);
    if (timer) {
      clearTimeout(timer);
      pending.current.delete(task.id);
      return setCompleting((c) => c.filter((id) => id !== task.id));
    }
    setCompleting((c) => [...c, task.id]);
    pending.current.set(task.id, setTimeout(() => {
      pending.current.delete(task.id);
      setCompleting((c) => c.filter((id) => id !== task.id));
      complete([task.id]);
    }, COMPLETE_DELAY_MS));
  };

  const destroy = (ids: string[]) => {
    const removed = remove(ids);
    if (removed.length) show(`Deleted ${quote(removed)}`, () => restore(removed));
  };

  /** A task dropped on a list takes that list's kind of date. */
  const moveTo = (id: string, target: ListId) => {
    setDropTarget(null);
    const task = tasks.find((t) => t.id === id);
    if (!task || listOf(task, now) === target) return;
    if (target === 'completed') return complete([id]);
    update(id, { done: null, due: target === 'inbox' ? null : target === 'today' ? laterToday(now) : tomorrowMorning(now) });
  };

  return (
    <div className="tk">
      <nav className="tk-side" aria-label="Lists">
        {LISTS.map((l) => {
          const count = l.id === 'completed' ? 0 : byList(l.id).length;
          return (
            <button
              key={l.id}
              type="button"
              className={`tk-side-item tint-${l.id}${list === l.id ? ' is-active' : ''}${dropTarget === l.id ? ' is-drop' : ''}`}
              aria-current={list === l.id}
              onClick={() => setChosen(l.id)}
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes('text/x-visor-task')) return;
                e.preventDefault();
                setDropTarget(l.id);
              }}
              onDragLeave={() => setDropTarget((d) => (d === l.id ? null : d))}
              onDrop={(e) => {
                e.preventDefault();
                moveTo(e.dataTransfer.getData('text/x-visor-task'), l.id);
              }}
            >
              <svg viewBox="0 0 20 20" aria-hidden><path d={ICONS[l.id]} /></svg>
              <span>{l.title}</span>
              {count > 0 && <b className={l.id === 'today' && overdue.length ? 'is-alert' : ''}>{count}</b>}
            </button>
          );
        })}
        <p className="tk-side-hint">Drag a task onto a list to re-date it.</p>
      </nav>

      <section className="tk-detail">
        <button type="button" className={`tk-sync is-${sync}`} onClick={toggleSync} title={sync === 'off' ? 'Sync with Apple Reminders' : 'Turn Reminders sync off'}>
          <svg viewBox="0 0 20 20" aria-hidden className={sync === 'syncing' ? 'is-spinning' : ''}><path d="M15.5 8A6 6 0 0 0 4.7 6.2M4.5 12a6 6 0 0 0 10.8 1.8M4.5 3v3.5H8M15.5 17v-3.5H12" /></svg>
          {sync === 'off' ? 'Sync with Reminders' : sync === 'syncing' ? 'Syncing…' : 'Synced'}
        </button>

        <Header list={list} items={items} tasks={tasks} now={now} />
        {list !== 'completed' && <QuickAdd key={list} list={list} now={now} onAdd={add} />}

        {items.length === 0 ? (
          <div className="tk-empty">
            <svg viewBox="0 0 20 20" aria-hidden className={`tint-${list}`}><path d={ICONS[list]} /></svg>
            <b>{LISTS.find((l) => l.id === list)?.title}</b>
            <span>{EMPTY[list]}</span>
          </div>
        ) : (
          <div className="tk-scroll">
            {groups(items, list, now).map((g) => (
              <div key={g.id}>
                {g.title && (
                  <h3 className={`tk-group${g.id === 'overdue' ? ' is-overdue' : ''}`}>
                    {g.title}<span>{g.items.length}</span>
                    {g.id === 'overdue' && (
                      <button type="button" onClick={() => g.items.forEach((t) => update(t.id, { due: laterToday(now) }))}>Move to Today</button>
                    )}
                  </h3>
                )}
                <ul className="tk-rows">
                  {g.items.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      now={now}
                      dayInHeading={list === 'upcoming'}
                      completing={completing.includes(t.id)}
                      onToggle={() => toggle(t)}
                      onChange={(patch) => update(t.id, patch)}
                      onDelete={() => destroy([t.id])}
                    />
                  ))}
                </ul>
              </div>
            ))}
            {list === 'completed' && (
              <button type="button" className="tk-clear" onClick={() => destroy(items.map((t) => t.id))}>Clear completed</button>
            )}
          </div>
        )}

        {toast && (
          <div key={toast.id} className="tk-toast" role="status">
            {toast.message}
            <button type="button" onClick={() => { toast.undo(); setToast(null); }}>Undo</button>
          </div>
        )}
      </section>
    </div>
  );
}

const EMPTY: Record<ListId, string> = {
  inbox: 'Tasks without a date land here.',
  today: 'Nothing due today. Type a task above, like “Call the bank 5pm”.',
  upcoming: 'Tasks dated after today show up here, grouped by day.',
  completed: 'Finished tasks land here. Click one’s checkmark to bring it back.',
};

function Header({ list, items, tasks, now }: { list: ListId; items: Task[]; tasks: Task[]; now: Date }) {
  const n = items.length;
  const plural = (count: number) => `${count} ${count === 1 ? 'task' : 'tasks'}`;
  let subtitle: string;
  if (list === 'today') {
    const date = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    const overdue = items.filter((t) => (t.due ?? Infinity) < now.getTime()).length;
    subtitle = n ? `${date} · ${plural(n)} left${overdue ? ` · ${overdue} overdue` : ''}` : `${date} · All clear`;
  } else if (list === 'inbox') subtitle = `${plural(n)} without a date`;
  else if (list === 'upcoming') subtitle = `${plural(n)} ahead`;
  else subtitle = `${plural(n)} done · ${items.filter((t) => t.done !== null && new Date(t.done).toDateString() === now.toDateString()).length} today`;
  const progress = todayProgress(tasks, now);

  return (
    <header className={`tk-header tint-${list}`}>
      <h1>{LISTS.find((l) => l.id === list)?.title}</h1>
      <p>{subtitle}</p>
      {list === 'today' && progress.total > 0 && (
        <div className="tk-progress" role="progressbar" aria-label="Done today" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
          <i style={{ transform: `scaleX(${progress.done / progress.total})` }} />
        </div>
      )}
    </header>
  );
}
