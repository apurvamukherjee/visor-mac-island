import { useState } from 'react';
import { apps, type AppId } from '../../apps/apps';
import file from '../../icons/apps/file.webp';
import folder from '../../icons/apps/folder.webp';
import { links } from '../../links';
import { useWindows } from '../../store/windows';
import './DesktopIcons.css';

interface Item {
  name: string;
  icon: string;
  open: AppId | string;
}

const items: Item[] = [
  { name: 'Visor.dmg', icon: `${import.meta.env.BASE_URL}icon.png`, open: links.dmg },
  { name: 'wallpapers', icon: folder, open: 'photos' },
  { name: 'Visor', icon: folder, open: 'finder' },
  { name: 'README.md', icon: file, open: links.readme },
  { name: 'CHANGELOG.md', icon: file, open: 'notes' },
  { name: 'apurva.space', icon: apps.safari.icon, open: 'safari' },
];

function launch(target: string) {
  if (target in apps) useWindows.getState().open(target as AppId);
  else window.open(target, '_blank', 'noopener');
}

// Single click selects, double click (or Enter) opens, as in Finder.
export function DesktopIcons() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <ul className="desktop-icons" aria-label="Desktop">
      {items.map((it) => (
        <li key={it.name}>
          <button
            className={selected === it.name ? 'is-selected' : ''}
            onClick={() => setSelected(it.name)}
            onDoubleClick={() => launch(it.open)}
            onKeyDown={(e) => e.key === 'Enter' && launch(it.open)}
            onBlur={() => setSelected((s) => (s === it.name ? null : s))}
          >
            <img src={it.icon} alt="" width={56} height={56} draggable={false} />
            <span>{it.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
