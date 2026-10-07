import { useNow } from '../../os/useNow';
import './Calendar.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Events on fixed days of the current month, so the grid always looks like a working calendar.
const EVENTS: Record<number, { title: string; color: string }[]> = {
  2: [{ title: 'Visor 3.1 retro', color: '#a78bfa' }],
  8: [{ title: 'Visor 3.4.0 release', color: '#fb923c' }, { title: 'Visor stand-up', color: '#34d399' }],
  12: [{ title: 'Design review', color: '#a78bfa' }],
  17: [{ title: 'Website polish', color: '#60a5fa' }],
  23: [{ title: 'Visor stand-up', color: '#34d399' }],
  28: [{ title: 'Ship the next release', color: '#fb923c' }],
};

export function Calendar() {
  const now = useNow(60_000);
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((first + days) / 7) * 7 }, (_, i) => i - first + 1);
  return (
    <div className="cal">
      <header><h1><b>{now.toLocaleDateString('en-US', { month: 'long' })}</b> {year}</h1></header>
      <div className="cal-grid">
        {WEEKDAYS.map((d) => <div key={d} className="cal-wd">{d}</div>)}
        {cells.map((d, i) => (
          <div key={i} className={`cal-cell${d < 1 || d > days ? ' is-out' : ''}`}>
            {d >= 1 && d <= days && (
              <>
                <span className={d === now.getDate() ? 'cal-today' : ''}>{d}</span>
                {(EVENTS[d] ?? []).map((e) => <i key={e.title} style={{ '--c': e.color } as React.CSSProperties}>{e.title}</i>)}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
