import { useNotch, type Hud as HudKind, type Transient } from './store';
import { Cover, Visualizer } from './Cover';
import { trackAt } from './tracks';
import { batteryColor } from '../store/battery';
import { useLock } from '../store/lock';
import { useNow } from '../os/useNow';
import { icons } from '../os/ControlCenter/icons';

const NOTCH_W = 200;

export function closedWidth(transient: Transient | null, locked: boolean, timer: boolean) {
  if (locked) return NOTCH_W + 70;
  if (!transient) return NOTCH_W + (timer ? 130 : 100);
  return { hud: 380, battery: 360, peek: 420, download: NOTCH_W + 90, join: 400, unlock: NOTCH_W + 70 }[transient.kind];
}

// The same line icons as Control Center's sliders, so the HUD reads as part of the system.
const hudIcon: Record<HudKind, React.ReactNode> = { volume: icons.speakerLoud, brightness: icons.sunLarge, backlight: icons.keyboardDim };

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
  if (transient?.kind === 'battery') {
    const pct = Math.round(transient.level * 100);
    return (
      <div className="closed closed-battery" role="status" aria-label={`${transient.charging ? 'Charging' : 'On battery'}, ${pct}%`}>
        <span>{transient.charging ? '⚡︎ Charging' : 'On Battery'}</span>
        <span className="island-battery">
          {pct}%
          <span className="island-battery-cell"><i style={{ width: `${pct}%`, background: batteryColor(transient.level, transient.charging, '#fff') }} /></span>
        </span>
      </div>
    );
  }
  if (transient?.kind === 'download') {
    return (
      <div className="closed closed-download" role="status" aria-label={`Downloading in ${transient.app}`}>
        <span />
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>
          <circle cx="10" cy="10" r="8" fill="none" stroke="rgb(255 255 255 / 0.2)" strokeWidth="2.5" />
          <circle className="closed-download-ring" cx="10" cy="10" r="8" fill="none" stroke="#0a84ff" strokeWidth="2.5" strokeLinecap="round" pathLength="100" transform="rotate(-90 10 10)" />
        </svg>
      </div>
    );
  }
  if (transient?.kind === 'join') {
    return (
      <div className="closed closed-join" role="status">
        <span className="closed-join-title">{transient.title}</span>
        <span className="closed-join-pill">Join {transient.app}</span>
      </div>
    );
  }
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
      <TimerOrVisualizer playing={playing} />
    </div>
  );
}

// The right wing shows a running timer instead of the visualizer.
function TimerOrVisualizer({ playing }: { playing: boolean }) {
  const end = useNotch((s) => s.timerEnd);
  const now = useNow(500).getTime();
  const left = end ? Math.max(0, end - now) : 0;
  if (!end) return <Visualizer playing={playing} />;
  const s = Math.ceil(left / 1000);
  return <span className="closed-timer">{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</span>;
}
