import { useNow } from '../../../website/src/os/useNow';
import { report, showTasks, useSystem } from '../native';
import { useSettings } from '../settings/store';
import { queue } from '../tasks/queue';
import { useTasks } from '../tasks/store';
import { startsIn } from './format';
import { useIsland } from './store';

function when(deadline: number, now: number, hour24: boolean) {
  const d = new Date(deadline);
  const day = d.toDateString() === new Date(now).toDateString() ? {} : { month: 'short', day: 'numeric' } as const;
  return d.toLocaleString(undefined, { ...day, hour: 'numeric', minute: '2-digit', hour12: !hour24 });
}

// Only done and next here: adding and editing happen in the Tasks window, since the island can't take typing.
export function TasksPanel() {
  const tasks = useTasks((s) => s.tasks);
  const complete = useTasks((s) => s.complete);
  const index = useIsland((s) => s.taskIndex);
  const next = useIsland((s) => s.nextTask);
  const lead = useSettings((s) => s.taskAlertLead) * 60_000;
  const hour24 = useSystem((s) => s.hour24);
  const now = useNow(30_000).getTime();
  const list = queue(tasks);
  const task = list[index % list.length];
  const deadline = task?.deadline ?? null;
  const overdue = deadline !== null && now > deadline;
  const soon = deadline !== null && !overdue && now >= deadline - lead;

  return (
    <div className="tasks">
      <div className="tasks-top">
        <b>Tasks</b>
        {list.length > 1 && <span>+{list.length - 1} more</span>}
      </div>
      {task ? (
        <div className={`tasks-card is-${task.priority}`}>
          <i role="img" aria-label={`${task.priority} priority`} />
          <div className="tasks-text">
            <span className="tasks-title">{task.title}</span>
            {deadline !== null && (
              <time className={`tasks-due${overdue ? ' is-overdue' : soon ? ' is-soon' : ''}`} dateTime={new Date(deadline).toISOString()}>
                {overdue ? 'Overdue' : soon ? `Due ${startsIn(deadline, now)}` : `Due ${when(deadline, now, hour24)}`}
              </time>
            )}
          </div>
          <div className="tasks-actions">
            <button aria-label="Done" onClick={() => complete(task.id)}>
              ✓
            </button>
            {list.length > 1 && (
              <button aria-label="Next task" onClick={next}>
                ›
              </button>
            )}
          </div>
        </div>
      ) : (
        <button className="calendar-empty" onClick={() => showTasks().catch(report)}>
          <b>No tasks</b>
          <span>Add a task</span>
        </button>
      )}
    </div>
  );
}
