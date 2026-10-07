import { useShallow } from 'zustand/react/shallow';
import { views } from '../apps/views';
import { useWindows } from '../store/windows';
import { Window } from './Window/Window';

export function WindowLayer() {
  // Only the set of open ids re-renders the layer; dragging a window re-renders just that window.
  const ids = useWindows(useShallow((s) => Object.values(s.wins).map((w) => w.id)));
  return ids.map((id) => {
    const View = views[id];
    return View ? <Window key={id} id={id}><View /></Window> : null;
  });
}
