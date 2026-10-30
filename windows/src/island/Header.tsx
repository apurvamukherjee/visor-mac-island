import { useState } from 'react';
import { useNow } from '../../../website/src/os/useNow';
import { openTarget, report, showSettings, useSystem } from '../native';
import { useSettings } from '../settings/store';
import { BatteryCell } from './Closed';
import { useMeeting, useUpdate } from './queries';
import { TIMER_PRESETS, useIsland, type Tab } from './store';

const tabs: { id: Tab; label: string; path: string }[] = [
  { id: 'home', label: 'Home', path: 'M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z' },
  { id: 'shelf', label: 'Shelf', path: 'M4 13l2-8h12l2 8v6H4zm2.3 0H9a3 3 0 0 0 6 0h2.7l-1.4-6H7.7z' },
];

const glyph = (d: string) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);
const timerIcon = glyph('M12 8v5l3 2M9 2h6M12 22a9 9 0 1 0 0-18 9 9 0 0 0 0 18z');
const cameraIcon = glyph('M15 10l5-3v10l-5-3zM3 7h12v10H3z');
const gearIcon = glyph(
  'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.1a2 2 0 1 1 0 4z',
);

function Timer() {
  const timerEnd = useIsland((s) => s.timerEnd);
  const { startTimer, stopTimer } = useIsland();
  const now = useNow(timerEnd ? 500 : 60_000).getTime();
  const [choosing, setChoosing] = useState(false);

  if (timerEnd) {
    const s = Math.ceil(Math.max(0, timerEnd - now) / 1000);
    return (
      <button className="header-pill is-timer" aria-label="Stop the timer" onClick={stopTimer}>
        {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')} ✕
      </button>
    );
  }
  if (choosing) {
    return (
      <span className="timer-presets" role="group" aria-label="Start a timer">
        {TIMER_PRESETS.map((m) => (
          <button
            key={m}
            onClick={() => {
              startTimer(m);
              setChoosing(false);
            }}
          >
            {m < 60 ? `${m}m` : '1h'}
          </button>
        ))}
        <button aria-label="Cancel" onClick={() => setChoosing(false)}>
          ✕
        </button>
      </span>
    );
  }
  return (
    <button className="header-btn" aria-label="Timer" onClick={() => setChoosing(true)}>
      {timerIcon}
    </button>
  );
}

export function Header() {
  const tab = useIsland((s) => s.tab);
  const setTab = useIsland((s) => s.setTab);
  const toggleMirror = useIsland((s) => s.toggleMirror);
  const showTimer = useSettings((s) => s.showTimer);
  const showMirror = useSettings((s) => s.showMirror);
  const showBattery = useSettings((s) => s.showBattery);
  const battery = useSystem((s) => s.battery);
  const meeting = useMeeting();
  const update = useUpdate().data;

  return (
    <div className="island-header">
      <div className="island-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} aria-label={t.label} className="island-tab" onClick={() => setTab(t.id)}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d={t.path} />
            </svg>
          </button>
        ))}
      </div>
      <div className="island-header-right">
        {meeting?.call && (
          <button className="header-pill is-join" title={`Join ${meeting.title}`} onClick={() => meeting.call && openTarget(meeting.call.url).catch(report)}>
            Join
          </button>
        )}
        {showTimer && <Timer />}
        {showMirror && (
          <button className="header-btn" aria-label="Mirror" onClick={toggleMirror}>
            {cameraIcon}
          </button>
        )}
        <button className={`header-btn${update ? ' has-update' : ''}`} aria-label={update ? `Settings, Visor ${update.version} is out` : 'Settings'} onClick={() => showSettings().catch(report)}>
          {gearIcon}
        </button>
        {showBattery && battery && <BatteryCell level={battery.level} charging={battery.charging} saver={battery.saver} />}
      </div>
    </div>
  );
}
