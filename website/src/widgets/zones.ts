export function zoned(now: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { h: get('hour') % 24, m: get('minute'), s: get('second') };
}

// Minutes east of UTC, from "GMT+05:30"; plain "GMT" is UTC itself.
function utcOffset(now: Date, tz: string) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(now).find((p) => p.type === 'timeZoneName')?.value ?? '';
  const m = /([+-−])(\d{2}):(\d{2})/.exec(name);
  return m ? (m[1] === '+' ? 1 : -1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

// en-CA formats as YYYY-MM-DD, so calendar dates compare as strings, across month and year ends too.
const ymd = (now: Date, tz: string) => now.toLocaleDateString('en-CA', { timeZone: tz });

export function offsetLabel(now: Date, tz: string, here = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const mins = utcOffset(now, tz) - utcOffset(now, here);
  const a = ymd(now, tz);
  const b = ymd(now, here);
  const when = a === b ? 'Today' : a > b ? 'Tomorrow' : 'Yesterday';
  if (mins === 0) return { when, diff: 'Local' };
  const abs = Math.abs(mins);
  return { when, diff: `${mins > 0 ? '+' : '−'}${Math.floor(abs / 60)}${abs % 60 ? `:${String(abs % 60).padStart(2, '0')}` : ''}` };
}
