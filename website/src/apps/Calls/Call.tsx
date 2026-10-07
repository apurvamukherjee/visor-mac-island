import { useState } from 'react';
import { useNotch } from '../../notch/store';
import './Call.css';

interface Props {
  app: 'Zoom' | 'Meet';
  brand: string;
  icon: string;
}

const MEETING = 'Visor stand-up';

// A meeting lobby that shows off Visor's one-click Join: two minutes before a call the pill appears by the notch.
export function Call({ app, brand, icon }: Props) {
  const [joined, setJoined] = useState(false);
  const showPill = () => useNotch.getState().flash({ kind: 'join', app, title: MEETING }, 5000);
  return (
    <div className="call" style={{ '--brand': brand } as React.CSSProperties}>
      {joined ? (
        <div className="call-joined">
          <span className="call-tile">You</span>
          <p>Waiting for others to join {MEETING}…</p>
          <button className="call-leave" onClick={() => setJoined(false)}>Leave</button>
        </div>
      ) : (
        <>
          <img src={icon} alt="" width={64} height={64} />
          <h2>{MEETING}</h2>
          <p>Starts in 2 minutes · {app}</p>
          <div className="call-actions">
            <button className="call-join" onClick={() => setJoined(true)}>Join</button>
            <button className="call-pill" onClick={showPill}>Show Visor’s Join pill</button>
          </div>
          <small>In Visor, Zoom, Meet, Teams and Webex events get a Join button in the calendar and beside the notch.</small>
        </>
      )}
    </div>
  );
}
