export interface CalEvent {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  /** A video call link found in the event, for the Join button. */
  call: { url: string; app: string } | null;
}

interface Prop {
  params: Record<string, string>;
  value: string;
}

const DAY_MS = 86_400_000;
const MAX_OCCURRENCES = 5000;
const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// The call services MeetingMonitor recognizes, by the link each puts in an invite.
const CALLS: [RegExp, string][] = [
  [/https:\/\/[\w.-]*zoom\.us\/(j|my|w)\/[^\s"<>\\]+/, 'Zoom'],
  [/https:\/\/meet\.google\.com\/[a-z-]+/, 'Meet'],
  [/https:\/\/teams\.(microsoft|live)\.com\/(l\/meetup-join|meet)\/[^\s"<>\\]+/, 'Teams'],
  [/https:\/\/[\w.-]*webex\.com\/[^\s"<>\\]+/, 'Webex'],
  [/https:\/\/whereby\.com\/[^\s"<>\\]+/, 'Whereby'],
  [/https:\/\/app\.slack\.com\/huddle\/[^\s"<>\\]+/, 'Slack'],
];

export function findCall(...texts: string[]) {
  for (const text of texts) {
    for (const [pattern, app] of CALLS) {
      const url = text.match(pattern)?.[0];
      if (url) return { url, app };
    }
  }
  return null;
}

const unescape = (text: string) => text.replace(/\\([nN]|[,;\\])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c));

function parseLine(line: string): [string, Prop] {
  // The value starts at the first colon outside a quoted parameter.
  let quoted = false;
  let colon = -1;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') quoted = !quoted;
    else if (line[i] === ':' && !quoted) {
      colon = i;
      break;
    }
  }
  const [name = '', ...rawParams] = line.slice(0, colon).split(';');
  const params: Record<string, string> = {};
  for (const p of rawParams) {
    const [k = '', v = ''] = p.split('=');
    params[k.toUpperCase()] = v.replace(/^"|"$/g, '');
  }
  return [name.toUpperCase(), { params, value: line.slice(colon + 1) }];
}

/** Milliseconds `zone` is ahead of UTC at `instant`. */
function zoneOffset(instant: number, zone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second')) - instant;
}

export function parseDate({ value, params }: Prop): { date: Date; allDay: boolean } {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/);
  if (!m) throw new Error(`Unreadable calendar date: ${value}`);
  const [y = 0, mo = 1, d = 1, h = 0, mi = 0, s = 0] = m.slice(1, 7).map((x) => Number(x ?? 0));
  if (m[4] === undefined) return { date: new Date(y, mo - 1, d), allDay: true };
  if (m[7]) return { date: new Date(Date.UTC(y, mo - 1, d, h, mi, s)), allDay: false };
  const zone = params.TZID;
  if (zone) {
    try {
      // Wall time in the zone: guess it as UTC, then take the zone's offset back off.
      const guess = Date.UTC(y, mo - 1, d, h, mi, s);
      return { date: new Date(guess - zoneOffset(guess, zone)), allDay: false };
    } catch {
      // ponytail: Outlook's Windows zone names ("Pacific Standard Time") aren't IANA; they read as local time.
    }
  }
  return { date: new Date(y, mo - 1, d, h, mi, s), allDay: false };
}

function parseDuration(text: string) {
  const m = text.match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return 0;
  const [w = 0, d = 0, h = 0, mi = 0, s = 0] = m.slice(2).map((x) => Number(x ?? 0));
  return (m[1] === '-' ? -1 : 1) * ((((w * 7 + d) * 24 + h) * 60 + mi) * 60 + s) * 1000;
}

/** Starts of each occurrence between `from` and `to`. Covers the rules calendars send for meetings. */
// ponytail: DAILY/WEEKLY(+BYDAY)/MONTHLY(by date)/YEARLY; BYSETPOS and "2nd Tuesday" rules show only their first date.
export function occurrences(start: Date, rule: string, exdates: Set<number>, from: Date, to: Date): Date[] {
  const r = Object.fromEntries(rule.split(';').map((p) => p.split('=') as [string, string]));
  const interval = Number(r.INTERVAL ?? 1);
  const count = r.COUNT ? Number(r.COUNT) : Infinity;
  const until = r.UNTIL ? parseDate({ value: r.UNTIL, params: {} }).date.getTime() : Infinity;
  const days = r.BYDAY?.split(',').filter((d) => /^[A-Z]{2}$/.test(d)).map((d) => WEEKDAYS.indexOf(d));
  if (r.BYDAY && !days?.length) return start >= from && start <= to ? [start] : [];

  const out: Date[] = [];
  let seen = 0;
  const take = (d: Date) => {
    if (d < start || d.getTime() > until || seen >= count) return false;
    seen++;
    if (d >= from && d <= to && !exdates.has(d.getTime())) out.push(d);
    return true;
  };
  const at = (base: Date, addDays: number, addMonths = 0) =>
    new Date(base.getFullYear(), base.getMonth() + addMonths, base.getDate() + addDays, base.getHours(), base.getMinutes(), base.getSeconds());

  for (let i = 0; seen < count && i < MAX_OCCURRENCES; i++) {
    let step: Date;
    if (r.FREQ === 'WEEKLY' && days?.length) {
      // Each week from the start's Sunday, every weekday the rule names.
      const week = at(start, i * 7 * interval - start.getDay());
      if (week.getTime() > Math.min(until, to.getTime()) + 7 * DAY_MS) break;
      for (const day of [...days].sort()) take(at(week, day));
      continue;
    }
    if (r.FREQ === 'DAILY') step = at(start, i * interval);
    else if (r.FREQ === 'WEEKLY') step = at(start, i * 7 * interval);
    else if (r.FREQ === 'MONTHLY') step = at(start, 0, i * interval);
    else if (r.FREQ === 'YEARLY') step = at(start, 0, i * 12 * interval);
    else break;
    if (step.getTime() > Math.min(until, to.getTime())) break;
    take(step);
  }
  return out;
}

/** Every event in an ICS feed that touches [from, to], recurring ones expanded. */
export function parseIcs(text: string, from: Date, to: Date): CalEvent[] {
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const all: Map<string, Prop[]>[] = [];
  let props: Map<string, Prop[]> | null = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') props = new Map();
    else if (line === 'END:VEVENT' && props) {
      all.push(props);
      props = null;
    } else if (props && line.includes(':')) {
      const [name, prop] = parseLine(line);
      props.set(name, [...(props.get(name) ?? []), prop]);
    }
  }

  // A moved or cancelled occurrence comes as its own event naming the slot it replaces;
  // that slot leaves the series, and the moved one shows as a one-off.
  const replaced = new Map<string, number[]>();
  for (const p of all) {
    const id = p.get('RECURRENCE-ID')?.[0];
    const uid = p.get('UID')?.[0]?.value ?? '';
    if (id) replaced.set(uid, [...(replaced.get(uid) ?? []), parseDate(id).date.getTime()]);
  }
  return all
    .flatMap((p) => expand(p, from, to, replaced.get(p.get('UID')?.[0]?.value ?? '') ?? []))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

function expand(props: Map<string, Prop[]>, from: Date, to: Date, replaced: number[]): CalEvent[] {
  const one = (name: string) => props.get(name)?.[0];
  const startProp = one('DTSTART');
  if (!startProp || one('STATUS')?.value === 'CANCELLED') return [];
  const { date: start, allDay } = parseDate(startProp);
  const endProp = one('DTEND');
  const length = endProp
    ? parseDate(endProp).date.getTime() - start.getTime()
    : one('DURATION')
      ? parseDuration(one('DURATION')?.value ?? '')
      : allDay
        ? DAY_MS
        : 0;

  const text = (name: string) => unescape(one(name)?.value ?? '');
  const base = {
    uid: text('UID'),
    title: text('SUMMARY') || 'Untitled event',
    allDay,
    call: findCall(text('URL'), text('LOCATION'), text('DESCRIPTION'), one('X-GOOGLE-CONFERENCE')?.value ?? ''),
  };
  const exdates = new Set([
    ...replaced,
    ...(props.get('EXDATE') ?? []).flatMap((p) => p.value.split(',').map((value) => parseDate({ value, params: p.params }).date.getTime())),
  ]);
  const rule = one('RECURRENCE-ID') ? undefined : one('RRULE')?.value;
  // Widened by the event's length, so one that started before `from` and is still on shows.
  const starts = rule
    ? occurrences(start, rule, exdates, new Date(from.getTime() - length), to)
    : start.getTime() + length >= from.getTime() && start <= to
      ? [start]
      : [];
  return starts.map((s) => ({ ...base, start: s, end: new Date(s.getTime() + length) }));
}
