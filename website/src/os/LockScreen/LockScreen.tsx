import { useEffect } from 'react';
import { Cover } from '../../notch/Cover';
import { useNotch } from '../../notch/store';
import { trackAt } from '../../notch/tracks';
import { useLock } from '../../store/lock';
import { useNow } from '../useNow';
import './LockScreen.css';

export function LockScreen() {
  const locked = useLock((s) => s.locked);
  const now = useNow();
  const { track, playing, togglePlay, skip } = useNotch();

  useEffect(() => {
    if (!locked) return;
    const unlock = (e: KeyboardEvent) => {
      if (e.key === 'Tab') return;
      useLock.getState().unlock();
      useNotch.getState().flash({ kind: 'unlock' }, 1200);
    };
    window.addEventListener('keydown', unlock);
    return () => window.removeEventListener('keydown', unlock);
  }, [locked]);

  if (!locked) return null;
  const t = trackAt(track);
  const unlock = () => {
    useLock.getState().unlock();
    useNotch.getState().flash({ kind: 'unlock' }, 1200);
  };

  return (
    <div className="lock" role="dialog" aria-label="Lock screen" onClick={unlock}>
      <div className="lock-clock">
        <span>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        <time>{now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/, '')}</time>
      </div>
      {/* Visor's lock screen widget: the player keeps working while locked. */}
      <div className="lock-player" onClick={(e) => e.stopPropagation()}>
        <Cover track={t} size={48} linked={false} />
        <span><b>{t.title}</b><small>{t.artist}</small></span>
        <button aria-label="Previous track" onClick={() => skip(-1)}>⏮</button>
        <button aria-label={playing ? 'Pause' : 'Play'} onClick={togglePlay}>{playing ? '⏸' : '▶'}</button>
        <button aria-label="Next track" onClick={() => skip(1)}>⏭</button>
      </div>
      <div className="lock-user">
        <span className="lock-avatar" aria-hidden>👤</span>
        <b>Visitor</b>
        <button className="lock-unlock" onClick={unlock}>Click or press any key to unlock</button>
      </div>
    </div>
  );
}
