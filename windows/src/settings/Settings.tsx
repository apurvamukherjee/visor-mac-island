import { useSettings } from './store';
import './Settings.css';

export function Settings() {
  const { hoverOpen, hoverDelay, set } = useSettings();
  return (
    <main className="settings">
      <h1>Visor</h1>
      <label className="settings-row">
        Open on hover
        <input type="checkbox" checked={hoverOpen} onChange={(e) => set({ hoverOpen: e.target.checked })} />
      </label>
      <label className="settings-row">
        Hover delay
        <span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={hoverDelay}
            disabled={!hoverOpen}
            onChange={(e) => set({ hoverDelay: e.target.valueAsNumber })}
          />
          <output>{hoverDelay.toFixed(1)}s</output>
        </span>
      </label>
    </main>
  );
}
