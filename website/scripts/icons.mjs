// Builds dock icons for apps that aren't installed on the Mac that ran scripts/mac-icons.swift,
// from the brands' own marks (Simple Icons, pinned) on a macOS squircle. Run: `node scripts/icons.mjs`.
import { writeFileSync } from 'node:fs';

const SIMPLE_ICONS = 'https://unpkg.com/simple-icons@16.34.0/icons';
const MEET = 'https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v1/web-96dp/logo_meet_2020q4_color_2x_web_96dp.png';

// The tile sits at ~82% of the canvas, matching Apple's icon grid and the exported macOS icons.
const SQUIRCLE = 'M50 2C88 2 98 12 98 50S88 98 50 98 2 88 2 50 12 2 50 2Z';

const tile = (bg, inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="-11 -11 122 122">
<path d="${SQUIRCLE}" fill="${bg}"/>
${inner}
<path d="${SQUIRCLE}" fill="none" stroke="#000" stroke-opacity=".08" stroke-width=".8"/>
</svg>
`;

async function mark(slug) {
  const res = await fetch(`${SIMPLE_ICONS}/${slug}.svg`);
  if (!res.ok) throw new Error(`simple-icons/${slug}: HTTP ${res.status}`);
  const d = /<path d="([^"]+)"/.exec(await res.text())?.[1];
  if (!d) throw new Error(`simple-icons/${slug}: no path`);
  return d;
}

// Simple Icons draw on a 24-unit grid; scale and centre the mark inside the tile.
const glyph = (d, color, size = 54) => {
  const s = size / 24;
  const o = 50 - size / 2;
  return `<path d="${d}" fill="${color}" transform="translate(${o} ${o}) scale(${s})"/>`;
};

const brands = {
  github: { slug: 'github', bg: '#0d1117', color: '#fff' },
  x: { slug: 'x', bg: '#000', color: '#fff', size: 46 },
  spotify: { slug: 'spotify', bg: '#000', color: '#1ed760', size: 62 },
  zoom: { slug: 'zoom', bg: '#0b5cff', color: '#fff', size: 62 },
  claude: { slug: 'claude', bg: '#f0eee6', color: '#d97757', size: 58 },
};

const out = new URL('../src/icons/apps/', import.meta.url);
for (const [name, b] of Object.entries(brands)) {
  writeFileSync(new URL(`${name}.svg`, out), tile(b.bg, glyph(await mark(b.slug), b.color, b.size)));
  console.log(`${name}.svg`);
}

const meet = await fetch(MEET);
if (!meet.ok) throw new Error(`Google Meet logo: HTTP ${meet.status}`);
const png = Buffer.from(await meet.arrayBuffer()).toString('base64');
writeFileSync(new URL('meet.svg', out), tile('#fff', `<image href="data:image/png;base64,${png}" x="20" y="20" width="60" height="60"/>`));
console.log('meet.svg');
