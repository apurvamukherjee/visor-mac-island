import { describe, expect, it } from 'vitest';
import { DUE_GRACE, dueTask, queue, type Task } from './queue';

const MIN = 60_000;
const task = (id: string, patch: Partial<Task> = {}): Task => ({ id, title: id, priority: 'medium', deadline: null, createdAt: 0, completedAt: null, ...patch });
const ids = (tasks: Task[]) => tasks.map((t) => t.id);

describe('queue', () => {
  it('puts high before medium before low', () => {
    expect(ids(queue([task('l', { priority: 'low' }), task('m'), task('h', { priority: 'high' })]))).toEqual(['h', 'm', 'l']);
  });
  it('orders by soonest deadline within a priority, no deadline last', () => {
    expect(ids(queue([task('none'), task('late', { deadline: 200 }), task('soon', { deadline: 100 })]))).toEqual(['soon', 'late', 'none']);
  });
  it('lets priority beat deadline', () => {
    expect(ids(queue([task('low-soon', { priority: 'low', deadline: 1 }), task('high-none', { priority: 'high' })]))).toEqual(['high-none', 'low-soon']);
  });
  it('breaks ties by age, including two without a deadline', () => {
    expect(ids(queue([task('b', { createdAt: 2 }), task('a', { createdAt: 1 })]))).toEqual(['a', 'b']);
    expect(ids(queue([task('b', { deadline: 5, createdAt: 2 }), task('a', { deadline: 5, createdAt: 1 })]))).toEqual(['a', 'b']);
  });
  it('leaves done tasks out', () => {
    expect(ids(queue([task('done', { priority: 'high', completedAt: 1 }), task('open')]))).toEqual(['open']);
  });
});

describe('dueTask', () => {
  const lead = 15 * MIN;
  const at = 100 * MIN;
  it('opens the window exactly lead before the deadline', () => {
    expect(dueTask([task('t', { deadline: at })], at - lead - 1, lead)).toBeNull();
    expect(dueTask([task('t', { deadline: at })], at - lead, lead)?.id).toBe('t');
  });
  it('closes it the grace after the deadline', () => {
    expect(dueTask([task('t', { deadline: at })], at + DUE_GRACE, lead)?.id).toBe('t');
    expect(dueTask([task('t', { deadline: at })], at + DUE_GRACE + 1, lead)).toBeNull();
  });
  it('picks the earliest deadline among those due', () => {
    expect(dueTask([task('later', { deadline: at + MIN, priority: 'high' }), task('first', { deadline: at })], at, lead)?.id).toBe('first');
  });
  it('never alerts for done or undated tasks', () => {
    expect(dueTask([task('done', { deadline: at, completedAt: 1 }), task('none')], at, lead)).toBeNull();
  });
});
