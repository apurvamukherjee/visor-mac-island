import { useEffect, useRef } from 'react';
import { batteryColor, useBattery } from '../store/battery';
import { useLock } from '../store/lock';
import { useSettings } from '../store/settings';
import { Closed, closedWidth } from './Closed';
import { Home } from './Home';
import { Shelf, filesToShelf } from './Shelf';
import { useNotch, type Tab } from './store';
import './audio';
import './Island.css';

const OPEN = { w: 640, h: 196 };
const CLOSED_H = 32;
// Same feel as Visor's default: open on hover, close shortly after the pointer leaves.
const CLOSE_DELAY_MS = 350;

const tabs: { id: Tab; label: string; path: string }[] = [
  { id: 'home', label: 'Home', path: 'M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z' },
  { id: 'shelf', label: 'Shelf', path: 'M4 13l2-8h12l2 8v6H4zm2.3 0H9a3 3 0 0 0 6 0h2.7l-1.4-6H7.7z' },
];

function Header() {
  const tab = useNotch((s) => s.tab);
  const setTab = useNotch((s) => s.setTab);
  const { supported, level, charging } = useBattery();
  return (
    <div className="island-header">
      <div className="island-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} aria-label={t.label} className="island-tab" onClick={() => setTab(t.id)}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d={t.path} /></svg>
          </button>
        ))}
      </div>
      {supported && (
        <span className="island-battery">
          {Math.round(level * 100)}%
          <span className="island-battery-cell"><i style={{ width: `${level * 100}%`, background: batteryColor(level, charging, '#fff') }} /></span>
        </span>
      )}
    </div>
  );
}

export function Island() {
  const open = useNotch((s) => s.open);
  const tab = useNotch((s) => s.tab);
  const setOpen = useNotch((s) => s.setOpen);
  const transient = useNotch((s) => s.transient);
  const locked = useLock((s) => s.locked);
  const timer = useNotch((s) => s.timerEnd !== null);
  const accent = useSettings((s) => s.accent);
  const hoverOpen = useSettings((s) => s.hoverOpen);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const ref = useRef<HTMLDivElement>(null);

  // Touch and keyboard never fire pointerleave, so a tap outside or Escape closes it too.
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!(e.target instanceof Node && ref.current?.contains(e.target))) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', outside);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('pointerdown', outside);
      window.removeEventListener('keydown', escape);
    };
  }, [open, setOpen]);

  const enter = () => {
    clearTimeout(closeTimer.current);
    // Opening behind the lock screen would leave it open after unlocking.
    if (!locked) setOpen(true);
  };
  const leave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  const size = open && !locked ? OPEN : { w: closedWidth(transient, locked, timer), h: CLOSED_H };
  return (
    <div
      ref={ref}
      className={`island${open ? ' is-open' : ''}`}
      // Closed, it leaves room either side for the menu bar's Apple menu, Control Center and clock on a phone.
      style={{ width: size === OPEN ? size.w : `min(${size.w}px, 100vw - 220px)`, height: size.h, '--accent': accent } as React.CSSProperties}
      onPointerEnter={(e) => hoverOpen && e.pointerType === 'mouse' && enter()}
      onPointerLeave={(e) => e.pointerType === 'mouse' && leave()}
      // Dragging a file toward the notch opens the shelf to catch it, as in Visor.
      onDragOver={(e) => {
        if (locked || !e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        if (!open || tab !== 'shelf') useNotch.getState().setTab('shelf');
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length) useNotch.getState().addToShelf(filesToShelf(e.dataTransfer.files));
      }}
    >
      {open && !locked ? (
        <div className="island-open">
          <Header />
          {tab === 'home' && <Home />}
          {tab === 'shelf' && <Shelf />}
        </div>
      ) : (
        <button className="island-hit" aria-label="Open the notch" aria-expanded={false} onClick={enter}>
          <Closed />
        </button>
      )}
    </div>
  );
}
