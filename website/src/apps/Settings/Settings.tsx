import { useState, type ReactNode } from 'react';
import { links } from '../../links';
import { wallpaperUrl, wallpapers } from '../../os/Wallpaper/wallpapers';
import { useSettings } from '../../store/settings';
import avatar from '../../os/LockScreen/apurva.webp';
import './Settings.css';

const ACCENTS = ['#ff2d55', '#0a84ff', '#bf5af2', '#30d158', '#ff9f0a', '#ffd60a', '#8e8e93'];
const MAX_DIM = 0.75;

type Pane = 'Wi-Fi' | 'Bluetooth' | 'Appearance' | 'Wallpaper' | 'Displays' | 'Sound' | 'Visor' | 'About';
const panes: [Pane, string][] = [['Wi-Fi', '📶'], ['Bluetooth', '🔷'], ['Appearance', '🎨'], ['Wallpaper', '🖼️'], ['Displays', '☀️'], ['Sound', '🔊'], ['Visor', '⬛'], ['About', 'ℹ️']];

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div className="set-row"><span>{label}</span>{children}</div>;
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button role="switch" aria-checked={on} aria-label={label} className={`set-switch${on ? ' is-on' : ''}`} onClick={() => onChange(!on)} />;
}

export function Settings() {
  const [pane, setPane] = useState<Pane>('Appearance');
  const [query, setQuery] = useState('');
  const [wifi, setWifi] = useState(true);
  const [bt, setBt] = useState(true);
  const st = useSettings();
  const shown = panes.filter(([p]) => p.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="set">
      <nav className="set-side" aria-label="Settings">
        <input placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search settings" />
        <div className="set-user"><img src={avatar} alt="" width={32} height={32} /><b>Apurva</b></div>
        {shown.map(([p, icon]) => (
          <button key={p} className={p === pane ? 'is-active' : ''} onClick={() => setPane(p)}><span>{icon}</span>{p}</button>
        ))}
      </nav>
      <main className="set-main">
        <h2>{pane}</h2>
        <div className="set-group">
          {pane === 'Wi-Fi' && <Row label="Wi-Fi"><Switch on={wifi} onChange={setWifi} label="Wi-Fi" /></Row>}
          {pane === 'Wi-Fi' && wifi && <Row label="Home"><small>Connected</small></Row>}
          {pane === 'Bluetooth' && <Row label="Bluetooth"><Switch on={bt} onChange={setBt} label="Bluetooth" /></Row>}
          {pane === 'Bluetooth' && bt && <Row label="AirPods"><small>Not connected</small></Row>}
          {pane === 'Appearance' && (
            <>
              <Row label="Appearance">
                <div className="set-seg">
                  {(['light', 'dark'] as const).map((a) => <button key={a} className={st.appearance === a ? 'is-on' : ''} onClick={() => st.set({ appearance: a })}>{a === 'light' ? 'Light' : 'Dark'}</button>)}
                </div>
              </Row>
              <Row label="Accent color (notch)">
                <div className="set-accents">
                  {ACCENTS.map((c) => <button key={c} aria-label={`Accent ${c}`} aria-pressed={st.accent === c} style={{ background: c }} onClick={() => st.set({ accent: c })} />)}
                </div>
              </Row>
            </>
          )}
          {pane === 'Wallpaper' && (
            <>
              <Row label="Rotate every 15 seconds"><Switch on={st.wallpaper === 'auto'} onChange={(v) => st.set({ wallpaper: v ? 'auto' : 0 })} label="Rotate wallpapers" /></Row>
              <div className="set-walls">
                {wallpapers.map((w, i) => (
                  <button key={w.file} aria-label={w.title} aria-pressed={st.wallpaper === i} onClick={() => st.set({ wallpaper: i })}>
                    <img src={wallpaperUrl(w)} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            </>
          )}
          {pane === 'Displays' && (
            <Row label="Brightness"><input type="range" min={0} max={1} step={0.01} value={1 - st.dim / MAX_DIM} onChange={(e) => st.set({ dim: (1 - Number(e.target.value)) * MAX_DIM })} aria-label="Brightness" /></Row>
          )}
          {pane === 'Sound' && (
            <Row label="Output volume"><input type="range" min={0} max={1} step={0.01} value={st.volume} onChange={(e) => st.set({ volume: Number(e.target.value) })} aria-label="Output volume" /></Row>
          )}
          {pane === 'Visor' && (
            <>
              <Row label="Open the notch on hover"><Switch on={st.hoverOpen} onChange={(v) => st.set({ hoverOpen: v })} label="Open the notch on hover" /></Row>
              <Row label="Shortcut"><small>⌘ ⇧ I</small></Row>
              <Row label="Get the real thing"><a className="app-btn is-primary" href={links.dmg}>Download Visor</a></Row>
            </>
          )}
          {pane === 'About' && (
            <>
              <Row label="Name"><small>MacBook in a browser</small></Row>
              <Row label="Chip"><small>Whatever you’re reading this on</small></Row>
              <Row label="macOS"><small>Tahoe-ish</small></Row>
              <Row label="Visor"><small>{__RELEASE__.version} ({__RELEASE__.build})</small></Row>
              <Row label="Source"><a href={links.repo} target="_blank" rel="noreferrer">GitHub ↗</a></Row>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
