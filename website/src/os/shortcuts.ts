import { useNotch } from '../notch/store';
import { useLock } from '../store/lock';
import { useWindows } from '../store/windows';

const KONAMI = 'ArrowUp ArrowUp ArrowDown ArrowDown ArrowLeft ArrowRight ArrowLeft ArrowRight b a';

// Plays a one-shot CSS animation by toggling a class; removing it first lets the same egg run again.
function play(selector: string, className: string) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.classList.remove(className);
  void el.getBoundingClientRect();
  el.classList.add(className);
  // animationend bubbles up from every child animation, so wait for the element's own.
  const done = (e: Event) => {
    if (e.target !== el) return;
    el.classList.remove(className);
    el.removeEventListener('animationend', done);
  };
  el.addEventListener('animationend', done);
}

// Visor's own shortcuts plus macOS's lock combo. Browsers reserve some combos, so each still has a click path.
export function installShortcuts() {
  let keys: string[] = [];
  window.addEventListener('keydown', (e) => {
    if (useLock.getState().locked) return;
    const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
    if (!typing && !e.repeat) {
      keys = [...keys, e.key.length === 1 ? e.key.toLowerCase() : e.key].slice(-10);
      // Easter eggs: the Konami code barrel-rolls the desktop, and typing "notch" makes it wiggle.
      if (keys.join(' ') === KONAMI) play('.desktop', 'is-rolling');
      if (keys.slice(-5).join('') === 'notch') play('.island', 'is-wiggling');
    }
    const key = e.key.toLowerCase();
    if (e.metaKey && e.ctrlKey && key === 'q') {
      e.preventDefault();
      useLock.getState().lock();
    } else if (e.metaKey && e.shiftKey && key === 'i') {
      e.preventDefault();
      const n = useNotch.getState();
      n.setOpen(!n.open);
    } else if (e.metaKey && e.shiftKey && key === 'h') {
      e.preventDefault();
      useNotch.getState().flash({ kind: 'peek' }, 2500);
    } else if ((e.metaKey || e.ctrlKey) && !e.shiftKey && key === 'k') {
      // Spotlight's ⌘Space belongs to macOS, so the search everyone knows from the web stands in.
      e.preventDefault();
      useWindows.getState().open('launchpad');
    } else if (key === ' ' && document.activeElement === document.body) {
      // Space plays and pauses like a media key, but only when no button or field would take it.
      e.preventDefault();
      useNotch.getState().togglePlay();
    }
  });
}
