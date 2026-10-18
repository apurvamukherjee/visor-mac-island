import { apps } from '../apps/apps';
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

// The tab is titled after the front app, so a tab strip full of Visor tabs still says which is which.
export function syncTitle() {
  const home = document.title;
  useWindows.subscribe((s) => {
    document.title = s.focused ? `${apps[s.focused].name} — Visor` : home;
  });
}

// Deep links: /#music, /#terminal and so on open that app, so a shared link lands on the right window.
export function openFromHash() {
  const go = () => {
    const id = decodeURIComponent(location.hash.slice(1)).toLowerCase();
    if (Object.hasOwn(apps, id)) useWindows.getState().open(id as keyof typeof apps);
  };
  go();
  window.addEventListener('hashchange', go);
}
