import { useNotch } from './store';
import { Cover, Visualizer } from './Cover';
import { trackAt } from './tracks';

export function closedWidth(hasActivity: boolean) {
  return hasActivity ? 300 : 200;
}

export function Closed() {
  const track = trackAt(useNotch((s) => s.track));
  const playing = useNotch((s) => s.playing);
  return (
    <div className="closed">
      <Cover track={track} size={22} />
      <Visualizer playing={playing} />
    </div>
  );
}
