import { useState } from 'react';
import { Cover } from '../../notch/Cover';
import { useNotch } from '../../notch/store';
import { trackAt } from '../../notch/tracks';
import { useSettings } from '../../store/settings';
import './ControlCenter.css';

// Brightness is shown inverted from the stored dim so the slider reads like macOS: right is brighter.
const MAX_DIM = 0.75;

function Toggle({ label, sub, on, onClick, icon }: { label: string; sub: string; on: boolean; onClick: () => void; icon: string }) {
  return (
    <button className="cc-toggle" aria-pressed={on} onClick={onClick}>
      <span className={`cc-dot${on ? ' is-on' : ''}`} aria-hidden>{icon}</span>
      <span><b>{label}</b><small>{sub}</small></span>
    </button>
  );
}

function Slider({ label, icon, value, onChange }: { label: string; icon: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="cc-tile cc-slider">
      <b>{label}</b>
      <label>
        <span aria-hidden>{icon}</span>
        <input type="range" min={0} max={1} step={0.01} value={value} aria-label={label} style={{ '--v': `${value * 100}%` } as React.CSSProperties} onChange={(e) => onChange(Number(e.target.value))} />
      </label>
    </div>
  );
}

export function ControlCenter() {
  const { dim, volume, set } = useSettings();
  const { track, playing, togglePlay, skip, flash, setTab } = useNotch();
  const [wifi, setWifi] = useState(true);
  const [bluetooth, setBluetooth] = useState(true);
  const [focus, setFocus] = useState(false);
  const t = trackAt(track);
  const brightness = 1 - dim / MAX_DIM;

  return (
    <div className="cc" role="dialog" aria-label="Control Center">
      <div className="cc-tile cc-network">
        <Toggle label="Wi-Fi" sub={wifi ? 'Home' : 'Off'} on={wifi} onClick={() => setWifi(!wifi)} icon="📶" />
        <Toggle label="Bluetooth" sub={bluetooth ? 'On' : 'Off'} on={bluetooth} onClick={() => setBluetooth(!bluetooth)} icon="ᛒ" />
        <Toggle label="AirDrop" sub="Opens the shelf" on={false} onClick={() => setTab('shelf')} icon="◎" />
      </div>
      <div className="cc-side">
        <div className="cc-tile"><Toggle label="Focus" sub={focus ? 'Do Not Disturb' : 'Off'} on={focus} onClick={() => setFocus(!focus)} icon="☾" /></div>
        <div className="cc-tile cc-music">
          <Cover track={t} size={34} />
          <span className="cc-music-text"><b>{t.title}</b><small>{t.artist}</small></span>
          <button aria-label="Previous track" onClick={() => skip(-1)}>⏮</button>
          <button aria-label={playing ? 'Pause' : 'Play'} onClick={togglePlay}>{playing ? '⏸' : '▶'}</button>
          <button aria-label="Next track" onClick={() => skip(1)}>⏭</button>
        </div>
      </div>
      <Slider label="Display" icon="☀" value={brightness} onChange={(v) => { set({ dim: (1 - v) * MAX_DIM }); flash({ kind: 'hud', hud: 'brightness', value: v }); }} />
      <Slider label="Sound" icon="🔊" value={volume} onChange={(v) => { set({ volume: v }); flash({ kind: 'hud', hud: 'volume', value: v }); }} />
    </div>
  );
}
