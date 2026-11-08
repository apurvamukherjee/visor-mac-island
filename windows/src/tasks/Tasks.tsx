import { useState } from 'react';
import { useSystem } from '../native';
import { Group } from '../settings/Settings';
import { queue, type Priority, type Task } from './queue';
import { useTasks } from './store';
import './Tasks.css';

const PRIORITIES: { id: Priority; label: string }[] = [
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
];

// datetime-local speaks local wall time with no zone, so the offset is applied by hand both ways.
const toInput = (ms: number | null) => {
  if (ms === null) return '';
  const d = new Date(ms);
  return new Date(ms - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const fromInput = (value: string) => (value ? new Date(value).getTime() : null);

function PrioritySelect({ value, onChange }: { value: Priority; onChange: (p: Priority) => void }) {
  return (
    <select
      value={value}
      aria-label="Priority"
      onChange={(e) => {
        const picked = PRIORITIES.find((p) => p.id === e.target.value);
        if (picked) onChange(picked.id);
      }}
    >
      {PRIORITIES.map((p) => (
        <option key={p.id} value={p.id}>
          {p.label}
        </option>
      ))}
    </select>
  );
}

function AddTask() {
  const add = useTasks((s) => s.add);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [deadline, setDeadline] = useState('');
  return (
    <form
      className="group-card task-add"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        add({ title: title.trim(), priority, deadline: fromInput(deadline) });
        setTitle('');
        setDeadline('');
      }}
    >
      <input type="text" className="task-title" placeholder="New task" aria-label="Title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
      <PrioritySelect value={priority} onChange={setPriority} />
      <input type="datetime-local" aria-label="Deadline" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      <button className="button is-primary" disabled={!title.trim()}>
        Add
      </button>
    </form>
  );
}

// Uncontrolled: only this window edits a task's text, and a controlled date field would be reset mid-typing on any render.
function OpenRow({ task }: { task: Task }) {
  const { update, complete, remove } = useTasks();
  return (
    <div className={`row task-row is-${task.priority}`}>
      <button className="task-check" aria-label={`Done: ${task.title}`} onClick={() => complete(task.id)} />
      <input
        type="text"
        className="task-title"
        aria-label="Title"
        defaultValue={task.title}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        onBlur={(e) => {
          const title = e.target.value.trim();
          if (!title) e.target.value = task.title;
          else if (title !== task.title) update(task.id, { title });
        }}
      />
      <PrioritySelect value={task.priority} onChange={(priority) => update(task.id, { priority })} />
      <input
        type="datetime-local"
        aria-label="Deadline"
        defaultValue={toInput(task.deadline)}
        // A half-typed date reads as empty; only a whole one, or a cleared field, is saved.
        onChange={(e) => {
          if (!e.target.validity.badInput) update(task.id, { deadline: fromInput(e.target.value) });
        }}
      />
      <button className="task-icon" aria-label={`Delete ${task.title}`} onClick={() => remove(task.id)}>
        ✕
      </button>
    </div>
  );
}

export function Tasks() {
  const accent = useSystem((s) => s.accent);
  const { tasks, update, remove, clearCompleted } = useTasks();
  const open = queue(tasks);
  const done = tasks.filter((t) => t.completedAt !== null).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  return (
    <div className="settings tasks-window" style={{ '--accent': accent } as React.CSSProperties}>
      <main className="pane">
        <header>
          <h1>Tasks</h1>
          <p>The top one shows in the island, beside the player.</p>
        </header>
        <AddTask />
        <Group title="To do">
          {open.length ? (
            open.map((t) => <OpenRow key={t.id} task={t} />)
          ) : (
            <div className="row">
              <span className="row-text">
                Nothing to do<small>Add a task above.</small>
              </span>
            </div>
          )}
        </Group>
        {done.length > 0 && (
          <details className="group task-done">
            <summary>Completed ({done.length})</summary>
            <div className="group-card">
              {done.map((t) => (
                <div key={t.id} className="row task-row">
                  <button className="task-check is-done" aria-label={`Not done: ${t.title}`} onClick={() => update(t.id, { completedAt: null })} />
                  <span className="task-title">{t.title}</span>
                  <button className="task-icon" aria-label={`Delete ${t.title}`} onClick={() => remove(t.id)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button className="button" onClick={clearCompleted}>
              Clear completed
            </button>
          </details>
        )}
      </main>
    </div>
  );
}
