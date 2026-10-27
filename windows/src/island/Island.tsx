import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSettings } from '../settings/store';
import { CLOSE_SPRING, OPEN_SPRING } from '../spring';
import './Island.css';

// Visor's sizes from sizing/matters.swift: the no-notch default closed, openNotchSize open.
const CLOSED = { w: 185, h: 32, top: 6, bottom: 14 };
const OPEN = { w: 640, h: 190, top: 19, bottom: 24 };
// ContentView.handleHover waits this long after the pointer leaves before closing.
const CLOSE_DELAY_MS = 100;

export function Island() {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const hoverOpen = useSettings((s) => s.hoverOpen);
  const hoverDelay = useSettings((s) => s.hoverDelay);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const size = open ? OPEN : CLOSED;
  const motion = open ? OPEN_SPRING : CLOSE_SPRING;

  // The window is click-through everywhere except this rect, which Rust hit-tests against the cursor.
  useEffect(() => {
    void invoke('set_hit', { rect: { x: (window.innerWidth - size.w) / 2, y: 0, w: size.w, h: size.h } });
  }, [size]);

  const enter = () => {
    clearTimeout(timer.current);
    setHover(true);
    if (!open && hoverOpen) timer.current = setTimeout(() => setOpen(true), hoverDelay * 1000);
  };
  const leave = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setHover(false);
      setOpen(false);
    }, CLOSE_DELAY_MS);
  };

  return (
    <div
      className={`island${open ? ' is-open' : ''}${hover ? ' is-hover' : ''}`}
      style={
        {
          '--w': `${size.w}px`,
          '--h': `${size.h}px`,
          '--top': `${size.top}px`,
          '--bottom': `${size.bottom}px`,
          '--ms': `${motion.ms}ms`,
          '--ease': motion.easing,
        } as React.CSSProperties
      }
      onPointerEnter={enter}
      onPointerLeave={leave}
    >
      {open ? (
        <div className="island-open">Nothing playing</div>
      ) : (
        <button className="island-hit" aria-label="Open Visor" onClick={() => setOpen(true)} />
      )}
    </div>
  );
}
