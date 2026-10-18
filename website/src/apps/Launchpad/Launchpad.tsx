import { useState } from 'react';
import { apps, type AppId } from '../apps';
import { useWindows } from '../../store/windows';
import './Launchpad.css';

const ids = (Object.keys(apps) as AppId[]).filter((id) => id !== 'launchpad' && id !== 'trash');

// Full-screen launcher like macOS Apps: search, grid, click to open, Escape or click outside to close.
export function Launchpad() {
  const [q, setQ] = useState('');
  const close = () => useWindows.getState().close('launchpad');
  const launch = (id: AppId) => {
    close();
    useWindows.getState().open(id);
  };
  const shown = ids.filter((id) => apps[id].name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div
      className="launchpad"
      onClick={close}
      // Escape clears the search before it closes, as in Spotlight.
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        if (q) setQ('');
        else close();
      }}
    >
      <input
        autoFocus
        placeholder="Search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Enter' && shown[0] && launch(shown[0])}
        aria-label="Search apps"
      />
      <ul>
        {shown.map((id, i) => (
          <li key={id}>
            <button className={q && i === 0 ? 'is-top' : ''} onClick={(e) => { e.stopPropagation(); launch(id); }}>
              <img src={apps[id].icon} alt="" width={84} height={84} />
              <span>{apps[id].name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
