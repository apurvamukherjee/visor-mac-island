import { useState } from 'react';
import { SHARE_TEXT, whatsappUrl } from './share';
import './WhatsApp.css';

const chats = [
  { name: 'Share Visor', last: 'Send it to a friend with a notch', active: true },
  { name: 'Mac friends', last: 'who has a notched MacBook?', active: false },
  { name: 'Design team', last: 'the notch is just sitting there', active: false },
];

export function WhatsApp() {
  const [text, setText] = useState(SHARE_TEXT);
  return (
    <div className="wa">
      <nav className="wa-list" aria-label="Chats">
        <h3>Chats</h3>
        {chats.map((c) => (
          <button key={c.name} className={c.active ? 'is-active' : ''}>
            <span className="wa-avatar" aria-hidden>{c.name[0]}</span>
            <span><b>{c.name}</b><small>{c.last}</small></span>
          </button>
        ))}
      </nav>
      <div className="wa-chat">
        <header><b>Share Visor</b><small>Opens WhatsApp with this message</small></header>
        <div className="wa-thread">
          <p className="wa-bubble">Know someone with a notched MacBook? Send them Visor 👇</p>
        </div>
        <form className="wa-compose" onSubmit={(e) => { e.preventDefault(); window.open(whatsappUrl(text), '_blank', 'noopener'); }}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} aria-label="Message" />
          <button type="submit" aria-label="Send on WhatsApp">➤</button>
        </form>
      </div>
    </div>
  );
}
