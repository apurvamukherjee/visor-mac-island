import { useSettings } from '../../store/settings';
import { useNow } from '../useNow';
import { autoIndex, wallpaperAt, wallpaperUrl } from './wallpapers';
import './Wallpaper.css';

export function Wallpaper() {
  const choice = useSettings((s) => s.wallpaper);
  const dim = useSettings((s) => s.dim);
  // Ticks every second rather than every ROTATE_MS so the print shown matches autoIndex() at any moment.
  const now = useNow();
  const index = choice === 'auto' ? autoIndex(now.getTime()) : choice;
  const current = wallpaperAt(index);
  const next = wallpaperAt(index + 1);

  return (
    <>
      <div className="wallpaper" aria-hidden>
        {/* Keyed so each change mounts a fresh layer that fades in over the last one. */}
        <img key={current.file} className="wallpaper-layer" src={wallpaperUrl(current)} alt="" fetchPriority="high" />
        <link rel="prefetch" href={wallpaperUrl(next)} />
      </div>
      {/* Above everything, like the real display: Control Center's brightness dims windows and the dock too. */}
      <div className="wallpaper-dim" style={{ opacity: dim }} aria-hidden />
      <a className="wallpaper-credit" href={current.source} target="_blank" rel="noreferrer">
        🖼 {current.title} — {current.artist} ({current.year})
      </a>
    </>
  );
}
