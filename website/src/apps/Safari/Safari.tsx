import { useState } from 'react';
import { links } from '../../links';
import { GitHubPage } from './GitHubPage';
import './Safari.css';

type TabId = 'start' | 'apurva' | 'github';

const tabs: { id: TabId; title: string; url: string }[] = [
  { id: 'start', title: 'Favorites', url: '' },
  { id: 'apurva', title: 'Apurva Mukherjee | Portfolio', url: 'https://apurva.space' },
  { id: 'github', title: 'apurvamukherjee/visor-mac-island', url: links.repo },
];

const favorites = [
  { title: 'apurva.space', tab: 'apurva' as const, letter: 'A', color: '#111' },
  { title: 'Visor on GitHub', tab: 'github' as const, letter: 'V', color: '#24292f' },
  { title: 'Releases', href: links.releases, letter: 'R', color: '#1f883d' },
  { title: 'Changelog', href: links.changelog, letter: 'C', color: '#8250df' },
  { title: 'Issues', href: links.issues, letter: 'I', color: '#cf222e' },
];

function Start({ go }: { go: (t: TabId) => void }) {
  return (
    <div className="safari-start">
      <h2>Favorites</h2>
      <div className="safari-favs">
        {favorites.map((f) => {
          const tile = <><span style={{ background: f.color }}>{f.letter}</span>{f.title}</>;
          return 'tab' in f && f.tab ? (
            <button key={f.title} onClick={() => go(f.tab)}>{tile}</button>
          ) : (
            <a key={f.title} href={f.href} target="_blank" rel="noreferrer">{tile}</a>
          );
        })}
      </div>
    </div>
  );
}

export function Safari({ initial = 'apurva' }: { initial?: TabId }) {
  const [tab, setTab] = useState<TabId>(initial);
  const current = tabs.find((t) => t.id === tab) ?? tabs[0];
  return (
    <div className="safari">
      <div className="safari-bar">
        <div className="safari-tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={t.id === tab} onClick={() => setTab(t.id)}>{t.title}</button>
          ))}
        </div>
        <div className="safari-url">
          <span aria-hidden>🔒</span>
          <span>{current?.url.replace(/^https:\/\//, '') || 'Search or enter website name'}</span>
          {current?.url && <a href={current.url} target="_blank" rel="noreferrer" aria-label="Open in a new tab">↗</a>}
        </div>
      </div>
      <div className="safari-page">
        {tab === 'start' && <Start go={setTab} />}
        {tab === 'apurva' && <iframe title="apurva.space" src="https://apurva.space" loading="lazy" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" />}
        {tab === 'github' && <GitHubPage />}
      </div>
    </div>
  );
}

export function GitHub() {
  return <Safari initial="github" />;
}
