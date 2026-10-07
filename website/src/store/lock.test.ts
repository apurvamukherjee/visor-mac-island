import { expect, test, vi } from 'vitest';

const stored = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => stored.get(k) ?? null,
  setItem: (k: string, v: string) => stored.set(k, v),
});
const { useLock, WELCOMED_KEY } = await import('./lock');

test('a first visit opens on the welcome, and entering remembers it', () => {
  expect(useLock.getState()).toMatchObject({ locked: true, welcome: true });
  useLock.getState().unlock();
  expect(useLock.getState()).toMatchObject({ locked: false, welcome: false });
  expect(stored.has(WELCOMED_KEY)).toBe(true);
});

test('locking later shows the plain lock screen, not the welcome', () => {
  useLock.getState().lock();
  expect(useLock.getState()).toMatchObject({ locked: true, welcome: false });
});
