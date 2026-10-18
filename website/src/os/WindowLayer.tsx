import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Launchpad } from '../apps/Launchpad/Launchpad';
import { views } from '../apps/views';
import { clampFrame, useWindows } from '../store/windows';
import { Window } from './Window/Window';

// A shrinking browser would otherwise strand windows, title bar and all, off screen.
function reclamp() {
  useWindows.setState((s) => ({
    wins: Object.fromEntries(Object.entries(s.wins).map(([id, w]) => [id, { ...w, frame: clampFrame(w.frame) }])),
  }));
}

export function WindowLayer() {
  // Only the set of open ids re-renders the layer; dragging a window re-renders just that window.
  const ids = useWindows(useShallow((s) => Object.values(s.wins).map((w) => w.id)));
  useEffect(() => {
    window.addEventListener('resize', reclamp);
    return () => window.removeEventListener('resize', reclamp);
  }, []);
  return ids.map((id) => {
    // Apps is a full-screen launcher, not a window.
    if (id === 'launchpad') return <Launchpad key={id} />;
    const View = views[id];
    return View ? <Window key={id} id={id}><View /></Window> : null;
  });
}
