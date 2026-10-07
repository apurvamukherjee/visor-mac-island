import { Calendar } from './Calendar';
import { useNotch } from './store';
import { Cover } from './Cover';
import { formatTime, trackAt } from './tracks';

const icon = {
  prev: <path d="M11 6v12L2 12zM21 6v12l-9-6z" />,
  next: <path d="M3 6v12l9-6zM13 6v12l9-6z" />,
  play: <path d="M7 4v16l13-8z" />,
  pause: <path d="M6 4h4v16H6zM14 4h4v16h-4z" />,
};

function Control({ label, path, big, onClick }: { label: string; path: React.ReactNode; big?: boolean; onClick: () => void }) {
  return (
    <button className={`player-btn${big ? ' is-big' : ''}`} aria-label={label} onClick={onClick}>
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>{path}</svg>
    </button>
  );
}

export function Player() {
  const { track: index, playing, position, togglePlay, skip, seek } = useNotch();
  const track = trackAt(index);
  return (
    <div className="player">
      <Cover track={track} size={118} />
      <div className="player-main">
        <div className="player-title">{track.title}</div>
        <div className="player-artist">{track.artist}</div>
        <input
          className="player-scrub"
          type="range"
          min={0}
          max={track.duration}
          value={position}
          aria-label="Track position"
          style={{ '--p': `${(position / track.duration) * 100}%` } as React.CSSProperties}
          onChange={(e) => seek(Number(e.target.value))}
        />
        <div className="player-times"><span>{formatTime(position)}</span><span>{formatTime(track.duration)}</span></div>
        <div className="player-controls">
          <Control label="Previous track" path={icon.prev} onClick={() => skip(-1)} />
          <Control label={playing ? 'Pause' : 'Play'} path={playing ? icon.pause : icon.play} big onClick={togglePlay} />
          <Control label="Next track" path={icon.next} onClick={() => skip(1)} />
        </div>
      </div>
    </div>
  );
}

export function Home() {
  return (
    <div className="home">
      <Player />
      <Calendar />
    </div>
  );
}
