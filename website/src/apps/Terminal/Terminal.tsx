import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { openUrl } from '../../os/downloads';
import { useWindows } from '../../store/windows';
import { complete, run } from './commands';
import './Terminal.css';

const PROMPT = 'visitor@visorbook ~ %';

interface Entry {
  input: string;
  lines: string[];
  image?: string;
}

const IMAGE_URL = /^(blob:|data:image\/)|\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i;

// A dropped image (from the desktop, the shelf, Photos or your own Finder) prints inline, like iTerm2's imgcat,
// instead of the browser's default of typing its URL into the prompt.
function droppedImage(e: DragEvent): { name: string; src: string } | null {
  const file = e.dataTransfer.files[0];
  if (file) return file.type.startsWith('image/') ? { name: file.name, src: URL.createObjectURL(file) } : null;
  const url = e.dataTransfer.getData('text/uri-list').split('\n')[0]?.trim() ?? '';
  if (!IMAGE_URL.test(url)) return null;
  return { name: decodeURIComponent(url.split(/[?#]/)[0]?.split('/').pop() || 'image'), src: url };
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
    if (result.effect?.kind === 'quit') return useWindows.getState().close('terminal');
    if (result.effect?.kind === 'open') useWindows.getState().open(result.effect.app);
    if (result.effect?.kind === 'url') openUrl(result.effect.href);
    setEntries((e) => [...e, { input, lines: result.lines }]);
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: 'end' }));
  };

  const onDrop = (e: DragEvent) => {
    const image = droppedImage(e);
    if (!image) return;
    e.preventDefault();
    setEntries((list) => [...list, { input: `imgcat ${image.name}`, lines: [], image: image.src }]);
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: 'end' }));
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') return submit();
    if (e.key === 'Tab') {
      e.preventDefault();
      return setInput(complete(input));
    }
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      return setEntries([]);
    }
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      setEntries((list) => [...list, { input: `${input}^C`, lines: [] }]);
      return setInput('');
    }
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const next = Math.max(-1, Math.min(history.length - 1, cursor + (e.key === 'ArrowUp' ? 1 : -1)));
    setCursor(next);
    setInput(next === -1 ? '' : (history[next] ?? ''));
  };

  return (
    <div className="terminal" onClick={() => inputRef.current?.focus()} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <p>Last login: {loggedIn} on ttys000</p>
      <p>Type <b>help</b> to see what you can do.</p>
      {entries.map((e, i) => (
        <div key={i}>
          <p><span className="terminal-prompt">{PROMPT}</span> {e.input}</p>
          {e.lines.map((l, j) => <pre key={j}>{l}</pre>)}
          {e.image && <img className="terminal-img" src={e.image} alt={e.input.slice('imgcat '.length)} />}
        </div>
      ))}
      <label className="terminal-line" ref={bottomRef}>
        <span className="terminal-prompt">{PROMPT}</span>
        <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey} aria-label="Terminal input" spellCheck={false} autoCapitalize="off" autoComplete="off" autoFocus />
      </label>
    </div>
  );
}
