import { useState } from 'react';
import { useNotch } from '../../notch/store';
import { useNow } from '../../os/useNow';
import { CITIES, Clock as Face } from '../../widgets/Widgets';
import './Clock.css';

const PRESETS = [1, 5, 10, 25, 60];

export function Clock() {
  const [tab, setTab] = useState<'world' | 'timer'>('world');
  const now = useNow(1000);
  const { timerEnd, startTimer, stopTimer } = useNotch();
  const left = timerEnd ? Math.max(0, Math.ceil((timerEnd - now.getTime()) / 1000)) : 0;
  return (
    <div className="clock-app">
      <div className="clock-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'world'} onClick={() => setTab('world')}>World Clock</button>
        <button role="tab" aria-selected={tab === 'timer'} onClick={() => setTab('timer')}>Timers</button>
      </div>
      {tab === 'world' ? (
        <div className="clock-world">
          {CITIES.map((c) => <Face key={c.name} {...c} now={now} size={120} />)}
        </div>
      ) : (
        <div className="clock-timer">
          <div className="clock-timer-left">{timerEnd ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : '0:00'}</div>
          {timerEnd ? (
            <button className="clock-cancel" onClick={stopTimer}>Cancel</button>
          ) : (
            <div className="clock-presets">{PRESETS.map((m) => <button key={m} onClick={() => startTimer(m)}>{m} min</button>)}</div>
          )}
          <p>Visor shows the countdown beside the closed notch and rings a bell at the end.</p>
        </div>
      )}
    </div>
  );
}
