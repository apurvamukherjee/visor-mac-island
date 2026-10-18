import { useNotch } from '../notch/store';
import { useLock } from '../store/lock';

// Visor's own shortcuts plus macOS's lock combo. Browsers reserve some combos, so each still has a click path.
export function installShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (useLock.getState().locked) return;
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
    } else if (key === ' ' && document.activeElement === document.body) {
      // Space plays and pauses like a media key, but only when no button or field would take it.
      e.preventDefault();
      useNotch.getState().togglePlay();
    }
  });
}
