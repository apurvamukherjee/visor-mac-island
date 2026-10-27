import { lazy, Suspense } from 'react';
import { icons, Padlock } from '../../../website/src/os/ControlCenter/icons';
import { useNow } from '../../../website/src/os/useNow';
import { useSystem } from '../native';
import { useSettings } from '../settings/store';
import { useCover, useMeeting } from './queries';
import { useIsland, type Transient } from './store';

// three.js loads only when a device first connects.
const Device = lazy(() => import('./Device').then((m) => ({ default: m.Device })));

export const CLOSED_W = 185;
export const CLOSED_H = 32;
const WING = 50;

/** The closed island's size: the bare pill, or wider for whatever it's showing. */
export function closedSize(transient: Transient | null, hasActivity: boolean, timer: boolean, joining: boolean) {
  const h = CLOSED_H;
  if (transient) {
    const w = { hud: 380, battery: 360, peek: 420, unlock: CLOSED_W + 70, screenshot: 360, device: 400 }[transient.kind];
    return { w, h: transient.kind === 'device' ? 112 : h };
  }
  if (joining) return { w: 400, h };
  if (timer) return { w: CLOSED_W + 130, h };
  return { w: hasActivity ? CLOSED_W + 2 * WING : CLOSED_W, h };
}

export function Cover({ size }: { size: number }) {
  const cover = useCover();
  return (
    <span className="cover" style={{ width: size, height: size }}>
      {cover ? <img src={cover} alt="" width={size} height={size} /> : <i className="cover-empty" aria-hidden>♪</i>}
    </span>
  );
}

export function Visualizer({ playing }: { playing: boolean }) {
  return (
    <span className={`visualizer${playing ? '' : ' is-paused'}`} aria-hidden>
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

/** The Mac's menu bar battery: green charging, yellow in energy saver, red at 20% and under. */
export function BatteryCell({ level, charging, saver = false }: { level: number; charging: boolean; saver?: boolean }) {
  const percent = Math.round(level * 100);
  const mood = charging ? ' is-charging' : saver ? ' is-saver' : level <= 0.2 ? ' is-low' : '';
  return (
    <span className={`battery${mood}`} role="img" aria-label={`Battery ${percent}%${charging ? ', charging' : ''}`}>
      <span aria-hidden>
        {percent}
        <small>%</small>
      </span>
      <span className="battery-cell" aria-hidden>
        {/* A sliver stays at 0% so the cell never reads as empty outline. */}
        <i style={{ width: `${Math.max(level, 0.06) * 100}%` }} />
        {charging && (
          <svg className="battery-bolt" viewBox="0 0 24 24">
            <path d="M13.5 2 4 13.5h7L10 22l9.5-11.5h-7z" />
          </svg>
        )}
      </span>
    </span>
  );
}

function Hud({ t }: { t: Extract<Transient, { kind: 'hud' }> }) {
  const value = t.muted ? 0 : t.value;
  const icon = t.hud === 'brightness' ? icons.sunLarge : t.muted || value === 0 ? icons.speaker : icons.speakerLoud;
  return (
    <div className="closed closed-hud" role="status" aria-label={`${t.hud} ${Math.round(value * 100)}%`}>
      <span className="closed-hud-icon" aria-hidden>
        {icon}
      </span>
      <span className="closed-hud-bar">
        <i style={{ width: `${value * 100}%` }} />
      </span>
    </div>
  );
}

function Countdown({ end }: { end: number }) {
  const left = Math.max(0, end - useNow(500).getTime());
  const s = Math.ceil(left / 1000);
  return (
    <span className="closed-timer">
      {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
    </span>
  );
}

function DownloadRing() {
  return (
    <svg className="closed-download" viewBox="0 0 20 20" width="18" height="18" role="img" aria-label="Downloading">
      <circle cx="10" cy="10" r="8" fill="none" stroke="rgb(255 255 255 / 0.2)" strokeWidth="2.5" />
      <circle className="closed-download-ring" cx="10" cy="10" r="8" fill="none" strokeWidth="2.5" strokeLinecap="round" pathLength="100" transform="rotate(-90 10 10)" />
    </svg>
  );
}

export function Closed() {
  const transient = useIsland((s) => s.transient);
  const timerEnd = useIsland((s) => s.timerEnd);
  const ringing = useIsland((s) => s.ringing);
  const media = useSystem((s) => s.media);
  const battery = useSystem((s) => s.battery);
  const showDownloads = useSettings((s) => s.showDownloads);
  const downloading = useSystem((s) => s.downloading) && showDownloads;
  const meeting = useMeeting();

  if (transient?.kind === 'unlock') {
    return (
      <div className="closed closed-lock" role="status" aria-label="Unlocked">
        <Padlock size={16} open />
      </div>
    );
  }
  if (transient?.kind === 'hud') return <Hud t={transient} />;
  if (transient?.kind === 'battery') {
    return (
      <div className="closed closed-battery" role="status">
        <span className={transient.charging ? 'is-charging' : ''}>{transient.charging ? 'Charging' : battery?.saver ? 'Energy saver' : 'On battery'}</span>
        <BatteryCell level={transient.level} charging={transient.charging} saver={battery?.saver} />
      </div>
    );
  }
  if (transient?.kind === 'screenshot') {
    return (
      <div className="closed closed-peek" role="status">
        <span className="closed-hud-icon" aria-hidden>
          {icons.screenshot}
        </span>
        <span className="closed-peek-text">Screenshot on the shelf</span>
      </div>
    );
  }
  if (transient?.kind === 'device') {
    return (
      <div className="closed closed-device" role="status" aria-label={`${transient.name} connected`}>
        <Suspense fallback={<span className="device-model" />}>
          <Device kind={transient.device} />
        </Suspense>
        <span className="closed-device-text">
          <b>{transient.name}</b>
          <span>Connected</span>
        </span>
      </div>
    );
  }
  if (transient?.kind === 'peek' && media) {
    return (
      <div className="closed closed-peek" role="status" aria-label={`Now playing ${media.title} by ${media.artist}`}>
        <Cover size={22} />
        <span className="closed-peek-text">
          <b>{media.title}</b> · {media.artist}
        </span>
        <Visualizer playing={media.playing} />
      </div>
    );
  }
  if (meeting?.call) {
    return (
      <div className="closed closed-join" role="status">
        <span className="closed-join-title">{meeting.title}</span>
        <span className="closed-join-pill">Join {meeting.call.app}</span>
      </div>
    );
  }

  // Wings: music on the left; on the right a timer, then a download, then the visualizer.
  const right = ringing ? (
    <svg className="closed-bell" viewBox="0 0 24 24" width="16" height="16" role="status" aria-label="Timer done">
      <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 8 2.5 8h-17S6 15 6 9M10 20.5a2.2 2.2 0 0 0 4 0" />
    </svg>
  ) : timerEnd ? (
    <Countdown end={timerEnd} />
  ) : downloading ? (
    <DownloadRing />
  ) : media ? (
    <Visualizer playing={media.playing} />
  ) : null;
  if (!media && !right) return null;
  return (
    <div className="closed">
      {media ? <Cover size={22} /> : <span />}
      {right}
    </div>
  );
}
