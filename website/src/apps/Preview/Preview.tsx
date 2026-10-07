import { useState } from 'react';
import closed from '../../../../assets/readme/closed.png';
import home from '../../../../assets/readme/home.png';
import shelf from '../../../../assets/readme/shelf.png';
import './Preview.css';

const hero = new URL('../../../../assets/readme/hero.svg', import.meta.url).href;
const pages = [
  { name: 'hero.svg', src: hero },
  { name: 'home.png', src: home },
  { name: 'shelf.png', src: shelf },
  { name: 'closed.png', src: closed },
];

export function Preview() {
  const [i, setI] = useState(0);
  const page = pages[i] ?? pages[0];
  return (
    <div className="preview">
      <nav className="preview-thumbs" aria-label="Pages">
        {pages.map((p, n) => (
          <button key={p.name} className={n === i ? 'is-active' : ''} onClick={() => setI(n)}>
            <img src={p.src} alt="" />
            <span>{p.name}</span>
          </button>
        ))}
      </nav>
      <div className="preview-page">{page && <img src={page.src} alt={page.name} />}</div>
    </div>
  );
}
