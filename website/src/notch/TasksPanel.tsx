import { useState } from 'react';
import { dueLabel, queue, todayProgress, useTasks } from '../apps/Tasks/store';
import { useNow } from '../os/useNow';
import { useWindows } from '../store/windows';

const MARKS = ['', '!', '!!'] as const;

/** One task at a time beside the player, in the calendar's slot, as in Visor. */
export function TasksPanel() {
  const now = useNow(30_000);
  const tasks = useTasks((s) => s.tasks);
  const setDone = useTasks((s) => s.setDone);
  const [step, setStep] = useState(0);
  const items = queue(tasks);
  const item = items.length ? items[step % items.length] : undefined;
  const progress = todayProgress(tasks, now);
  const openWindow = () => useWindows.getState().open('tasks');
  const due = item?.due != null ? dueLabel(item.due, now) : null;

  return (
    <div className="tasks-panel">
      <div className="tasks-panel-top">
        <b>Tasks</b>
        {items.length > 1 && <span className="tasks-panel-more">+{items.length - 1} more</span>}
        <span className="spacer" />
        {progress.total > 0 && (
          <span className="tasks-ring" title={`${progress.done} of ${progress.total} done today`}>
            <svg viewBox="0 0 16 16" aria-hidden>
              <circle cx="8" cy="8" r="6" />
              <circle
                cx="8" cy="8" r="6"
                className={progress.done === progress.total ? 'is-full' : ''}
                pathLength={1}
                strokeDasharray={`${progress.done / progress.total} 1`}
              />
            </svg>
            {progress.done}/{progress.total}
          </span>
        )}
        <button className="tasks-panel-btn" aria-label="Open Visor Tasks" onClick={openWindow}>
          <svg viewBox="0 0 16 16" aria-hidden><path d="M8 3v10M3 8h10" /></svg>
        </button>
      </div>
      {item ? (
        <div className={`tasks-card p${item.priority}`} key={item.id}>
          <i aria-hidden />
          <div className="tasks-card-main">
            <div className="tasks-card-title">
              {MARKS[item.priority] && <b>{MARKS[item.priority]} </b>}
              {item.title}
            </div>
            <small className={due ? `is-${due.urgency}` : ''}>{due ? due.text : ['Low', 'Medium', 'High'][item.priority]}</small>
          </div>
          <div className="tasks-card-actions">
            <button className="tasks-panel-btn" aria-label="Mark done" onClick={() => setDone([item.id], true)}>
              <svg viewBox="0 0 16 16" aria-hidden><path d="M3.5 8.5l3 3 6-7" /></svg>
            </button>
            {items.length > 1 && (
              <button className="tasks-panel-btn" aria-label="Next task" onClick={() => setStep((s) => s + 1)}>
                <svg viewBox="0 0 16 16" aria-hidden><path d="M6 3.5L10.5 8 6 12.5" /></svg>
              </button>
            )}
          </div>
        </div>
      ) : (
        <button className="tasks-empty" onClick={openWindow}>
          <b>All done</b>
          <span>Add a task</span>
        </button>
      )}
    </div>
  );
}
