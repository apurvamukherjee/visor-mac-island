import { icons } from '../os/ControlCenter/icons';
import { useSettings } from '../store/settings';
import { Calendar } from './Calendar';
import { useNotch } from './store';
import { Cover } from './Cover';
import { PREVIEW_S, formatTime, trackAt, type Track } from './tracks';

function Control({ label, icon, big, onClick }: { label: string; icon: React.ReactNode; big?: boolean; onClick: () => void }) {
  return (
    <button className={`player-btn${big ? ' is-big' : ''}`} aria-label={label} onClick={onClick}>
      {icon}
    </button>
  );
}

// Visor's vinyl mode: the art becomes the label of a spinning record, and the tonearm drops on play.
function Vinyl({ track, playing }: { track: Track; playing: boolean }) {
  return (
    <span className={`vinyl${playing ? ' is-playing' : ''}`}>
      <span className="vinyl-disc"><img src={track.art} alt="" /></span>
      <i className="vinyl-arm" aria-hidden />
    </span>
  );
}

export function Player() {
  const { track: index, playing, position, togglePlay, skip, seek } = useNotch();
  const track = trackAt(index);
  const vinyl = useSettings((s) => s.vinyl);
  return (
    <div className="player">
      {vinyl ? <Vinyl track={track} playing={playing} /> : <Cover track={track} size={118} badge />}
      <div className="player-main">
        <div className="player-title">{track.title}</div>
        <div className="player-artist">{track.artist}</div>
        <input
          className="player-scrub"
          type="range"
          min={0}
          max={PREVIEW_S}
          value={position}
          aria-label="Track position"
          style={{ '--p': `${(position / PREVIEW_S) * 100}%` } as React.CSSProperties}
          onChange={(e) => seek(Number(e.target.value))}
        />
        <div className="player-times"><span>{formatTime(position)}</span><span>Preview · {formatTime(PREVIEW_S)}</span></div>
        <div className="player-controls">
          <Control label="Previous track" icon={icons.prev} onClick={() => skip(-1)} />
          <Control label={playing ? 'Pause' : 'Play'} icon={playing ? icons.pause : icons.play} big onClick={togglePlay} />
          <Control label="Next track" icon={icons.next} onClick={() => skip(1)} />
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
