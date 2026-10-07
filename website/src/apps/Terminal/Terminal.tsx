import { useRef, useState, type KeyboardEvent } from 'react';
import { useWindows } from '../../store/windows';
import { run } from './commands';
import './Terminal.css';

const PROMPT = 'visitor@visorbook ~ %';

interface Entry {
  input: string;
  lines: string[];
}

export function Terminal() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLLabelElement>(null);
  const [loggedIn] = useState(() => new Date().toDateString());

  const submit = () => {
    const result = run(input, __RELEASE__.version);
    if (input.trim()) setHistory((h) => [input, ...h]);
    setCursor(-1);
    setInput('');
    if (result.effect?.kind === 'clear') return setEntries([]);
    if (result.effect?.kind === 'open') useWindows.getState().open(result.effect.app);
    if (result.effect?.kind === 'url') window.open(result.effect.href, '_blank', 'noopener');
    setEntries((e) => [...e, { input, lines: result.lines }]);
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: 'end' }));
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') return submit();
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const next = Math.max(-1, Math.min(history.length - 1, cursor + (e.key === 'ArrowUp' ? 1 : -1)));
    setCursor(next);
    setInput(next === -1 ? '' : (history[next] ?? ''));
  };

  return (
    <div className="terminal" onClick={() => inputRef.current?.focus()}>
      <p>Last login: {loggedIn} on ttys000</p>
      <p>Type <b>help</b> to see what you can do.</p>
      {entries.map((e, i) => (
        <div key={i}>
          <p><span className="terminal-prompt">{PROMPT}</span> {e.input}</p>
          {e.lines.map((l, j) => <pre key={j}>{l}</pre>)}
        </div>
      ))}
      <label className="terminal-line" ref={bottomRef}>
        <span className="terminal-prompt">{PROMPT}</span>
        <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey} aria-label="Terminal input" spellCheck={false} autoCapitalize="off" autoComplete="off" autoFocus />
      </label>
    </div>
  );
}
