import { DOCK_SPACE, useWindows } from '../store/windows';

// Open a couple of windows on first load so the desktop looks lived in, like a real Mac mid-session.
export function openStartupWindows() {
  const { innerWidth: w, innerHeight: h } = window;
  if (w < 1180) return;
  const { open } = useWindows.getState();
  const qt = { w: 470, h: 300 };
  open('quicktime', { x: 60, y: h - DOCK_SPACE - qt.h - 18, ...qt });
  const store = { x: 360, y: 230, w: Math.min(900, w - 360 - 190), h: Math.min(560, h - 230 - DOCK_SPACE - 10) };
  open('appstore', store);
  // Music sits on top of the App Store, nudged down and to the side so both read as open.
  open('music', { x: store.x + Math.min(260, store.w - 520), y: store.y - 120, w: 680, h: 440 });
}
