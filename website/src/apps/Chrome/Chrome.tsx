import { useState } from 'react';
import { links } from '../../links';
import { useNotch } from '../../notch/store';
import './Chrome.css';

const shortcuts = [
  { title: 'Visor', href: links.repo },
  { title: 'Releases', href: links.releases },
  { title: 'apurva.space', href: 'https://apurva.space' },
  { title: 'Issues', href: links.issues },
];

export function Chrome() {
  const [downloaded, setDownloaded] = useState(false);
  const download = () => {
    useNotch.getState().flash({ kind: 'download', app: 'Chrome' }, 3000);
    setDownloaded(true);
  };
  return (
    <div className="chrome">
      <div className="chrome-tabs"><span className="chrome-tab">New Tab</span></div>
      <div className="chrome-omnibox">Search or type a URL</div>
      <div className="chrome-page">
        <h2>Watch Visor’s download ring</h2>
        <p>Visor fills a ring beside the notch while Safari, Chrome or Firefox downloads into your Downloads folder. Try it with the real thing:</p>
        <a className="chrome-download" href={links.dmg} onClick={download}>⬇ Download Visor.dmg</a>
        {downloaded && <p className="chrome-hint">Look at the notch ↑</p>}
        <div className="chrome-shortcuts">
          {shortcuts.map((s) => (
            <a key={s.title} href={s.href} target="_blank" rel="noreferrer"><span>{s.title[0]}</span>{s.title}</a>
          ))}
        </div>
      </div>
    </div>
  );
}
