import { useState } from 'react';
import './ui.css';

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button className="app-btn" onClick={() => void copy()} aria-live="polite">
      {copied ? 'Copied ✓' : label}
    </button>
  );
}

export function Command({ text }: { text: string }) {
  return (
    <div className="app-command">
      <code>{text}</code>
      <CopyButton text={text} />
    </div>
  );
}
