import { useState } from 'react';
import { useNow } from '../os/useNow';

interface CalEvent {
  title: string;
  at: Date;
  minutes: number;
  color: string;
  call?: string;
}

const DAY_MS = 86_400_000;

// Events are pinned to today relative to the visitor's clock, so there is always something upcoming.
function eventsFor(now: Date): CalEvent[] {
  const QUARTER = 15 * 60_000;
  const nextQuarter = Math.ceil(now.getTime() / QUARTER) * QUARTER;
  const at = (hours: number) => new Date(nextQuarter + hours * 3_600_000);
  return [
    { title: 'Design review', at: at(-2), minutes: 45, color: '#a78bfa' },
    { title: 'Visor stand-up', at: at(0), minutes: 15, color: '#34d399', call: 'Meet' },
    { title: 'Ship the website', at: at(3), minutes: 60, color: '#fb923c' },
  ];
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const hm = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export function Calendar() {
  const now = useNow(60_000);
  const [picked, setPicked] = useState(0);
  const [joined, setJoined] = useState(false);
  const days = Array.from({ length: 6 }, (_, i) => new Date(now.getTime() + (i - 2) * DAY_MS));
  const day = days[picked + 2] ?? now;
  const events = eventsFor(now).filter((e) => sameDay(e.at, day));

  return (
    <div className="calendar">
      <div className="calendar-top">
        <div className="calendar-month">
          <b>{now.toLocaleDateString('en-US', { month: 'short' })}</b>
          <span>{now.getFullYear()}</span>
        </div>
        <div className="calendar-days" role="listbox" aria-label="Days">
          {days.map((d, i) => (
            <button
              key={d.toDateString()}
              role="option"
              aria-selected={i - 2 === picked}
              className={`calendar-day${sameDay(d, now) ? ' is-today' : ''}`}
              onClick={() => setPicked(i - 2)}
            >
              <small>{d.toLocaleDateString('en-US', { weekday: 'short' })}</small>
              <span>{d.getDate()}</span>
            </button>
          ))}
        </div>
      </div>
      {events.length ? (
        <ul className="calendar-events">
          {events.map((e) => (
            <li key={e.title} className={e.at.getTime() + e.minutes * 60_000 < now.getTime() ? 'is-past' : ''}>
              <i style={{ background: e.color }} />
              <span className="calendar-event-title">{e.title}</span>
              {e.call && (
                <button className="calendar-join" onClick={() => setJoined(true)}>
                  {joined ? 'Joined ✓' : `Join ${e.call}`}
                </button>
              )}
              <time>{hm(e.at)}</time>
            </li>
          ))}
        </ul>
      ) : (
        <div className="calendar-empty">
          <b>No events</b>
          <span>Enjoy your free time!</span>
        </div>
      )}
    </div>
  );
}
