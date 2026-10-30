import { useEffect, useRef, useState } from 'react';
import { icons } from '../../../website/src/os/ControlCenter/icons';
import { useNow } from '../../../website/src/os/useNow';
import { media as send, report, setOutput, useSystem, type Media } from '../native';
import { useSettings } from '../settings/store';
import { Cover } from './Closed';
import { useCover, useLyric } from './queries';

const modeIcon = (d: string, badge?: string) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
    {badge && (
      <text x="12" y="15.5" fontSize="8" fontWeight="700" textAnchor="middle" fill="currentColor" stroke="none">
        {badge}
      </text>
    )}
  </svg>
);
const SHUFFLE = 'M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5';
const REPEAT = 'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3';

const time = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Players report a position now and then; the clock runs on from it between reports. */
function usePosition(m: Media | null, tick: number) {
  const now = useNow(m?.playing ? tick : 60_000).getTime();
  if (!m) return 0;
  const run = m.playing ? Math.max(0, (now - m.updatedAt) / 1000) : 0;
  return Math.min(m.duration || Infinity, m.position + run);
}

function Vinyl({ playing }: { playing: boolean }) {
  const cover = useCover();
  return (
    <span className={`vinyl${playing ? ' is-playing' : ''}`}>
      <span className="vinyl-disc">{cover ? <img src={cover} alt="" /> : <i className="cover-empty">♪</i>}</span>
      <i className="vinyl-arm" aria-hidden />
    </span>
  );
}

function Outputs() {
  const outputs = useSystem((s) => s.outputs);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);

  // A press anywhere else in the island closes the list, as a menu does.
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (e.target instanceof Node && !box.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  if (outputs.length < 2) return null;
  return (
    <span className="outputs" ref={box}>
      <button className="player-btn" aria-label="Sound output" aria-expanded={open} onClick={() => setOpen(!open)}>
        {icons.airplay}
      </button>
      {open && (
        <ul className="outputs-list" role="listbox" aria-label="Sound output">
          {outputs.map((o) => (
            <li key={o.id} role="option" aria-selected={o.default}>
              <button
                onClick={() => {
                  setOutput(o.id).catch(report);
                  setOpen(false);
                }}
              >
                {o.default ? '✓ ' : ''}
                {o.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}

export function Player() {
  const m = useSystem((s) => s.media);
  const vinyl = useSettings((s) => s.vinyl);
  // A lyric line can come in up to a tick late, so it ticks faster while lyrics show, as the Mac's 0.25 s.
  const position = usePosition(m, useSettings((s) => s.lyrics) ? 250 : 500);
  const lyric = useLyric(position);
  const [drag, setDrag] = useState<number | null>(null);
  const run = (action: Parameters<typeof send>[0]) => send(action).catch(report);

  if (!m) {
    return (
      <div className="player is-empty">
        <Cover size={118} />
        <div className="player-main">
          <div className="player-title">Nothing playing</div>
          <div className="player-artist">Play something in Spotify, a browser or Media Player.</div>
        </div>
      </div>
    );
  }

  const shown = drag ?? position;
  const seek = () => {
    if (drag !== null) run({ kind: 'seek', seconds: drag });
    setDrag(null);
  };
  return (
    <div className="player">
      {vinyl ? <Vinyl playing={m.playing} /> : <Cover size={118} />}
      <div className="player-main">
        <div className="player-title">{m.title}</div>
        <div className="player-artist">{m.artist}</div>
        {lyric !== null && <div className={`player-lyric${m.playing ? '' : ' is-paused'}`}>{lyric}</div>}
        {m.duration > 0 && (
          <>
            <input
              className="player-scrub"
              type="range"
              min={0}
              max={m.duration}
              step={0.5}
              value={shown}
              disabled={!m.canSeek}
              aria-label="Track position"
              style={{ '--p': `${(shown / m.duration) * 100}%` } as React.CSSProperties}
              onChange={(e) => setDrag(e.target.valueAsNumber)}
              onPointerUp={seek}
              onKeyUp={seek}
            />
            <div className="player-times">
              <span>{time(shown)}</span>
              {/* Between the times, where they fit beside a calendar; only for players that offer them. */}
              <span className="player-modes">
                {m.shuffle !== null && (
                  <button className={`player-mode${m.shuffle ? ' is-on' : ''}`} aria-label="Shuffle" aria-pressed={m.shuffle} onClick={() => run({ kind: 'shuffle' })}>
                    {modeIcon(SHUFFLE)}
                  </button>
                )}
                {m.repeat !== null && (
                  <button
                    className={`player-mode${m.repeat !== 'none' ? ' is-on' : ''}`}
                    aria-label={m.repeat === 'track' ? 'Repeat one' : m.repeat === 'list' ? 'Repeat all' : 'Repeat off'}
                    onClick={() => run({ kind: 'repeat' })}
                  >
                    {modeIcon(REPEAT, m.repeat === 'track' ? '1' : undefined)}
                  </button>
                )}
              </span>
              <span>{time(m.duration)}</span>
            </div>
          </>
        )}
        <div className="player-controls">
          <button className="player-btn" aria-label="Previous track" onClick={() => run({ kind: 'previous' })}>
            {icons.prev}
          </button>
          <button className="player-btn is-big" aria-label={m.playing ? 'Pause' : 'Play'} onClick={() => run({ kind: 'toggle' })}>
            {m.playing ? icons.pause : icons.play}
          </button>
          <button className="player-btn" aria-label="Next track" onClick={() => run({ kind: 'next' })}>
            {icons.next}
          </button>
          <Outputs />
        </div>
      </div>
    </div>
  );
}
