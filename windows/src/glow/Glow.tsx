import { useQuery } from '@tanstack/react-query';
import { listen } from '@tauri-apps/api/event';
import { useEffect, useRef } from 'react';
import { useCover } from '../island/queries';
import { useSettings } from '../settings/store';
import { NEUTRAL, vividPalette } from './palette';
import './Glow.css';

/** Rises fast enough to land on a kick, falls slowly enough not to flicker; per second, as the Mac's EdgeGlowView. */
const ATTACK = 18;
const RELEASE = 6;
/** Without audio to follow, a slow breath instead of a still line. */
const BREATH_S = 3.2;

function usePalette() {
  const cover = useCover();
  return (
    useQuery({
      queryKey: ['cover-palette', cover],
      queryFn: async () => {
        if (!cover) return NEUTRAL;
        const image = new Image();
        image.src = cover;
        await image.decode();
        const canvas = new OffscreenCanvas(16, 16);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('No 2D canvas to sample the cover with');
        context.drawImage(image, 0, 0, 16, 16);
        return vividPalette(context.getImageData(0, 0, 16, 16).data);
      },
      staleTime: Infinity,
    }).data ?? NEUTRAL
  );
}

/** The light round one monitor's edge. Rust opens this window only while the glow is on and music plays. */
export function Glow() {
  const [first, second] = usePalette();
  const strength = useSettings((s) => s.edgeGlowStrength);
  const rim = useRef<HTMLDivElement>(null);
  const heard = useRef({ level: 0, live: false });

  useEffect(() => {
    const off = listen<{ level: number; live: boolean }>('glow-level', (e) => {
      heard.current = e.payload;
    });
    return () => void off.then((stop) => stop());
  }, []);

  // Once a frame, straight onto the element: React never re-renders for the music.
  useEffect(() => {
    let glow = 0;
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const elapsed = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { level, live } = heard.current;
      const target = live ? level ** 1.5 : 0.3 + 0.15 * Math.sin((now / 1000) * ((2 * Math.PI) / BREATH_S));
      glow += (target - glow) * (1 - Math.exp(-elapsed * (target > glow ? ATTACK : RELEASE)));
      rim.current?.style.setProperty('--g', Math.min(1, glow * strength).toFixed(3));
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [strength]);

  return <div ref={rim} className="glow" style={{ '--a': first, '--b': second } as React.CSSProperties} aria-hidden />;
}
