import { useState, type ReactNode } from 'react';
import { apps } from '../../apps/apps';
import { useNotch, type Hud } from '../../notch/store';
import { trackAt } from '../../notch/tracks';
import { useLock } from '../../store/lock';
import { useSettings } from '../../store/settings';
import { useWindows } from '../../store/windows';
import { icons } from './icons';
import './ControlCenter.css';

// Brightness is stored as how much to dim; the slider shows the inverse so right is brighter, as on macOS.
const MAX_DIM = 0.75;

function Pill({ label, sub, on, icon, onClick, chevron }: { label: string; sub: string; on: boolean; icon: ReactNode; onClick: () => void; chevron?: boolean }) {
  return (
    <button className={`cc-glass cc-pill${on ? ' is-on' : ''}`} aria-pressed={on} onClick={onClick}>
      <span className="cc-pill-icon">{icon}</span>
      <span className="cc-pill-text"><b>{label}</b><small>{sub}</small></span>
      {chevron && <span className="cc-chevron">{icons.chevron}</span>}
    </button>
  );
}

function Round({ label, icon, onClick, on }: { label: string; icon: ReactNode; onClick: () => void; on?: boolean }) {
  return (
    <button className={`cc-glass cc-round${on ? ' is-on' : ''}`} aria-label={label} aria-pressed={on} title={label} onClick={onClick}>
      {icon}
    </button>
  );
}

interface SliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: ReactNode;
  max?: ReactNode;
  className?: string;
  children?: ReactNode;
}

function Slider({ label, value, onChange, min, max, className = '', children }: SliderProps) {
  return (
    <div className={`cc-glass cc-slider ${className}`}>
      <b>{label}</b>
      <div className="cc-slider-row">
        <span className="cc-slider-end">{min}</span>
        <input type="range" min={0} max={1} step={0.01} value={value} aria-label={label} style={{ '--v': `${value * 100}%` } as React.CSSProperties} onChange={(e) => onChange(Number(e.target.value))} />
        {max && <span className="cc-slider-end">{max}</span>}
        {children}
      </div>
    </div>
  );
}

export function ControlCenter({ onClose }: { onClose: () => void }) {
  const { dim, volume, backlight, appearance, set } = useSettings();
  const { track, playing, togglePlay, skip, flash, setTab } = useNotch();
  const [wifi, setWifi] = useState(true);
  const [bluetooth, setBluetooth] = useState(true);
  const [shot, setShot] = useState(0);
  const t = trackAt(track);

  const hud = (kind: Hud, value: number) => flash({ kind: 'hud', hud: kind, value });
  const takeScreenshot = () => setShot((n) => n + 1);

  return (
    <div className="cc" role="dialog" aria-label="Control Center">
      {shot > 0 && <div key={shot} className="cc-flash" aria-hidden />}
      <div className="cc-grid">
        <Pill label="Wi-Fi" sub={wifi ? 'Home' : 'Off'} on={wifi} icon={icons.wifi} onClick={() => setWifi(!wifi)} />
        <div className="cc-glass cc-media">
          <img src={apps.music.icon} alt="" width={52} height={52} />
          <b>{t.title}</b>
          <small>{t.artist}</small>
          <div className="cc-media-controls">
            <button aria-label="Previous track" onClick={() => skip(-1)}>{icons.prev}</button>
            <button aria-label={playing ? 'Pause' : 'Play'} onClick={togglePlay}>{playing ? icons.pause : icons.play}</button>
            <button aria-label="Next track" onClick={() => skip(1)}>{icons.next}</button>
          </div>
        </div>
        <Pill label="Bluetooth" sub={bluetooth ? 'On' : 'Off'} on={bluetooth} icon={icons.bluetooth} onClick={() => setBluetooth(!bluetooth)} />
        <Pill label="AirDrop" sub="Off" on={false} icon={icons.airdropOff} chevron onClick={() => { setTab('shelf'); onClose(); }} />
        <Round label="Screenshot" icon={icons.screenshot} onClick={takeScreenshot} />
        <Round label="Screen Mirroring" icon={icons.mirroring} onClick={() => void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())} />
        <Slider className="cc-wide" label="Display" value={1 - dim / MAX_DIM} min={icons.sunSmall} max={icons.sunLarge} onChange={(v) => { set({ dim: (1 - v) * MAX_DIM }); hud('brightness', v); }} />
        <Slider className="cc-wide" label="Sound" value={volume} min={icons.speaker} max={icons.speakerLoud} onChange={(v) => { set({ volume: v }); hud('volume', v); }}>
          <button className="cc-airplay" aria-label="AirPlay" onClick={() => hud('volume', volume)}>{icons.airplay}</button>
        </Slider>
        <Slider className="cc-keyboard" label="Keyboard" value={backlight} min={icons.keyboardDim} onChange={(v) => { set({ backlight: v }); hud('backlight', v); }} />
        <Round label="Lock Screen" icon={icons.lock} onClick={() => { onClose(); useLock.getState().lock(); }} />
        <Round label="Dark Mode" icon={icons.appearance} on={appearance === 'dark'} onClick={() => set({ appearance: appearance === 'dark' ? 'light' : 'dark' })} />
      </div>
      <button className="cc-glass cc-edit" onClick={() => { onClose(); useWindows.getState().open('settings'); }}>Edit Controls</button>
    </div>
  );
}
