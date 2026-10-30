import { expect, test } from 'vitest';
import { findCall, parseDate, parseIcs, type CalEvent } from './ics';

const span = (e?: CalEvent) => (e ? e.end.getTime() - e.start.getTime() : NaN);

const feed = (...events: string[]) =>
  ['BEGIN:VCALENDAR', ...events.map((e) => `BEGIN:VEVENT\r\n${e}\r\nEND:VEVENT`), 'END:VCALENDAR'].join('\r\n');

const from = new Date(2026, 9, 26);
const to = new Date(2026, 10, 2);

test('a one-off event with a folded description and a Zoom link', () => {
  const [e] = parseIcs(
    feed('UID:1\r\nSUMMARY:Design\\, review\r\nDTSTART:20261027T150000Z\r\nDTEND:20261027T154500Z\r\nDESCRIPTION:Join https://acme.zoom.us/j/12\r\n 345?pwd=x'),
    from,
    to,
  );
  expect(e?.title).toBe('Design, review');
  expect(e?.start.toISOString()).toBe('2026-10-27T15:00:00.000Z');
  expect(span(e)).toBe(45 * 60_000);
  expect(e?.call).toEqual({ url: 'https://acme.zoom.us/j/12345?pwd=x', app: 'Zoom' });
});

test("a TZID wall time becomes the right instant, Outlook's Windows zone names too", () => {
  const { date } = parseDate({ value: '20261027T090000', params: { TZID: 'America/New_York' } });
  expect(date.toISOString()).toBe('2026-10-27T13:00:00.000Z');
  const india = parseDate({ value: '20261027T090000', params: { TZID: 'India Standard Time' } }).date;
  expect(india.toISOString()).toBe('2026-10-27T03:30:00.000Z');
  const pacific = parseDate({ value: '20260701T090000', params: { TZID: 'Pacific Standard Time' } }).date;
  expect(pacific.toISOString()).toBe('2026-07-01T16:00:00.000Z');
});

test('weekly on two weekdays, minus an excluded date', () => {
  const events = parseIcs(
    feed('UID:2\r\nSUMMARY:Stand-up\r\nDTSTART:20261005T090000\r\nDURATION:PT15M\r\nRRULE:FREQ=WEEKLY;BYDAY=MO,WE\r\nEXDATE:20261028T090000'),
    from,
    to,
  );
  expect(events.map((e) => e.start.getDate())).toEqual([26]);
  expect(events[0]?.call).toBeNull();
});

test('daily with COUNT stops, a cancelled event is skipped, a moved occurrence shows at its new time only', () => {
  const events = parseIcs(
    feed(
      'UID:3\r\nSUMMARY:Sprint\r\nDTSTART:20261025T100000\r\nDTEND:20261025T110000\r\nRRULE:FREQ=DAILY;COUNT=3',
      'UID:4\r\nSUMMARY:Gone\r\nSTATUS:CANCELLED\r\nDTSTART:20261027T100000',
      'UID:3\r\nRECURRENCE-ID:20261026T100000\r\nSUMMARY:Moved\r\nDTSTART:20261026T140000',
      'UID:3\r\nRECURRENCE-ID:20261027T100000\r\nSTATUS:CANCELLED\r\nDTSTART:20261027T100000',
    ),
    from,
    to,
  );
  expect(events.map((e) => [e.title, e.start.getDate(), e.start.getHours()])).toEqual([
    ['Moved', 26, 14],
  ]);
});

test('an unreadable event is left out, not the whole feed', () => {
  const events = parseIcs(feed('UID:6\r\nSUMMARY:Broken\r\nDTSTART:soon', 'UID:7\r\nSUMMARY:Fine\r\nDTSTART:20261028T100000Z'), from, to);
  expect(events.map((e) => e.title)).toEqual(['Fine']);
});

test('a daily series from long ago still shows today', () => {
  const events = parseIcs(feed('UID:8\r\nSUMMARY:Stand-up\r\nDTSTART:20000103T093000\r\nRRULE:FREQ=DAILY;INTERVAL=2'), from, to);
  expect(events.map((e) => e.start.getDate())).toEqual([27, 29, 31]);
  expect(events[0]?.start.getHours()).toBe(9);
});

test('all-day events last the day', () => {
  const [e] = parseIcs(feed('UID:5\r\nSUMMARY:Holiday\r\nDTSTART;VALUE=DATE:20261030'), from, to);
  expect(e?.allDay).toBe(true);
  expect(span(e)).toBe(86_400_000);
});

test('Meet and Teams links are found', () => {
  expect(findCall('', 'https://meet.google.com/abc-defg-hij')?.app).toBe('Meet');
  expect(findCall('https://teams.microsoft.com/l/meetup-join/19%3ameeting')?.app).toBe('Teams');
});

test('monthly by weekday: Google\'s 2TU, Outlook\'s BYSETPOS and the last weekday', () => {
  const autumn = [new Date(2026, 9, 1), new Date(2026, 10, 30, 23)] as const;
  const days = (rule: string) =>
    parseIcs(feed(`UID:9\r\nSUMMARY:Review\r\nDTSTART:20260113T100000\r\nRRULE:${rule}`), ...autumn).map((e) => [e.start.getMonth() + 1, e.start.getDate()]);
  expect(days('FREQ=MONTHLY;BYDAY=2TU')).toEqual([[10, 13], [11, 10]]);
  expect(days('FREQ=MONTHLY;BYDAY=TU;BYSETPOS=2')).toEqual([[10, 13], [11, 10]]);
  expect(days('FREQ=MONTHLY;BYDAY=-1FR')).toEqual([[10, 30], [11, 27]]);
  expect(days('FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1')).toEqual([[10, 30], [11, 30]]);
});
