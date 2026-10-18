import { apps, type AppId } from '../apps/apps';
import { openNote } from '../apps/Notes/Notes';
import { links } from '../links';
import { Cover } from '../notch/Cover';
import { useNotch } from '../notch/store';
import { trackAt } from '../notch/tracks';
import { useNow } from '../os/useNow';
import { batteryColor, useBattery } from '../store/battery';
import { useLock } from '../store/lock';
import { useWindows } from '../store/windows';
import { CITY, describe, useWeather } from './weather';
import { offsetLabel, zoned } from './zones';
import './Widgets.css';

const open = (id: AppId) => useWindows.getState().open(id);

function DownloadWidget() {
  const { version } = __RELEASE__;
  return (
    <section className="widget widget-download" aria-label="Download Visor">
      <div className="widget-download-head">
        <img src={`${import.meta.env.BASE_URL}icon.png`} alt="" width={56} height={56} />
        <div>
          <b>Visor</b>
          <small>for macOS · Free &amp; Open Source</small>
        </div>
      </div>
      <a className="widget-download-btn" href={links.dmg}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 4v13M6 11l6 6 6-6" /></svg>
        Download
      </a>
      <div className="widget-download-meta">
        <span>v{version} · Apple silicon · macOS 14+</span>
        <a href={links.repo} target="_blank" rel="noreferrer">GitHub ↗</a>
      </div>
      <button className="widget-download-more" onClick={() => openNote('new')}>What’s new in {version} →</button>
    </section>
  );
}

function CalendarWidget() {
  const now = useNow(60_000);
  return (
    <button className="widget widget-small widget-calendar" onClick={() => useNotch.getState().setOpen(true)}>
      <span className="widget-calendar-day">{now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}</span>
      <span className="widget-calendar-date">{now.getDate()}</span>
      <span className="widget-calendar-next">UP NEXT</span>
      <span>🟢 Visor stand-up</span>
    </button>
  );
}

function WeatherWidget() {
  const { data, isError } = useWeather();
  const d = data && describe(data.code);
  return (
    <button className="widget widget-small widget-weather" onClick={() => open('weather')}>
      <b>{CITY.name}</b>
      <span className="widget-weather-temp">{data ? `${Math.round(data.temp)}°` : isError ? '—' : '…'}</span>
      {d && data && (
        <>
          <span>{d.icon}</span>
          <span>{d.text}</span>
          <small>H:{Math.round(data.high)}° L:{Math.round(data.low)}°</small>
        </>
      )}
    </button>
  );
}

export const CITIES = [
  { name: 'Kolkata', tz: 'Asia/Kolkata' },
  { name: 'Tokyo', tz: 'Asia/Tokyo' },
  { name: 'London', tz: 'Europe/London' },
  { name: 'Cupertino', tz: 'America/Los_Angeles' },
];

export function Clock({ tz, name, now, size = 62 }: { tz: string; name: string; now: Date; size?: number }) {
  const { h, m, s } = zoned(now, tz);
  const night = h < 6 || h >= 18;
  const { when, diff } = offsetLabel(now, tz);
  const hand = (deg: number, len: number, w: number, color: string) => <line x1="50" y1="50" x2="50" y2={50 - len} stroke={color} strokeWidth={w} strokeLinecap="round" transform={`rotate(${deg} 50 50)`} />;
  return (
    <figure className="widget-clock">
      <svg viewBox="0 0 100 100" width={size} height={size} aria-label={`${name} ${h}:${String(m).padStart(2, '0')}`}>
        <circle cx="50" cy="50" r="49" fill={night ? '#1c1c1e' : '#fff'} />
        {Array.from({ length: 12 }, (_, i) => {
          const a = ((i + 1) * Math.PI) / 6;
          return <text key={i} x={50 + 38 * Math.sin(a)} y={50 - 38 * Math.cos(a)} dy="0.35em" textAnchor="middle" fontSize="11" fontWeight="600" fill={night ? '#fff' : '#1c1c1e'}>{i + 1}</text>;
        })}
        {hand(((h % 12) + m / 60) * 30, 22, 4.5, night ? '#fff' : '#1c1c1e')}
        {hand((m + s / 60) * 6, 33, 3, night ? '#fff' : '#1c1c1e')}
        {hand(s * 6, 36, 1.2, '#ff9500')}
        <circle cx="50" cy="50" r="2.6" fill="#ff9500" />
      </svg>
      <figcaption><b>{name}</b><small>{when}</small><small>{diff}</small></figcaption>
    </figure>
  );
}

function ClocksWidget() {
  const now = useNow(1000);
  return (
    <button className="widget widget-wide widget-clocks" onClick={() => open('clock')} aria-label="World Clock">
      {CITIES.map((c) => <Clock key={c.name} {...c} now={now} />)}
    </button>
  );
}

function BatteryWidget() {
  const { supported, level, charging } = useBattery();
  const pct = supported ? Math.round(level * 100) : 100;
  return (
    // Clicking replays the plug-in heads-up, since few visitors will unplug to see it.
    <button className="widget widget-small widget-battery" aria-label={`Battery ${pct}%. Show Visor's charging heads-up`} onClick={() => useNotch.getState().flash({ kind: 'battery', charging: true, level: pct / 100 }, 2500)}>
      <svg viewBox="0 0 100 100" width="76" height="76" aria-hidden>
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(255 255 255 / 0.15)" strokeWidth="8" />
        <circle cx="50" cy="50" r="42" fill="none" stroke={batteryColor(level, charging, '#fff')} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 264} 264`} transform="rotate(-90 50 50)" />
        <text x="50" y="50" dy="0.35em" textAnchor="middle" fontSize="26" fill="#fff">💻</text>
      </svg>
      <b>{pct}%</b>
    </button>
  );
}

function MusicWidget() {
  const { track, playing, togglePlay } = useNotch();
  const t = trackAt(track);
  return (
    <section className="widget widget-small widget-music" aria-label="Now Playing">
      <Cover track={t} size={58} />
      <b>{t.title}</b>
      <small>{t.artist}</small>
      <button onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '❚❚' : '▶'}</button>
    </section>
  );
}

function PortfolioWidget() {
  return (
    <section className="widget widget-portfolio" aria-label="apurva.space">
      <div className="widget-portfolio-frame">
        <iframe title="apurva.space preview" src="https://apurva.space" loading="lazy" tabIndex={-1} sandbox="allow-scripts allow-same-origin" />
        <button className="widget-portfolio-hit" aria-label="Open apurva.space in Safari" onClick={() => open('safari')} />
      </div>
      <div className="widget-portfolio-foot">
        <span><b>Apurva Mukherjee</b><small>Full-stack engineer · Kolkata</small></span>
        <a href="https://apurva.space" target="_blank" rel="noreferrer">apurva.space ↗</a>
      </div>
    </section>
  );
}

function StarWidget() {
  return (
    <a className="widget widget-star" href={links.repo} target="_blank" rel="noreferrer">
      <img src={apps.github.icon} alt="" width={34} height={34} />
      <span><b>Star Visor on GitHub</b><small>Open source, GPL-3.0</small></span>
      <span className="widget-star-btn">★ Star</span>
    </a>
  );
}

function LockWidget() {
  return (
    <button className="widget widget-wide widget-lock" onClick={() => useLock.getState().lock()}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
        <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <rect x="5" y="11" width="14" height="10" rx="2.5" fill="currentColor" />
      </svg>
      <span><b>Lock Screen</b><small>See Visor’s padlock in the notch</small></span>
      <kbd>⌃⌘Q</kbd>
    </button>
  );
}

function Sticky() {
  return (
    <a className="widget-sticky" href="https://apurva.space" target="_blank" rel="noreferrer">
      <span className="widget-sticky-pin" aria-hidden>📌</span>
      <b>built with 💛 by a majdoor</b>
      <span>apurva.space</span>
    </a>
  );
}

export function Widgets() {
  return (
    <>
      <aside className="widgets widgets-left" aria-label="Widgets">
        <PortfolioWidget />
        <StarWidget />
        <Sticky />
      </aside>
      <aside className="widgets widgets-right" aria-label="Widgets">
        <DownloadWidget />
        <CalendarWidget />
        <WeatherWidget />
        <ClocksWidget />
        <LockWidget />
        <MusicWidget />
        <BatteryWidget />
      </aside>
    </>
  );
}
