import { expect, test } from 'vitest';
import { dueLabel, groups, laterToday, listOf, parseEntry, queue, todayProgress, type Task } from './store';

// Thursday 19 Nov 2026, 2 pm local time.
const now = new Date(2026, 10, 19, 14, 0);
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute).getTime();
const task = (patch: Partial<Task>): Task => ({ id: Math.random().toString(), title: 't', priority: 1, due: null, done: null, ...patch });

test('lists come from the date alone, with overdue kept in Today', () => {
  expect(listOf(task({}), now)).toBe('inbox');
  expect(listOf(task({ due: at(18, 9) }), now)).toBe('today');
  expect(listOf(task({ due: at(19, 23, 59) }), now)).toBe('today');
  expect(listOf(task({ due: at(20, 0) }), now)).toBe('upcoming');
  expect(listOf(task({ due: at(19, 18), done: at(19, 13) }), now)).toBe('completed');
});

test('the queue is priority first, then the nearest deadline, undated last', () => {
  const low = task({ title: 'low', priority: 0, due: at(19, 15) });
  const highLate = task({ title: 'high late', priority: 2, due: at(22, 9) });
  const highSoon = task({ title: 'high soon', priority: 2, due: at(19, 16) });
  const highUndated = task({ title: 'high undated', priority: 2 });
  const done = task({ title: 'done', priority: 2, done: at(19, 10) });
  expect(queue([low, highUndated, highLate, done, highSoon]).map((t) => t.title))
    .toEqual(['high soon', 'high late', 'high undated', 'low']);
});

test('Today splits off Overdue, and Upcoming groups by day', () => {
  const today = groups([task({ due: at(18, 9) }), task({ due: at(19, 18) })], 'today', now);
  expect(today.map((g) => [g.id, g.title])).toEqual([['overdue', 'Overdue'], ['today', 'Today']]);
  expect(groups([task({ due: at(19, 18) })], 'today', now)[0]?.title).toBeNull();
  const upcoming = groups([task({ due: at(22, 9) }), task({ due: at(20, 18) })], 'upcoming', now);
  expect(upcoming.map((g) => g.title)).toEqual(['Tomorrow', 'Sun 22 Nov']);
});

test('typed dates and priority are read and taken out of the title', () => {
  expect(parseEntry('call the bank tomorrow at 5pm !!!', now)).toEqual({ title: 'call the bank', due: at(20, 17), priority: 2 });
  expect(parseEntry('pay rent by friday', now)).toEqual({ title: 'pay rent', due: at(20, 9), priority: null });
  expect(parseEntry('email Sam tomorrow about the invoice', now).title).toBe('email Sam about the invoice');
  expect(parseEntry('standup 9:30', now).due).toBe(at(20, 9, 30));
  expect(parseEntry('dinner tonight', now).due).toBe(at(19, 20));
  expect(parseEntry('water plants today', now).due).toBe(at(19, 18));
  expect(parseEntry('demo next week !', now)).toEqual({ title: 'demo', due: at(23, 9), priority: 0 });
  expect(parseEntry('wow!! money and sunny Monday 3pm', now)).toEqual({ title: 'wow!! money and sunny', due: at(23, 15), priority: null });
  expect(parseEntry('lunch friday !!', now, { dates: false, priorities: false })).toEqual({ title: 'lunch friday !!', due: null, priority: null });
  expect(parseEntry('lunch friday !!', now, { dates: false })).toEqual({ title: 'lunch friday', due: null, priority: 1 });
  expect(parseEntry('  buy 2 apples  ', now)).toEqual({ title: 'buy 2 apples', due: null, priority: null });
});

test('later today is 6 pm, then the next hour, never past midnight', () => {
  expect(laterToday(now)).toBe(at(19, 18));
  expect(laterToday(new Date(2026, 10, 19, 17, 40))).toBe(at(19, 19));
  expect(laterToday(new Date(2026, 10, 19, 23, 40))).toBe(at(19, 23, 59));
});

test('date chips say overdue, soon or the time', () => {
  expect(dueLabel(at(18, 17), now)).toEqual({ text: 'Overdue · 18 Nov', urgency: 'overdue' });
  expect(dueLabel(at(19, 14, 10), now).urgency).toBe('soon');
  expect(dueLabel(at(19, 18), now)).toEqual({ text: 'Due 6:00 PM', urgency: 'later' });
});

test('today’s progress counts what was finished today against what is left', () => {
  const tasks = [task({ due: at(19, 18) }), task({ due: at(18, 9) }), task({ done: at(19, 9) }), task({ done: at(18, 9) }), task({ due: at(21, 9) })];
  expect(todayProgress(tasks, now)).toEqual({ done: 1, total: 3 });
});
