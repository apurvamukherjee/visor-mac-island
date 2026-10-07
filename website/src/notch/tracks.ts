export interface Track {
  title: string;
  artist: string;
  duration: number;
  cover: string;
}

// Made-up songs with CSS-drawn covers: no real album art or audio is shipped.
export const tracks: [Track, ...Track[]] = [
  { title: 'Notch Lullaby', artist: 'The Menu Bars', duration: 214, cover: 'radial-gradient(circle at 30% 30%, #ffd1dc, #e11d48 55%, #4c0519)' },
  { title: 'Island Hopping', artist: 'Dynamic Duo', duration: 187, cover: 'conic-gradient(from 200deg, #22d3ee, #6366f1, #a855f7, #22d3ee)' },
  { title: 'Sneak Peek', artist: 'Low Power Mode', duration: 243, cover: 'linear-gradient(160deg, #fde68a, #f97316 50%, #7c2d12)' },
  { title: 'Liquid Glass', artist: 'Sonoma Nights', duration: 198, cover: 'radial-gradient(circle at 70% 20%, #bbf7d0, #10b981 45%, #064e3b)' },
];

export const trackAt = (i: number): Track => tracks[((i % tracks.length) + tracks.length) % tracks.length] ?? tracks[0];

export const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
