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
