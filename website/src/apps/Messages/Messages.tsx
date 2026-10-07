import { useRef, useState } from 'react';
import { faq } from './faq';
import './Messages.css';

interface Bubble {
  from: 'me' | 'visor';
  text: string;
}

const hello: Bubble[] = [{ from: 'visor', text: 'Hi! 👋 Ask me anything about Visor.' }];

export function Messages() {
  const [bubbles, setBubbles] = useState<Bubble[]>(hello);
  const [typing, setTyping] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const scroll = () => requestAnimationFrame(() => end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));

  const ask = (q: string, a: string) => {
    if (typing) return;
    setBubbles((b) => [...b, { from: 'me', text: q }]);
    setTyping(true);
    scroll();
    setTimeout(() => {
      setTyping(false);
      setBubbles((b) => [...b, { from: 'visor', text: a }]);
      scroll();
    }, 900);
  };

  return (
    <div className="messages">
      <nav className="messages-list" aria-label="Conversations">
        <div className="messages-search">🔍 Search</div>
        <button className="is-active">
          <img src={`${import.meta.env.BASE_URL}icon.png`} alt="" width={40} height={40} />
          <span><b>Visor</b><small>{bubbles.at(-1)?.text}</small></span>
        </button>
      </nav>
      <div className="messages-chat">
        <header><b>Visor</b><small>iMessage · Frequently asked</small></header>
        <div className="messages-thread" aria-live="polite">
          {bubbles.map((b, i) => <p key={i} className={`bubble is-${b.from}`}>{b.text}</p>)}
          {typing && <p className="bubble is-visor is-typing" aria-label="Visor is typing"><i /><i /><i /></p>}
          <div ref={end} />
        </div>
        <div className="messages-chips">
          {faq.map((f) => <button key={f.q} onClick={() => ask(f.q, f.a)}>{f.q}</button>)}
        </div>
      </div>
    </div>
  );
}
