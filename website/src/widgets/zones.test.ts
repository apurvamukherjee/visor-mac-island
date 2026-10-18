import { expect, test } from 'vitest';
import { offsetLabel } from './zones';

test('a city behind across a month end is yesterday, not tomorrow', () => {
  // 07:30 on 1 Nov in Kolkata is 18:00 on 31 Oct in Cupertino.
  const now = new Date('2026-11-01T02:00:00Z');
  expect(offsetLabel(now, 'America/Los_Angeles', 'Asia/Kolkata')).toEqual({ when: 'Yesterday', diff: '−12:30' });
  expect(offsetLabel(now, 'Asia/Kolkata', 'America/Los_Angeles')).toEqual({ when: 'Tomorrow', diff: '+12:30' });
  expect(offsetLabel(now, 'Asia/Kolkata', 'Asia/Kolkata')).toEqual({ when: 'Today', diff: 'Local' });
  expect(offsetLabel(now, 'Europe/London', 'Asia/Kolkata')).toEqual({ when: 'Today', diff: '−5:30' });
});
