import { useState } from 'react';
import { links } from '../links';
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

export function WindowsLogo({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M0 0h7.5v7.5H0zM8.5 0H16v7.5H8.5zM0 8.5h7.5V16H0zM8.5 8.5H16V16H8.5z" />
    </svg>
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

/** MacNative's "Listed on" badge. Until the listing is published their image 404s, so it falls back to a text link. */
export function MacNativeBadge({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  const [failed, setFailed] = useState(false);
  return (
    <a className="macnative-badge" href={links.macnative} target="_blank" rel="noopener">
      {failed
        ? 'Listed on MacNative ↗'
        : <img src={links.macnativeBadge(theme)} alt="Listed on MacNative" width={160} height={44} loading="lazy" onError={() => setFailed(true)} />}
    </a>
  );
}
