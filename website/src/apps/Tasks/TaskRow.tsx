import { Menu, type MenuItem } from './Menu';
import { dueLabel, firstUrl, laterToday, timeOf, tomorrowMorning, type Priority, type Task } from './store';

export const PRIORITY: Record<Priority, { label: string; marks: string }> = {
  2: { label: 'High', marks: '!!' },
  1: { label: 'Medium', marks: '!' },
  0: { label: 'Low', marks: '' },
};
export const PRIORITY_ORDER: Priority[] = [2, 1, 0];

export function dueItems(now: Date, set: (due: number | null) => void, current: number | null): (MenuItem | 'divider')[] {
  const nextMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (((8 - now.getDay()) % 7) || 7), 9).getTime();
  return [
    { label: `Later today · ${timeOf(laterToday(now))}`, onSelect: () => set(laterToday(now)) },
    { label: `Tomorrow · ${timeOf(tomorrowMorning(now))}`, onSelect: () => set(tomorrowMorning(now)) },
    { label: 'Next week · Monday 9:00 AM', onSelect: () => set(nextMonday) },
    'divider',
    { label: 'No date', onSelect: () => set(null), checked: current === null },
  ];
}

interface Props {
  task: Task;
  now: Date;
  /** Upcoming heads each day already, so its rows show only the time. */
  dayInHeading: boolean;
  completing: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<Omit<Task, 'id'>>) => void;
  onDelete: () => void;
}

export function TaskRow({ task, now, dayInHeading, completing, onToggle, onChange, onDelete }: Props) {
  const looksDone = task.done !== null || completing;
  const priority = PRIORITY[task.priority];
  const url = task.notes ? firstUrl(task.notes) : null;
  const due = task.due !== null ? dueLabel(task.due, now) : null;

  return (
    <li
      className={`tk-row p${task.priority}${looksDone ? ' is-done' : ''}${completing ? ' is-completing' : ''}`}
      draggable={task.done === null}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/x-visor-task', task.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <button type="button" className="tk-check" aria-label={task.done !== null ? 'Restore' : completing ? 'Keep open' : 'Mark done'} aria-pressed={looksDone} onClick={onToggle}>
        <svg viewBox="0 0 20 20" aria-hidden>
          <circle cx="10" cy="10" r="8" />
          <path d="M6.2 10.3l2.6 2.6 5-5.4" />
        </svg>
      </button>
      <div className="tk-main">
        <div className="tk-title-line">
          {!looksDone && priority.marks && <b className="tk-marks" aria-label={`${priority.label} priority`}>{priority.marks}</b>}
          {looksDone
            ? <span className="tk-title">{task.title}</span>
            : <input className="tk-title" value={task.title} aria-label="Task title" onChange={(e) => onChange({ title: e.target.value })} />}
        </div>
        {task.notes && <div className="tk-notes">{task.notes}</div>}
      </div>
      {url && (
        <a className="tk-icon-btn" href={url} target="_blank" rel="noreferrer" aria-label="Open the link in the note" title={new URL(url).host}>
          <svg viewBox="0 0 20 20" aria-hidden><path d="M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5l-1 1M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l1-1" /></svg>
        </a>
      )}
      {task.done !== null ? (
        <time className="tk-when">{relative(task.done, now)}</time>
      ) : due ? (
        <Menu label="Due date" items={dueItems(now, (d) => onChange({ due: d }), task.due)} className={`tk-chip is-${due.urgency}`}>
          {dayInHeading && due.urgency === 'later' && task.due !== null ? timeOf(task.due) : due.text}
        </Menu>
      ) : (
        <Menu label="Add a date" items={dueItems(now, (d) => onChange({ due: d }), null)} className="tk-icon-btn tk-hover">
          <svg viewBox="0 0 20 20" aria-hidden><rect x="3" y="4.5" width="14" height="12" rx="2.5" /><path d="M3 8.5h14M7 3v3M13 3v3" /></svg>
        </Menu>
      )}
      <Menu
        label="More"
        className="tk-icon-btn tk-hover"
        items={[
          ...(task.done === null
            ? [
              ...PRIORITY_ORDER.map((p): MenuItem => ({ label: `${PRIORITY[p].label} priority`, checked: p === task.priority, onSelect: () => onChange({ priority: p }) })),
              'divider' as const,
              ...(task.due !== null ? [{ label: 'Move to Inbox', onSelect: () => onChange({ due: null }) }] : []),
            ]
            : []),
          { label: 'Delete', danger: true, onSelect: onDelete },
        ]}
      >
        <svg viewBox="0 0 20 20" aria-hidden><circle cx="10" cy="10" r="8" /><circle cx="6.5" cy="10" r=".9" /><circle cx="10" cy="10" r=".9" /><circle cx="13.5" cy="10" r=".9" /></svg>
      </Menu>
    </li>
  );
}

function relative(ms: number, now: Date): string {
  const minutes = Math.round((now.getTime() - ms) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}
