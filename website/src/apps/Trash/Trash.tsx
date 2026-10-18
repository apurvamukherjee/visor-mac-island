import { useState } from 'react';

// Easter egg: the Trash grows tired of being checked. Counted per page load.
const SIGHS = [
  'Visor is free. There’s nothing here to throw away.',
  'Still empty.',
  'Yep. Still empty.',
  'You really expected something to be in here, huh?',
  'Fine. Here’s a banana peel. 🍌',
];
let visits = 0;

export function Trash() {
  const [sigh] = useState(() => SIGHS[Math.min(visits++, SIGHS.length - 1)]);
  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24, color: 'rgb(0 0 0 / 0.5)', background: '#fff' }}>
      <div>
        <div style={{ fontSize: 40 }}>🗑️</div>
        <p style={{ margin: '8px 0 0', fontSize: 15, color: '#1d1d1f' }}>Trash is empty</p>
        <p style={{ margin: '4px 0 0', fontSize: 12 }}>{sigh}</p>
      </div>
    </div>
  );
}
