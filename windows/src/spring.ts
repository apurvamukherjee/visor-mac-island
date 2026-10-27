/** A SwiftUI `.spring(response:dampingFraction:)` as a CSS transition, so Windows moves like the Mac app. */
export interface Spring {
  ms: number;
  easing: string;
}

const STEP = 1 / 60;
const SETTLED = 0.001;

export function spring(response: number, damping: number): Spring {
  const w0 = (2 * Math.PI) / response;
  const wd = w0 * Math.sqrt(Math.max(0, 1 - damping * damping));
  const at = (t: number) => {
    const decay = Math.exp(-damping * w0 * t);
    return wd === 0
      ? 1 - decay * (1 + w0 * t)
      : 1 - decay * (Math.cos(wd * t) + ((damping * w0) / wd) * Math.sin(wd * t));
  };

  const points: number[] = [];
  let last = 0;
  for (let t = 0; t <= 3; t += STEP) {
    const x = at(t);
    points.push(x);
    if (Math.abs(1 - x) > SETTLED) last = points.length;
  }
  const settled = [...points.slice(0, last), 1];
  return {
    ms: Math.round(last * STEP * 1000),
    easing: `linear(${settled.map((x) => +x.toFixed(4)).join(', ')})`,
  };
}

// Visor's notch: ContentView.swift opens with (0.42, 0.8) and closes with (0.45, 1.0).
export const OPEN_SPRING = spring(0.42, 0.8);
export const CLOSE_SPRING = spring(0.45, 1);
