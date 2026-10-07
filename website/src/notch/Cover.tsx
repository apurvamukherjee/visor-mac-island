import music from '../icons/apps/music.webp';
import type { Track } from './tracks';

export function Cover({ track, size, badge, linked = true }: { track: Track; size: number; badge?: boolean; linked?: boolean }) {
  if (!linked) return <span className="cover" style={{ width: size, height: size }}><img src={track.art} alt="" width={size} height={size} /></span>;
  return (
    <a className="cover" href={track.link} target="_blank" rel="noreferrer" style={{ width: size, height: size }} aria-label={`${track.title} by ${track.artist} on Apple Music`}>
      <img src={track.art} alt="" width={size} height={size} />
      {badge && <img className="cover-badge" src={music} alt="" width={30} height={30} />}
    </a>
  );
}

export function Visualizer({ playing }: { playing: boolean }) {
  return (
    <span className={`visualizer${playing ? '' : ' is-paused'}`} aria-hidden>
      <i /><i /><i /><i />
    </span>
  );
}
