import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { apps, type AppId } from '../../apps/apps';
import { DOCK_SPACE, MENU_BAR, useWindows, type Frame } from '../../store/windows';
import './Window.css';

interface Props {
  id: AppId;
  children: ReactNode;
  title?: string;
}

function track(e: PointerEvent<HTMLElement>, onMove: (dx: number, dy: number) => void) {
  const el = e.currentTarget;
  const sx = e.clientX;
  const sy = e.clientY;
  el.setPointerCapture(e.pointerId);
  const move = (ev: globalThis.PointerEvent) => onMove(ev.clientX - sx, ev.clientY - sy);
  const up = () => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
}

export function Window({ id, children, title }: Props) {
  const win = useWindows((s) => s.wins[id]);
  const focused = useWindows((s) => s.focused === id);
  const { close, focus, minimize, toggleZoom, setFrame } = useWindows.getState();
  if (!win) return null;

  const frame: Frame = win.zoomed
    ? { x: 0, y: MENU_BAR, w: window.innerWidth, h: window.innerHeight - MENU_BAR - DOCK_SPACE }
    : win.frame;

  const startDrag = (e: PointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const start = frame;
    track(e, (dx, dy) => setFrame(id, { ...start, x: start.x + dx, y: start.y + dy }));
  };
  const startResize = (e: PointerEvent<HTMLElement>) => {
    e.stopPropagation();
    const start = frame;
    track(e, (dx, dy) => setFrame(id, { ...start, w: start.w + dx, h: start.h + dy }));
  };
  const keyResize = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 80 : 20;
    const delta: Record<string, [number, number]> = { ArrowRight: [step, 0], ArrowLeft: [-step, 0], ArrowDown: [0, step], ArrowUp: [0, -step] };
    const d = delta[e.key];
    if (!d) return;
    e.preventDefault();
    setFrame(id, { ...frame, w: frame.w + d[0], h: frame.h + d[1] });
  };

  const name = title ?? apps[id].name;
  return (
    <section
      role="dialog"
      aria-label={name}
      className={`window${focused ? ' is-focused' : ''}${win.minimized ? ' is-minimized' : ''}${apps[id].dark ? ' is-dark' : ''}`}
      style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h, zIndex: win.z }}
      onPointerDown={() => focus(id)}
      onKeyDown={(e) => e.key === 'Escape' && close(id)}
    >
      <header className="window-bar" onPointerDown={startDrag} onDoubleClick={() => toggleZoom(id)}>
        <div className="traffic">
          <button className="traffic-close" aria-label="Close" onClick={() => close(id)} />
          <button className="traffic-min" aria-label="Minimize" onClick={() => minimize(id)} />
          <button className="traffic-zoom" aria-label="Zoom" onClick={() => toggleZoom(id)} />
        </div>
        <h2 className="window-title">{name}</h2>
      </header>
      <div className="window-body">{children}</div>
      <button className="window-resize" aria-label={`Resize ${name}. Use arrow keys; hold Shift for larger steps.`} onPointerDown={startResize} onKeyDown={keyResize} />
    </section>
  );
}
