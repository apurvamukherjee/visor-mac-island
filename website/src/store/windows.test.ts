import { expect, test, vi } from 'vitest';

vi.stubGlobal('window', { innerWidth: 1440, innerHeight: 900 });
const { clampFrame, MENU_BAR, useWindows } = await import('./windows');

test('keeps the title bar below the menu bar and on screen', () => {
  expect(clampFrame({ x: -5000, y: -100, w: 600, h: 400 })).toEqual({ x: 80 - 600, y: MENU_BAR, w: 600, h: 400 });
  expect(clampFrame({ x: 5000, y: 5000, w: 600, h: 400 })).toEqual({ x: 1440 - 80, y: 900 - 40, w: 600, h: 400 });
});

test('enforces a minimum and maximum size', () => {
  expect(clampFrame({ x: 100, y: 100, w: 10, h: 10 })).toMatchObject({ w: 320, h: 200 });
  expect(clampFrame({ x: 100, y: 100, w: 9999, h: 9999 })).toMatchObject({ w: 1440, h: 900 - MENU_BAR });
});

test('every app opens at a usable size', () => {
  useWindows.getState().open('calendar');
  expect(useWindows.getState().wins.calendar?.frame).toMatchObject({ w: 760, h: 520 });
});

test('closing or minimizing the front window focuses the one behind', () => {
  const w = useWindows.getState();
  w.open('notes');
  w.open('music');
  w.open('terminal');
  w.close('terminal');
  expect(useWindows.getState().focused).toBe('music');
  w.minimize('music');
  expect(useWindows.getState().focused).toBe('notes');
});
