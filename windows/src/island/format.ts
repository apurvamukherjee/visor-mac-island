/** A clock reading for a track, a countdown or a timer: 0:42, 3:35, 1:01:40. Hours only once there are some. */
export function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Battery time left as Windows estimates it: "45 min", "3 h 20 min". */
export function duration(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
}

/** How soon a call starts, for the closed island's Join pill: "in 2 min", then "now". */
export function startsIn(start: number, now: number) {
  const min = Math.ceil((start - now) / 60_000);
  return min > 0 ? `in ${min} min` : 'now';
}
