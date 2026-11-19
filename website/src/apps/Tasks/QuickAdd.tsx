import { useState } from 'react';
import { Menu } from './Menu';
import { PRIORITY, PRIORITY_ORDER, dueItems } from './TaskRow';
import { dayTitle, laterToday, parseEntry, timeOf, tomorrowMorning, type ListId, type Priority, type Task } from './store';

type Due = { kind: 'list' } | { kind: 'picked'; at: number | null };

/** The add bar. A date or priority typed in the text is read out of it, unless one was picked by hand. */
export function QuickAdd({ list, now, onAdd }: { list: ListId; now: Date; onAdd: (task: Omit<Task, 'id' | 'done'>) => void }) {
  const [text, setText] = useState('');
  const [pickedPriority, setPickedPriority] = useState<Priority | null>(null);
  const [due, setDue] = useState<Due>({ kind: 'list' });

  const parsed = parseEntry(text, now, { dates: due.kind === 'list', priorities: pickedPriority === null });
  const readDate = due.kind === 'list' && parsed.due !== null;
  // Unless a date is given, a new task lands in the list it was typed into.
  const listDefault = list === 'today' ? laterToday(now) : list === 'upcoming' ? tomorrowMorning(now) : null;
  const deadline = due.kind === 'picked' ? due.at : parsed.due ?? listDefault;
  const priority: Priority = pickedPriority ?? parsed.priority ?? 1;
  const { title } = parsed;

  const submit = () => {
    if (!title) return;
    onAdd({ title, priority, due: deadline });
    setText('');
    setPickedPriority(null);
    setDue({ kind: 'list' });
  };

  const flag = PRIORITY[priority];
  const label = deadline === null ? 'No date' : new Date(deadline).toDateString() === now.toDateString() ? timeOf(deadline) : `${dayTitle(new Date(deadline), now)} ${timeOf(deadline)}`;

  return (
    <form className={`tk-add tint-${list}`} onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <svg className="tk-add-plus" viewBox="0 0 20 20" aria-hidden><circle cx="10" cy="10" r="9" /><path d="M10 6v8M6 10h8" /></svg>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setText(''); setPickedPriority(null); setDue({ kind: 'list' }); }
        }}
        placeholder="New task — try “tomorrow 5pm !!”"
        aria-label="New task"
      />
      <Menu
        label={`Priority: ${flag.label}`}
        className={`tk-flag p${priority}`}
        items={PRIORITY_ORDER.map((p) => ({ label: PRIORITY[p].label, checked: p === priority, onSelect: () => setPickedPriority(p) }))}
      >
        <svg viewBox="0 0 20 20" aria-hidden><path d="M5 17V3.5h9.5l-1.8 3.2 1.8 3.3H5" /></svg>
      </Menu>
      <Menu
        label={readDate ? 'Read from what you typed. Pick a date to keep those words.' : 'Due date'}
        className={`tk-due-btn${readDate ? ' is-read' : ''}${deadline === null ? ' is-none' : ''}`}
        items={dueItems(now, (at) => setDue({ kind: 'picked', at }), due.kind === 'picked' ? due.at : null)}
      >
        {readDate ? '✦ ' : ''}{label}
      </Menu>
    </form>
  );
}
