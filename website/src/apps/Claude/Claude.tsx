import { useState } from 'react';
import { links } from '../../links';
import './Claude.css';

const prompts = [
  'What is Visor and how do I install it?',
  'How does Visor replace the macOS volume HUD?',
  'Help me build Visor from source',
  'Ideas for a feature to contribute to Visor',
];

const ask = (q: string) => `https://claude.ai/new?q=${encodeURIComponent(`${q} (${links.repo})`)}`;

// Hands the question to claude.ai in a new tab; nothing is sent from this page.
export function Claude() {
  const [q, setQ] = useState('');
  return (
    <div className="claude">
      <h2>How can I help with Visor?</h2>
      <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) window.open(ask(q), '_blank', 'noopener'); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about Visor…" aria-label="Ask Claude" />
        <button type="submit" disabled={!q.trim()} aria-label="Ask on claude.ai">↑</button>
      </form>
      <div className="claude-prompts">
        {prompts.map((p) => <a key={p} href={ask(p)} target="_blank" rel="noreferrer">{p}</a>)}
      </div>
      <small>Opens claude.ai in a new tab with your question.</small>
    </div>
  );
}
