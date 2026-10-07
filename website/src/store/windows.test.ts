import { expect, test, vi } from 'vitest';

vi.stubGlobal('window', { innerWidth: 1440, innerHeight: 900 });
const { clampFrame, MENU_BAR } = await import('./windows');

test('keeps the title bar below the menu bar and on screen', () => {
  expect(clampFrame({ x: -5000, y: -100, w: 600, h: 400 })).toEqual({ x: 80 - 600, y: MENU_BAR, w: 600, h: 400 });
  expect(clampFrame({ x: 5000, y: 5000, w: 600, h: 400 })).toEqual({ x: 1440 - 80, y: 900 - 40, w: 600, h: 400 });
});

test('enforces a minimum and maximum size', () => {
  expect(clampFrame({ x: 100, y: 100, w: 10, h: 10 })).toMatchObject({ w: 320, h: 200 });
  expect(clampFrame({ x: 100, y: 100, w: 9999, h: 9999 })).toMatchObject({ w: 1440, h: 900 - MENU_BAR });
});
