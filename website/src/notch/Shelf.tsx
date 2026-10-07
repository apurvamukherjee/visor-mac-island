import file from '../icons/apps/file.webp';
import folder from '../icons/apps/folder.webp';
import { wallpaperAt, wallpaperUrl } from '../os/Wallpaper/wallpapers';

const items = [
  { name: 'Visor.dmg', icon: `${import.meta.env.BASE_URL}icon.png`, thumb: false },
  { name: wallpaperAt(0).file.replace('.webp', '.jpg'), icon: wallpaperUrl(wallpaperAt(0)), thumb: true },
  { name: 'Release notes.pdf', icon: file, thumb: false },
  { name: 'Screenshots', icon: folder, thumb: false },
  { name: wallpaperAt(1).file.replace('.webp', '.jpg'), icon: wallpaperUrl(wallpaperAt(1)), thumb: true },
];

const share = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3v12M8 7l4-4 4 4" /><path d="M8 10H6v10h12V10h-2" />
  </svg>
);

// A look at Visor's shelf with a few files parked on it; dragging in and out is what the real app does.
export function Shelf() {
  return (
    <div className="shelf">
      <div className="shelf-zone shelf-airdrop">
        <span className="shelf-airdrop-circle">{share}</span>
        <b>AirDrop</b>
      </div>
      <ul className="shelf-zone shelf-files" aria-label="Files on the shelf">
        {items.map((it) => (
          <li key={it.name} title={it.name}>
            <img className={it.thumb ? 'is-thumb' : ''} src={it.icon} alt="" width={46} height={46} />
            <span>{it.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
