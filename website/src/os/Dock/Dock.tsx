import { useState } from 'react';
import { apps, dockOrder, type AppId } from '../../apps/apps';
import { useWindows } from '../../store/windows';
import './Dock.css';

function DockItem({ id }: { id: AppId }) {
  const running = useWindows((s) => id in s.wins);
  const open = useWindows((s) => s.open);
  const [bounce, setBounce] = useState(0);
  const { name, icon } = apps[id];

  const launch = () => {
    if (!running) setBounce((b) => b + 1);
    open(id);
  };

  return (
    <li className="dock-item">
      <button className="dock-button" aria-label={name} onClick={launch}>
        <span className="dock-label" aria-hidden>{name}</span>
        <img key={bounce} className={bounce ? 'dock-icon is-bouncing' : 'dock-icon'} src={icon} alt="" draggable={false} />
      </button>
      {running && <span className="dock-dot" aria-hidden />}
    </li>
  );
}

export function Dock() {
  return (
    <nav className="dock" aria-label="Dock">
      <ul>
        {dockOrder.map((id) => <DockItem key={id} id={id} />)}
        <li className="dock-divider" aria-hidden />
        <DockItem id="trash" />
      </ul>
    </nav>
  );
}
