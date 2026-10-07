import type { Track } from './tracks';

export function Cover({ track, size }: { track: Track; size: number }) {
  return <span className="cover" style={{ width: size, height: size, background: track.cover }} role="img" aria-label={`${track.title} cover`} />;
}

export function Visualizer({ playing }: { playing: boolean }) {
  return (
    <span className={`visualizer${playing ? '' : ' is-paused'}`} aria-hidden>
      <i /><i /><i /><i />
    </span>
  );
}
