import { useState } from 'react';
import { apps, dockOrder, type AppId } from '../apps';
import file from '../../icons/apps/file.webp';
import folder from '../../icons/apps/folder.webp';
import { links } from '../../links';
import { useWindows } from '../../store/windows';
import './Finder.css';

type Place = 'Visor' | 'Applications' | 'Downloads';

interface Entry {
  name: string;
  icon: string;
  open: () => void;
}

const url = (href: string) => () => window.open(href, '_blank', 'noopener');
const app = (id: AppId) => () => useWindows.getState().open(id);

const places: Record<Place, Entry[]> = {
  Visor: [
    { name: 'Visor', icon: folder, open: url(`${links.repo}/tree/main/Visor`) },
    { name: 'assets', icon: folder, open: url(`${links.repo}/tree/main/assets`) },
    { name: 'scripts', icon: folder, open: url(`${links.repo}/tree/main/scripts`) },
    { name: 'website', icon: folder, open: url(`${links.repo}/tree/main/website`) },
    { name: 'README.md', icon: file, open: url(links.readme) },
    { name: 'CHANGELOG.md', icon: file, open: app('notes') },
    { name: 'LICENSE', icon: file, open: url(links.license) },
    { name: 'project.yml', icon: file, open: url(`${links.repo}/blob/main/project.yml`) },
  ],
  Applications: dockOrder.map((id) => ({ name: apps[id].name, icon: apps[id].icon, open: app(id) })),
  Downloads: [{ name: 'Visor.dmg', icon: `${import.meta.env.BASE_URL}icon.png`, open: url(links.dmg) }],
};

export function Finder() {
  const [place, setPlace] = useState<Place>('Visor');
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="finder">
      <nav className="finder-side" aria-label="Sidebar">
        <h4>Favorites</h4>
        {(Object.keys(places) as Place[]).map((p) => (
          <button key={p} className={p === place ? 'is-active' : ''} onClick={() => { setPlace(p); setSelected(null); }}>
            {p === 'Visor' ? '📁' : p === 'Applications' ? '🅰️' : '⬇️'} {p}
          </button>
        ))}
        <h4>Locations</h4>
        <button>💽 Macintosh HD</button>
        <h4>Tags</h4>
        <button>🔴 Visor</button>
        <button>🟠 Ship it</button>
      </nav>
      <div className="finder-main">
        <header>{place} <small>{places[place].length} items · double-click to open</small></header>
        <ul className="finder-grid">
          {places[place].map((e) => (
            <li key={e.name}>
              <button className={selected === e.name ? 'is-selected' : ''} onClick={() => setSelected(e.name)} onDoubleClick={e.open} onKeyDown={(k) => k.key === 'Enter' && e.open()}>
                <img src={e.icon} alt="" width={56} height={56} />
                <span>{e.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
