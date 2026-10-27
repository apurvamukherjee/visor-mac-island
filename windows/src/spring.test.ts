import { expect, test } from 'vitest';
import { CLOSE_SPRING, OPEN_SPRING } from './spring';

const values = (easing: string) => easing.slice(7, -1).split(', ').map(Number);

test('opening overshoots like the Mac notch, then settles at 1', () => {
  const v = values(OPEN_SPRING.easing);
  expect(v[0]).toBe(0);
  expect(v.at(-1)).toBe(1);
  expect(Math.max(...v)).toBeGreaterThan(1.01);
  expect(OPEN_SPRING.ms).toBeGreaterThan(300);
  expect(OPEN_SPRING.ms).toBeLessThan(900);
});

test('closing is critically damped, so it never overshoots', () => {
  const v = values(CLOSE_SPRING.easing);
  expect(Math.max(...v)).toBeLessThanOrEqual(1);
  expect(v.every((x, i) => i === 0 || x >= (v[i - 1] ?? 0))).toBe(true);
});
