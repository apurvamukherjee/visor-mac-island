import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { media, report, useSystem } from '../native';
import { useSettings } from '../settings/store';
import { CLOSE_SPRING, OPEN_SPRING } from '../spring';
import { Calendar } from './Calendar';
import { Closed, closedSize, ErrorNote } from './Closed';
import { Header } from './Header';
import { Mirror } from './Mirror';
import { Player } from './Player';
import { useCover, useCoverColor, useMeeting } from './queries';
import { Shelf } from './Shelf';
import { useIsland, useShelf } from './store';
import './Island.css';

// Visor's openNotchSize and corner radii from sizing/matters.swift.
const OPEN = { w: 640, h: 190 };
const RADII = { open: { top: 19, bottom: 24 }, closed: { top: 6, bottom: 14 } };
// ContentView.handleHover waits this long after the pointer leaves before closing.
const CLOSE_DELAY_MS = 100;
// One trackpad swipe sends a burst of wheel events; this keeps it to one gesture.
const GESTURE_GAP_MS = 450;
const GESTURE_MIN = 15;
// Share of the close spring the open content stays for; past this it's too small to see.
const LINGER = 0.6;

export function Island() {
  const { open, tab, transient, timerEnd, ringing, mirror, setOpen, setTab } = useIsland();
  const hoverOpen = useSettings((s) => s.hoverOpen);
  const hoverDelay = useSettings((s) => s.hoverDelay);
  const showCalendar = useSettings((s) => s.showCalendar);
  const showDownloads = useSettings((s) => s.showDownloads);
  const playing = useSystem((s) => s.media !== null);
  const audible = useSystem((s) => s.media?.playing ?? false);
  const cover = useCover();
  const tint = useCoverColor();
  const downloading = useSystem((s) => s.downloading) && showDownloads;
  const { accent, camera, mic } = useSystem();
  const joining = useMeeting() !== null;
  const [hover, setHover] = useState(false);
  // The open content outlives `open` by part of the close, so the shrinking shape clips and fades it
  // instead of it vanishing on the first frame.
  const [showOpen, setShowOpen] = useState(open);
  if (open && !showOpen) setShowOpen(true);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastGesture = useRef(0);

  const size = open ? OPEN : closedSize(transient, playing || downloading || ringing, timerEnd !== null && !ringing, joining, hover);
  const radii = open || size.h > OPEN.h / 2 ? RADII.open : RADII.closed;
  const motion = open ? OPEN_SPRING : CLOSE_SPRING;

  // The window is click-through everywhere except this rect, which Rust hit-tests against the cursor.
  useEffect(() => {
    void invoke('set_hit', { rect: { x: (window.innerWidth - size.w) / 2, y: 0, w: size.w, h: size.h } });
  }, [size.w, size.h]);

  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => setShowOpen(false), CLOSE_SPRING.ms * LINGER);
    return () => clearTimeout(t);
  }, [open]);

  // Files dragged from Explorer arrive through Tauri, not the DOM: hovering opens the shelf to catch them,
  // and a drag that moves on without dropping closes it again, since no pointer events come during a drag.
  useEffect(() => {
    const off = getCurrentWebview().onDragDropEvent((e) => {
      if (e.payload.type === 'enter') setTab('shelf');
      if (e.payload.type === 'drop') useShelf.getState().add(e.payload.paths);
      if (e.payload.type === 'leave') {
        setHover(false);
        setOpen(false);
      }
    });
    return () => void off.then((stop) => stop());
  }, [setTab, setOpen]);

  // Ctrl+Alt+Space, sent by Rust to the island on the pointer's monitor.
  useEffect(() => {
    const off = getCurrentWebviewWindow().listen('toggle-island', () => setOpen(!useIsland.getState().open));
    return () => void off.then((stop) => stop());
  }, [setOpen]);

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

  // Visor's gestures: scroll down to open, up to close, sideways on the closed island to change track.
  const gesture = (e: React.WheelEvent) => {
    if (e.timeStamp - lastGesture.current < GESTURE_GAP_MS) return;
    const sideways = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    let done = true;
    if (sideways && !open && Math.abs(e.deltaX) > GESTURE_MIN) media({ kind: e.deltaX > 0 ? 'next' : 'previous' }).catch(report);
    else if (!sideways && !open && e.deltaY > GESTURE_MIN) setOpen(true);
    else if (!sideways && open && e.deltaY < -GESTURE_MIN) setOpen(false);
    else done = false;
    if (done) lastGesture.current = e.timeStamp;
  };

  return (
    <div
      className={`island${open ? ' is-open' : ''}${hover ? ' is-hover' : ''}${audible ? ' is-playing' : ''}${transient ? ' has-transient' : ''}`}
      style={
        {
          '--w': `${size.w}px`,
          '--h': `${size.h}px`,
          '--top': `${radii.top}px`,
          '--bottom': `${radii.bottom}px`,
          '--ms': `${motion.ms}ms`,
          '--ease': motion.easing,
          '--accent': accent,
          '--cover': cover ? `url(${cover})` : 'none',
          '--tint': tint ?? accent,
        } as React.CSSProperties
      }
      onPointerEnter={enter}
      onPointerLeave={leave}
      onWheel={gesture}
    >
      <span className="island-ambient" aria-hidden />
      {(camera || mic) && (
        <span className="island-privacy" role="status" aria-label={[camera && 'Camera', mic && 'Microphone'].filter(Boolean).join(' and ') + ' in use'}>
          {camera && <i className="is-camera" />}
          {mic && <i className="is-mic" />}
        </span>
      )}
      <div className="island-clip">
        {showOpen && (
          <div className={`island-open${open ? '' : ' is-leaving'}`} inert={!open}>
            <Header />
            {tab === 'home' ? (
              <div className="home">
                <Player />
                {showCalendar && <Calendar />}
                {mirror && open && <Mirror />}
              </div>
            ) : (
              <Shelf />
            )}
            {transient?.kind === 'error' && (
              <div className="island-toast">
                <ErrorNote text={transient.text} />
              </div>
            )}
          </div>
        )}
        {!open && (
          <button className="island-hit" aria-label="Open Visor" onClick={() => setOpen(true)}>
            <Closed />
          </button>
        )}
      </div>
    </div>
  );
}
