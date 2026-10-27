import { expect, test } from 'vitest';
import { lineAt, parseLrc } from './lyrics';

test('stamps sort, repeated stamps repeat the line, and the current line follows the clock', () => {
  const lines = parseLrc('[00:12.50] Second\n[ar:Someone]\n[00:03.00][01:00.00] Chorus\n');
  expect(lines.map((l) => [l.time, l.text])).toEqual([
    [3, 'Chorus'],
    [12.5, 'Second'],
    [60, 'Chorus'],
  ]);
  expect(lineAt(lines, 1)).toBe('');
  expect(lineAt(lines, 12.5)).toBe('Second');
  expect(lineAt(lines, 59)).toBe('Second');
  expect(lineAt(lines, 61)).toBe('Chorus');
});
