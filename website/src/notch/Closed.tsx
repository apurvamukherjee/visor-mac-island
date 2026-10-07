import { useNotch, type Hud as HudKind, type Transient } from './store';
import { Cover, Visualizer } from './Cover';
import { trackAt } from './tracks';

const NOTCH_W = 200;

export function closedWidth(transient: Transient | null) {
  if (!transient) return NOTCH_W + 100;
  return { hud: 380, battery: 360, peek: 420, download: 300 }[transient.kind];
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

  if (transient?.kind === 'hud') return <Hud hud={transient.hud} value={transient.value} />;
  return (
    <div className="closed">
      <Cover track={track} size={22} linked={false} />
      <Visualizer playing={playing} />
    </div>
  );
}
