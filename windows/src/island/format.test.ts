import { describe, expect, it } from 'vitest';
import { clock, duration, startsIn } from './format';

describe('clock', () => {
  it('reads minutes and seconds under an hour', () => {
    expect(clock(0)).toBe('0:00');
    expect(clock(42.9)).toBe('0:42');
    expect(clock(215)).toBe('3:35');
    expect(clock(3599)).toBe('59:59');
  });
  it('adds hours from an hour up, instead of 61:40', () => {
    expect(clock(3600)).toBe('1:00:00');
    expect(clock(3700)).toBe('1:01:40');
  });
  it('never goes negative', () => expect(clock(-5)).toBe('0:00'));
});

describe('duration', () => {
  it('says minutes, then hours and minutes', () => {
    expect(duration(45)).toBe('45 min');
    expect(duration(60)).toBe('1 h');
    expect(duration(200)).toBe('3 h 20 min');
  });
});

describe('startsIn', () => {
  it('counts down whole minutes, rounding up, then says now', () => {
    expect(startsIn(120_000, 0)).toBe('in 2 min');
    expect(startsIn(61_000, 0)).toBe('in 2 min');
    expect(startsIn(1_000, 0)).toBe('in 1 min');
    expect(startsIn(0, 0)).toBe('now');
    expect(startsIn(0, 90_000)).toBe('now');
  });
});
