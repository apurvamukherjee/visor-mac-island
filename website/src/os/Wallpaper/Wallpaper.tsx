import { useEffect, useState } from 'react';
import { useSettings } from '../../store/settings';
import { wallpaperAt, wallpaperUrl, wallpapers } from './wallpapers';
import './Wallpaper.css';

const ROTATE_MS = 15_000;

export function Wallpaper() {
  const choice = useSettings((s) => s.wallpaper);
  const dim = useSettings((s) => s.dim);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (choice !== 'auto') return;
    const id = setInterval(() => setTick((t) => t + 1), ROTATE_MS);
    return () => clearInterval(id);
  }, [choice]);

  const index = choice === 'auto' ? tick % wallpapers.length : choice;
  const current = wallpaperAt(index);
  const next = wallpaperAt(index + 1);

  return (
    <>
      <div className="wallpaper" aria-hidden>
        {/* Keyed so each change mounts a fresh layer that fades in over the last one. */}
        <img key={current.file} className="wallpaper-layer" src={wallpaperUrl(current)} alt="" />
        <link rel="prefetch" href={wallpaperUrl(next)} />
        <div className="wallpaper-dim" style={{ opacity: dim }} />
      </div>
      <a className="wallpaper-credit" href={current.source} target="_blank" rel="noreferrer">
        🖼 {current.title} — {current.artist} ({current.year})
      </a>
    </>
  );
}
