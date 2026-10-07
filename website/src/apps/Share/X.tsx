import { useState } from 'react';
import { SHARE_TEXT, xUrl } from './share';
import './X.css';

const LIMIT = 280;

export function X() {
  const [text, setText] = useState(`${SHARE_TEXT} #macOS #MacBook`);
  const left = LIMIT - text.length;
  return (
    <form className="x" onSubmit={(e) => { e.preventDefault(); window.open(xUrl(text), '_blank', 'noopener'); }}>
      <div className="x-row">
        <img src={`${import.meta.env.BASE_URL}icon.png`} alt="" width={40} height={40} />
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} aria-label="Post" />
      </div>
      <div className="x-foot">
        <span className={left < 0 ? 'is-over' : ''}>{left}</span>
        <button type="submit" disabled={left < 0}>Post</button>
      </div>
      <p className="x-note">Opens X with this post filled in. Nothing is posted until you press Post there.</p>
    </form>
  );
}
