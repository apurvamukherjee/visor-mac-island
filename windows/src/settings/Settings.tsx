import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVersion } from '@tauri-apps/api/app';
import { links } from '../../../website/src/links';
import { useUpdate } from '../island/queries';
import { openTarget, report, useSystem } from '../native';
import icon from '../../src-tauri/icons/128x128.png';
import { useSettings, type SettingsValues } from './store';
import './Settings.css';

type Flag = { [K in keyof SettingsValues]: SettingsValues[K] extends boolean ? K : never }[keyof SettingsValues];
type PaneId = 'general' | 'music' | 'calendar' | 'shelf' | 'extras' | 'about';

const glyph = (d: string) => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d={d} />
  </svg>
);

// Colors from macOS System Settings' sidebar tiles, so each pane reads at a glance.
const panes: Record<PaneId, { title: string; blurb: string; color: string; icon: ReactNode }> = {
  general: { title: 'General', blurb: 'How the island opens, hides and starts.', color: '#8e8e93', icon: glyph('M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6') },
  music: { title: 'Music', blurb: 'Whatever is playing in the Windows media flyout.', color: '#ff2d55', icon: glyph('M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z') },
  calendar: { title: 'Calendar', blurb: 'Your day and your next call, from any ICS link.', color: '#ff3b30', icon: glyph('M4 6h16v14H4zM4 10h16M8 3v4M16 3v4') },
  shelf: { title: 'Shelf', blurb: 'Files you drop on the island, kept until you drag them out.', color: '#0a84ff', icon: glyph('M4 13l2-8h12l2 8v6H4zM4 13h5a3 3 0 0 0 6 0h5') },
  extras: { title: 'Extras', blurb: 'Small things that make the island feel alive.', color: '#bf5af2', icon: glyph('M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z') },
  about: { title: 'About', blurb: 'Version, updates and where Visor lives.', color: '#636366', icon: glyph('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01') },
};
const order = Object.keys(panes) as PaneId[];

function Toggle({ flag, label, hint, disabled }: { flag: Flag; label: string; hint?: string; disabled?: boolean }) {
  const value = useSettings((s) => s[flag]);
  const set = useSettings((s) => s.set);
  return (
    <label className={`row${disabled ? ' is-disabled' : ''}`}>
      <span className="row-text">
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <input type="checkbox" role="switch" className="switch" checked={value} disabled={disabled} onChange={(e) => set({ [flag]: e.target.checked })} />
    </label>
  );
}

function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="group">
      {title && <h3>{title}</h3>}
      <div className="group-card">{children}</div>
    </section>
  );
}

function General() {
  const { hoverOpen, hoverDelay, set } = useSettings();
  return (
    <>
      <Group title="Island">
        <Toggle flag="hoverOpen" label="Open on hover" hint="Otherwise click the island, or scroll down on it." />
        <label className={`row${hoverOpen ? '' : ' is-disabled'}`}>
          <span className="row-text">
            Hover delay
            <small>How long the pointer rests before the island opens.</small>
          </span>
          <span className="range">
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={hoverDelay}
              disabled={!hoverOpen}
              style={{ '--p': `${hoverDelay * 100}%` } as React.CSSProperties}
              onChange={(e) => set({ hoverDelay: e.target.valueAsNumber })}
            />
            <output>{hoverDelay.toFixed(1)}s</output>
          </span>
        </label>
        <Toggle flag="hideInFullscreen" label="Hide during full-screen apps" hint="Steps aside for games and videos, on that monitor only." />
        <Toggle flag="showBattery" label="Battery in the open island" />
      </Group>
      <Group title="System">
        <Toggle flag="launchAtLogin" label="Start at sign-in" />
        <Toggle flag="replaceHud" label="Volume and brightness in the island" hint="Replaces the Windows volume flyout. Brightness still shows both." />
        <Toggle flag="hideFromCapture" label="Hide from screenshots and screen sharing" />
      </Group>
    </>
  );
}

function Music() {
  return (
    <Group>
      <Toggle flag="sneakPeek" label="Sneak peek on song change" hint="The title slides out of the closed island for a moment." />
      <Toggle flag="vinyl" label="Vinyl record instead of cover" />
      <Toggle flag="lyrics" label="Show lyrics below artist name" hint="Synced to the song from LRCLIB, when it has it." />
    </Group>
  );
}

function Calendar() {
  const { calendars, showCalendar, set } = useSettings();
  return (
    <>
      <Group>
        <Toggle flag="showCalendar" label="Calendar in the island" />
        <Toggle flag="meetingAlerts" label="Join button before video calls" hint="Zoom, Meet, Teams, Webex, Whereby and Slack links." />
        <Toggle flag="showWeather" label="Weather beside the calendar" hint={showCalendar ? 'Uses Windows location, rounded to about a kilometre.' : 'Turn on the calendar first.'} disabled={!showCalendar} />
      </Group>
      <Group title="Calendar links">
        <label className="row row-stack">
          <span className="row-text">
            ICS links, one per line
            <small>Outlook: Settings › Calendar › Shared calendars › Publish. Google: a calendar's settings › Secret address in iCal format.</small>
          </span>
          <textarea rows={3} spellCheck={false} value={calendars} placeholder="https://…/calendar.ics" onChange={(e) => set({ calendars: e.target.value })} />
        </label>
      </Group>
    </>
  );
}

function Shelf() {
  return (
    <Group>
      <Toggle flag="catchScreenshots" label="Put new screenshots on the shelf" hint="Anything saved to Pictures › Screenshots." />
      <Toggle flag="showDownloads" label="Download progress in the island" />
    </Group>
  );
}

function Extras() {
  return (
    <Group>
      <Toggle flag="showTimer" label="Timer" />
      <Toggle flag="showMirror" label="Mirror" hint="A camera preview, for a quick check before a call." />
      <Toggle flag="deviceAnimation" label="3D model when headphones or a soundbar connect" hint="AirPods, OnePlus Buds, boAt Rockerz and JBL bars." />
    </Group>
  );
}

function useVersion() {
  return useQuery({ queryKey: ['version'], queryFn: getVersion, staleTime: Infinity }).data;
}

function About() {
  const version = useVersion();
  const update = useUpdate();
  const open = (url: string) => openTarget(url).catch(report);
  return (
    <>
      <div className="about">
        <img src={icon} alt="" width={72} height={72} />
        <div>
          <h2>Visor for Windows</h2>
          <p>Version {version}</p>
        </div>
        {update.data ? (
          <button className="button is-primary" onClick={() => update.data && open(update.data.url)}>
            Get {update.data.version}
          </button>
        ) : (
          <button className="button" disabled={update.isFetching} onClick={() => void update.refetch()}>
            {update.isFetching ? 'Checking…' : update.isError ? 'Check failed, retry' : 'Check for updates'}
          </button>
        )}
      </div>
      <Group>
        <Toggle flag="checkForUpdates" label="Check for updates daily" />
      </Group>
      <Group>
        <button className="row row-link" onClick={() => open(links.changelog)}>
          What's new <span aria-hidden>›</span>
        </button>
        <button className="row row-link" onClick={() => open(links.newIssue)}>
          Report a problem <span aria-hidden>›</span>
        </button>
        <button className="row row-link" onClick={() => open(links.repo)}>
          Source on GitHub <span aria-hidden>›</span>
        </button>
      </Group>
    </>
  );
}

const bodies: Record<PaneId, () => ReactNode> = { general: General, music: Music, calendar: Calendar, shelf: Shelf, extras: Extras, about: About };

function Welcome() {
  const set = useSettings((s) => s.set);
  return (
    <main className="welcome">
      <img src={icon} alt="" width={96} height={96} />
      <h1>Welcome to Visor</h1>
      <p>The island at the top of each screen shows what's playing, your volume, timers, calls and files.</p>
      <ul>
        <li>
          <b>Rest the pointer on it</b> to open it, move away to close.
        </li>
        <li>
          <b>Drop files on it</b> to keep them on the shelf.
        </li>
        <li>
          <b>Scroll sideways</b> on it to skip a song.
        </li>
      </ul>
      <Group>
        <Toggle flag="launchAtLogin" label="Start Visor when you sign in" />
      </Group>
      <button className="button is-primary is-large" onClick={() => set({ onboarded: true })}>
        Get started
      </button>
    </main>
  );
}

export function Settings() {
  const onboarded = useSettings((s) => s.onboarded);
  const accent = useSystem((s) => s.accent);
  const hasUpdate = useUpdate().data != null;
  const version = useVersion();
  const [id, setId] = useState<PaneId>('general');
  const pane = panes[id];
  const Body = bodies[id];

  return (
    <div className="settings" style={{ '--accent': accent } as React.CSSProperties}>
      {!onboarded ? (
        <Welcome />
      ) : (
        <>
          <nav className="sidebar">
            <div className="sidebar-app">
              <img src={icon} alt="" width={36} height={36} />
              <span>
                Visor
                <small>{version}</small>
              </span>
            </div>
            {order.map((key) => (
              <button key={key} className="sidebar-item" aria-current={key === id ? 'page' : undefined} onClick={() => setId(key)}>
                <span className="tile" style={{ background: panes[key].color }}>
                  {panes[key].icon}
                </span>
                {panes[key].title}
                {key === 'about' && hasUpdate && <i className="sidebar-badge" aria-label="Update available" />}
              </button>
            ))}
          </nav>
          <main className="pane" key={id}>
            <header>
              <h1>{pane.title}</h1>
              <p>{pane.blurb}</p>
            </header>
            <Body />
          </main>
        </>
      )}
    </div>
  );
}
