import { useState } from 'react';
import { useNow } from '../../../website/src/os/useNow';
import { openTarget, report, showSettings } from '../native';
import { useSettings } from '../settings/store';
import { useEvents, useWeather } from './queries';
import { formatTemperature } from './weather';

const DAY_MS = 86_400_000;
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const hm = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export function Calendar() {
  const now = useNow(60_000);
  const [picked, setPicked] = useState(0);
  const hasFeeds = useSettings((s) => s.calendars.trim() !== '');
  const { data: events, isError } = useEvents();
  const weather = useWeather();
  const days = Array.from({ length: 6 }, (_, i) => new Date(now.getTime() + (i - 2) * DAY_MS));
  const day = days[picked + 2] ?? now;
  const today = (events ?? []).filter((e) => sameDay(e.start, day) || (e.allDay && e.start <= day && e.end > day));

  return (
    <div className="calendar">
      <div className="calendar-top">
        <div className="calendar-month">
          <b>{now.toLocaleDateString(undefined, { month: 'short' })}</b>
          <span>{weather ? `${weather.symbol} ${formatTemperature(weather.temperature)}` : now.getFullYear()}</span>
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
              <small>{d.toLocaleDateString(undefined, { weekday: 'short' })}</small>
              <span>{d.getDate()}</span>
            </button>
          ))}
        </div>
      </div>
      {!hasFeeds ? (
        <button className="calendar-empty" onClick={() => showSettings().catch(report)}>
          <b>No calendars yet</b>
          <span>Add an ICS link in Settings</span>
        </button>
      ) : today.length ? (
        <ul className="calendar-events">
          {today.map((e) => (
            <li key={`${e.uid}-${e.start.getTime()}`} className={e.end < now ? 'is-past' : ''}>
              <i />
              <span className="calendar-event-title">{e.title}</span>
              {e.call && e.end >= now && (
                <button className="calendar-join" onClick={() => e.call && openTarget(e.call.url).catch(report)}>
                  Join {e.call.app}
                </button>
              )}
              <time>{e.allDay ? 'All day' : hm(e.start)}</time>
            </li>
          ))}
        </ul>
      ) : (
        <div className="calendar-empty">
          <b>{isError ? "Couldn't load calendars" : 'No events'}</b>
          <span>{isError ? 'Check the links in Settings' : 'Enjoy your free time!'}</span>
        </div>
      )}
    </div>
  );
}
