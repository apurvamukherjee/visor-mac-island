import { useState } from 'react';
import { wallpaperUrl, wallpapers } from '../../os/Wallpaper/wallpapers';
import { useSettings } from '../../store/settings';
import './Photos.css';

export function Photos() {
  const [open, setOpen] = useState<number | null>(null);
  const current = useSettings((s) => s.wallpaper);
  const set = useSettings((s) => s.set);
  const photo = open === null ? null : wallpapers[open];
  return (
    <div className="photos">
      {photo && open !== null ? (
        <div className="photos-view">
          <img src={wallpaperUrl(photo)} alt={photo.title} />
          <div className="photos-bar">
            <button onClick={() => setOpen(null)}>‹ Library</button>
            <span><b>{photo.title}</b> · {photo.artist}, {photo.year}</span>
            <button className="is-primary" onClick={() => set({ wallpaper: current === open ? 'auto' : open })}>{current === open ? 'Rotate wallpapers' : 'Set as Wallpaper'}</button>
          </div>
        </div>
      ) : (
        <>
          <header><h1>wallpapers</h1><small>{wallpapers.length} Japanese prints, public domain</small></header>
          <div className="photos-grid">
            {wallpapers.map((w, i) => (
              <button key={w.file} onClick={() => setOpen(i)} className={current === i ? 'is-current' : ''}>
                <img src={wallpaperUrl(w)} alt={w.title} loading="lazy" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
