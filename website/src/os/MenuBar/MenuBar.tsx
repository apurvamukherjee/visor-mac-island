import { useState, type ReactNode } from 'react';
import { apps } from '../../apps/apps';
import { useBattery } from '../../store/battery';
import { useWindows } from '../../store/windows';
import { ControlCenter } from '../ControlCenter/ControlCenter';
import { useNow } from '../useNow';
import { appMenus, systemMenu, visorAppMenu, type Menu } from './menus';
import './MenuBar.css';

// Apple's mark (Simple Icons path), where macOS puts it at the left of the menu bar.
const apple = (
  <svg viewBox="0 0 24 24" width="14" height="16" fill="currentColor" aria-hidden>
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
  </svg>
);

const wifi = (
  <svg viewBox="0 0 20 14" width="17" height="12" aria-hidden fill="currentColor">
    <path d="M10 13.5l2.6-3.1a4 4 0 0 0-5.2 0z" />
    <path d="M10 5.6a8 8 0 0 1 5.3 2l1.4-1.7A10.2 10.2 0 0 0 10 3.4 10.2 10.2 0 0 0 3.3 5.9l1.4 1.7a8 8 0 0 1 5.3-2z" opacity=".95" />
    <path d="M10 0A14 14 0 0 0 .7 3.5L2 5.1A12 12 0 0 1 10 2.2a12 12 0 0 1 8 2.9l1.3-1.6A14 14 0 0 0 10 0z" opacity=".95" />
  </svg>
);

const controlCenter = (
  <svg viewBox="0 0 18 14" width="16" height="13" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="1" y="1" width="16" height="5" rx="2.5" /><circle cx="14.5" cy="3.5" r="1.4" fill="currentColor" />
    <rect x="1" y="8" width="16" height="5" rx="2.5" /><circle cx="3.5" cy="10.5" r="1.4" fill="currentColor" />
  </svg>
);

function BatteryStatus() {
  const { supported, level, charging } = useBattery();
  if (!supported) return null;
  const pct = Math.round(level * 100);
  return (
    <span className="menubar-status" aria-label={`Battery ${pct}%${charging ? ', charging' : ''}`}>
      {pct}%
      <svg viewBox="0 0 26 12" width="25" height="12" aria-hidden>
        <rect x=".5" y=".5" width="22" height="11" rx="3" fill="none" stroke="currentColor" strokeOpacity=".5" />
        <rect x="2" y="2" width={19 * level} height="8" rx="1.6" fill={charging ? '#34c759' : 'currentColor'} />
        <path d="M24 4v4a2 2 0 0 0 0-4z" fill="currentColor" fillOpacity=".5" />
      </svg>
    </span>
  );
}

function Clock() {
  const now = useNow();
  const date = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return <time className="menubar-status" dateTime={now.toISOString()}>{date}&nbsp;&nbsp;{time}</time>;
}

interface DropdownProps {
  menu: Menu;
  label: ReactNode;
  bold?: boolean;
  isOpen: boolean;
  anyOpen: boolean;
  onOpen: (label: string | null) => void;
}

function Dropdown({ menu, label, bold, isOpen, anyOpen, onOpen }: DropdownProps) {
  return (
    <div className="menubar-menu">
      <button
        className={`menubar-item${bold ? ' is-bold' : ''}${isOpen ? ' is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={typeof label === 'string' ? undefined : menu.label}
        onClick={() => onOpen(isOpen ? null : menu.label)}
        onPointerEnter={() => anyOpen && onOpen(menu.label)}
      >
        {label}
      </button>
      {isOpen && (
        <ul className="menubar-dropdown" role="menu" aria-label={menu.label}>
          {menu.items().map((item, i) =>
            item === 'separator' ? (
              <li key={i} className="menubar-sep" role="separator" />
            ) : (
              <li key={item.label} role="none">
                {item.href ? (
                  <a role="menuitem" href={item.href} target="_blank" rel="noreferrer" onClick={() => onOpen(null)}>
                    {item.label} <span className="menubar-shortcut">↗</span>
                  </a>
                ) : (
                  <button
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => {
                      onOpen(null);
                      item.run?.();
                    }}
                  >
                    {item.label}
                    {item.shortcut && <span className="menubar-shortcut">{item.shortcut}</span>}
                  </button>
                )}
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

export function MenuBar() {
  const [open, setOpen] = useState<string | null>(null);
  const focused = useWindows((s) => s.focused);
  const appName = focused ? apps[focused].name : 'Visor';
  const props = (menu: Menu) => ({ menu, isOpen: open === menu.label, anyOpen: open !== null, onOpen: setOpen });

  return (
    <>
      {/* A click anywhere outside an open menu closes it, like macOS. */}
      {open && <div className="menubar-backdrop" onPointerDown={() => setOpen(null)} />}
      <header className="menubar" onKeyDown={(e) => e.key === 'Escape' && setOpen(null)}>
        <nav className="menubar-left" aria-label="Menu bar">
          <Dropdown {...props(systemMenu)} label={apple} />
          <Dropdown {...props(visorAppMenu)} label={appName} bold />
          {appMenus.map((m) => <Dropdown key={m.label} {...props(m)} label={m.label} />)}
        </nav>
        <div className="menubar-right">
          <BatteryStatus />
          <span className="menubar-status" aria-hidden>{wifi}</span>
          <div className="menubar-menu">
            <button className={`menubar-item${open === 'cc' ? ' is-open' : ''}`} aria-label="Control Center" aria-expanded={open === 'cc'} onClick={() => setOpen(open === 'cc' ? null : 'cc')}>
              {controlCenter}
            </button>
            {open === 'cc' && <ControlCenter onClose={() => setOpen(null)} />}
          </div>
          <Clock />
        </div>
      </header>
    </>
  );
}
