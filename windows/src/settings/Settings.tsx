import { useQuery } from '@tanstack/react-query';
import { getVersion } from '@tauri-apps/api/app';
import { useUpdate } from '../island/queries';
import { openTarget, report } from '../native';
import { useSettings, type SettingsValues } from './store';
import './Settings.css';

type Flag = { [K in keyof SettingsValues]: SettingsValues[K] extends boolean ? K : never }[keyof SettingsValues];

function Toggle({ flag, label, hint }: { flag: Flag; label: string; hint?: string }) {
  const value = useSettings((s) => s[flag]);
  const set = useSettings((s) => s.set);
  return (
    <label className="settings-row">
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <input type="checkbox" role="switch" checked={value} onChange={(e) => set({ [flag]: e.target.checked })} />
    </label>
  );
}

function Welcome() {
  const set = useSettings((s) => s.set);
  return (
    <section className="settings-welcome">
      <h1>Welcome to Visor</h1>
      <p>
        The island at the top of each screen shows what's playing, your volume and brightness, timers, calls and files. Rest the pointer on it to
        open it; scroll up on it to close.
      </p>
      <Toggle flag="launchAtLogin" label="Start Visor when you sign in" />
      <button className="settings-primary" onClick={() => set({ onboarded: true })}>
        Get started
      </button>
    </section>
  );
}

function About() {
  const version = useQuery({ queryKey: ['version'], queryFn: getVersion, staleTime: Infinity }).data;
  const update = useUpdate();
  return (
    <section>
      <h2>About</h2>
      <div className="settings-row">
        <span>Visor for Windows {version}</span>
        {update.data ? (
          <button className="settings-primary" onClick={() => update.data && openTarget(update.data.url).catch(report)}>
            Get {update.data.version}
          </button>
        ) : (
          <button disabled={update.isFetching} onClick={() => void update.refetch()}>
            {update.isFetching ? 'Checking…' : update.isError ? 'Check failed, retry' : 'Check for updates'}
          </button>
        )}
      </div>
      <Toggle flag="checkForUpdates" label="Check for updates daily" />
    </section>
  );
}

export function Settings() {
  const { onboarded, hoverOpen, hoverDelay, calendars, showCalendar, set } = useSettings();
  return (
    <main className="settings">
      {!onboarded && <Welcome />}

      <section>
        <h2>General</h2>
        <Toggle flag="launchAtLogin" label="Start at sign-in" />
        <Toggle flag="hoverOpen" label="Open on hover" />
        <label className="settings-row">
          Hover delay
          <span className="settings-range">
            <input type="range" min={0} max={1} step={0.1} value={hoverDelay} disabled={!hoverOpen} onChange={(e) => set({ hoverDelay: e.target.valueAsNumber })} />
            <output>{hoverDelay.toFixed(1)}s</output>
          </span>
        </label>
        <Toggle flag="hideInFullscreen" label="Hide during full-screen apps" />
        <Toggle flag="hideFromCapture" label="Hide from screenshots and screen sharing" />
        <Toggle flag="replaceHud" label="Volume and brightness in the island" hint="Replaces the Windows volume flyout. Brightness still shows both." />
        <Toggle flag="showBattery" label="Battery in the open island" />
      </section>

      <section>
        <h2>Music</h2>
        <Toggle flag="sneakPeek" label="Sneak peek on song change" />
        <Toggle flag="vinyl" label="Vinyl record instead of cover" />
        <Toggle flag="lyrics" label="Synced lyrics" hint="From LRCLIB, when it has the song." />
      </section>

      <section>
        <h2>Calendar</h2>
        <Toggle flag="showCalendar" label="Calendar in the island" />
        <label className="settings-stack">
          Calendar links (ICS), one per line
          <small>Outlook: Settings › Calendar › Shared calendars › Publish. Google: a calendar's settings › Secret address in iCal format.</small>
          <textarea rows={3} spellCheck={false} value={calendars} placeholder="https://…/calendar.ics" onChange={(e) => set({ calendars: e.target.value })} />
        </label>
        <Toggle flag="meetingAlerts" label="Join button before video calls" />
        <Toggle flag="showWeather" label={showCalendar ? 'Weather beside the calendar' : 'Weather (needs the calendar)'} hint="Uses Windows location, rounded to about a kilometre." />
      </section>

      <section>
        <h2>Shelf</h2>
        <Toggle flag="catchScreenshots" label="Put new screenshots on the shelf" />
        <Toggle flag="showDownloads" label="Download progress in the island" />
      </section>

      <section>
        <h2>Extras</h2>
        <Toggle flag="showTimer" label="Timer" />
        <Toggle flag="showMirror" label="Mirror (camera preview)" />
        <Toggle flag="deviceAnimation" label="3D model when earbuds or a soundbar connect" hint="AirPods, OnePlus Buds and JBL bars." />
      </section>

      <About />
    </main>
  );
}
