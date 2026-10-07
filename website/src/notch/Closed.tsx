import { useNotch, type Hud as HudKind, type Transient } from './store';
import { Cover, Visualizer } from './Cover';
import { trackAt } from './tracks';
import { useLock } from '../store/lock';

const NOTCH_W = 200;

export function closedWidth(transient: Transient | null, locked: boolean) {
  if (locked) return NOTCH_W + 70;
  if (!transient) return NOTCH_W + 100;
  return { hud: 380, battery: 360, peek: 420, download: 300, unlock: NOTCH_W + 70 }[transient.kind];
}

const hudIcon: Record<HudKind, string> = { volume: '🔊', brightness: '☀', backlight: '⌨' };

function Hud({ hud, value }: { hud: HudKind; value: number }) {
  return (
    <div className="closed closed-hud" role="status" aria-label={`${hud} ${Math.round(value * 100)}%`}>
      <span className="closed-hud-icon" aria-hidden>{hudIcon[hud]}</span>
      <span className="closed-hud-bar"><i style={{ width: `${value * 100}%` }} /></span>
    </div>
  );
}

export function Closed() {
  const track = trackAt(useNotch((s) => s.track));
  const playing = useNotch((s) => s.playing);
  const transient = useNotch((s) => s.transient);
  const locked = useLock((s) => s.locked);

  // Visor holds a shut padlock while the Mac is locked and swings it open on unlock.
  if (locked || transient?.kind === 'unlock') {
    return (
      <div className="closed closed-lock" role="status" aria-label={locked ? 'Locked' : 'Unlocked'}>
        <svg className={locked ? '' : 'is-open'} viewBox="0 0 24 24" width="16" height="16" aria-hidden>
          <path className="closed-lock-shackle" d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="5" y="11" width="14" height="10" rx="2.5" fill="#fff" />
        </svg>
      </div>
    );
  }

  if (transient?.kind === 'hud') return <Hud hud={transient.hud} value={transient.value} />;
  if (transient?.kind === 'peek') {
    return (
      <div className="closed closed-peek" role="status" aria-label={`Now playing ${track.title} by ${track.artist}`}>
        <Cover track={track} size={22} linked={false} />
        <span className="closed-peek-text"><b>{track.title}</b> · {track.artist}</span>
        <Visualizer playing={playing} />
      </div>
    );
  }
  return (
    <div className="closed">
      <Cover track={track} size={22} linked={false} />
      <Visualizer playing={playing} />
    </div>
  );
}
