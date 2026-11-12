/** What `vividPalette` gives for a cover with no colour to speak of. */
export const NEUTRAL: [string, string] = ['hsl(0 0% 95%)', 'hsl(0 0% 70%)'];

interface Swatch {
  h: number;
  s: number;
  v: number;
}

function hsv(r: number, g: number, b: number): Swatch {
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  const h = d === 0 ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h / 6, s: max === 0 ? 0 : d / max, v: max };
}

const vivid = (c: Swatch) => c.s * c.v;
// Hue is a circle, so 0.95 and 0.05 are neighbours.
const hueGap = (a: Swatch, b: Swatch) => Math.min(Math.abs(a.h - b.h), 1 - Math.abs(a.h - b.h));

function css({ h, s, v }: Swatch) {
  // Brightened enough to read as light on any screen, as the Mac's vividPalette does.
  const sat = Math.max(s, 0.55);
  const val = Math.max(v, 0.9);
  const l = val * (1 - sat / 2);
  const sl = l === 0 || l === 1 ? 0 : (val - l) / Math.min(l, 1 - l);
  return `hsl(${Math.round(h * 360)} ${Math.round(sl * 100)}% ${Math.round(l * 100)}%)`;
}

/**
 * The cover's two most vivid colours from its RGBA pixels, as the Mac app's NSImage.vividPalette.
 * An average would not do: most covers average to mud.
 */
export function vividPalette(rgba: ArrayLike<number>): [string, string] {
  const swatches: Swatch[] = [];
  for (let i = 0; i + 2 < rgba.length; i += 4) swatches.push(hsv((rgba[i] ?? 0) / 255, (rgba[i + 1] ?? 0) / 255, (rgba[i + 2] ?? 0) / 255));
  const first = swatches.reduce<Swatch | null>((best, c) => (!best || vivid(c) > vivid(best) ? c : best), null);
  if (!first || vivid(first) <= 0.12) return NEUTRAL;
  const second =
    swatches
      .filter((c) => hueGap(c, first) > 0.08 && vivid(c) > vivid(first) * 0.35)
      .reduce<Swatch | null>((best, c) => (!best || vivid(c) > vivid(best) ? c : best), null) ??
    // A one-colour cover still gets a second stop, a short step round the wheel.
    { ...first, h: (first.h + 0.08) % 1 };
  return [css(first), css(second)];
}
