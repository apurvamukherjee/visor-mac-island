import { useEffect, useState, type AnimationEvent } from 'react';
import { Cover } from '../../notch/Cover';
import { useNotch } from '../../notch/store';
import { trackAt } from '../../notch/tracks';
import { useLock } from '../../store/lock';
import { useNow } from '../useNow';
import avatar from './apurva.webp';
import './LockScreen.css';

// Never hold a visitor on the welcome screen for a slow image; the desktop can finish loading behind them.
const READY_CAP_MS = 4000;

/** On the first-visit welcome, ready once the desktop's images have loaded or the cap passes. */
function useReady(waiting: boolean) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!waiting) return;
    // window's load event can fire before React commits, so wait on the images themselves; effects run after the commit.
    const pending = [...document.images]
      .filter((img) => !img.complete && img.loading !== 'lazy')
      .map((img) => new Promise((settle) => {
        img.addEventListener('load', settle, { once: true });
        img.addEventListener('error', settle, { once: true });
      }));
    let live = true;
    const done = () => live && setLoaded(true);
    const id = setTimeout(done, READY_CAP_MS);
    void Promise.all(pending).then(done);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [waiting]);
  return !waiting || loaded;
}

export function LockScreen() {
  const locked = useLock((s) => s.locked);
  const welcome = useLock((s) => s.welcome);
  const ready = useReady(welcome);
  const [leaving, setLeaving] = useState(false);
  const now = useNow();
  const { track, playing, togglePlay, skip } = useNotch();

  useEffect(() => {
    if (!locked || !ready) return;
    const leave = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') setLeaving(true);
    };
    window.addEventListener('keydown', leave);
    return () => window.removeEventListener('keydown', leave);
  }, [locked, ready]);

  if (!locked) return null;
  const t = trackAt(track);
  const leave = () => {
    if (ready) setLeaving(true);
  };
  // Unlock only once the fade-out finishes, so the desktop is revealed rather than cut to.
  const unlock = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.animationName !== 'lock-out') return;
    setLeaving(false);
    useLock.getState().unlock();
    useNotch.getState().flash({ kind: 'unlock' }, 1200);
  };

  return (
    <div className={`lock${leaving ? ' is-leaving' : ''}`} role="dialog" aria-label={welcome ? 'Welcome to Visor' : 'Lock screen'} onClick={leave} onAnimationEnd={unlock}>
      <div className="lock-clock">
        <span>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        <time>{now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/, '')}</time>
      </div>
      {/* Visor's lock screen widget: the player keeps working while locked. */}
      {!welcome && (
        <div className="lock-player" onClick={(e) => e.stopPropagation()}>
          <Cover track={t} size={48} linked={false} />
          <span><b>{t.title}</b><small>{t.artist}</small></span>
          <button aria-label="Previous track" onClick={() => skip(-1)}>⏮</button>
          <button aria-label={playing ? 'Pause' : 'Play'} onClick={togglePlay}>{playing ? '⏸' : '▶'}</button>
          <button aria-label="Next track" onClick={() => skip(1)}>⏭</button>
        </div>
      )}
      <div className="lock-user">
        <img className="lock-avatar" src={avatar} alt="" width={72} height={72} fetchPriority="high" />
        <b>{welcome ? 'Welcome to Visor' : 'Apurva'}</b>
        {ready ? (
          <button className="lock-unlock" onClick={leave}>{welcome ? 'Click to enter' : 'Click or press any key to unlock'}</button>
        ) : (
          <span className="lock-spinner" role="status" aria-label="Loading" />
        )}
      </div>
    </div>
  );
}
