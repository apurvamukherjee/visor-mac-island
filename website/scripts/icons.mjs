// Generates the dock tiles in src/icons. Original artwork in the macOS squircle style; run with `node scripts/icons.mjs`.
import { writeFileSync } from 'node:fs';

const SQUIRCLE = 'M50 2C88 2 98 12 98 50S88 98 50 98 2 88 2 50 12 2 50 2Z';

const tile = (top, bottom, glyph, extraDefs = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
<linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
<filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-opacity=".25"/></filter>
<clipPath id="clip"><path d="${SQUIRCLE}"/></clipPath>
${extraDefs}
</defs>
<path d="${SQUIRCLE}" fill="url(#bg)"/>
<path d="${SQUIRCLE}" fill="url(#gloss)"/>
<g filter="url(#sh)">${glyph}</g>
<path d="${SQUIRCLE}" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1"/>
</svg>
`;

const gearTeeth = Array.from({ length: 10 }, (_, i) => `<rect x="45" y="17" width="10" height="14" rx="2.5" transform="rotate(${i * 36} 50 50)"/>`).join('');

const icons = {
  finder: tile('#6ec6ff', '#1a73e8', `
    <rect x="22" y="26" width="56" height="46" rx="7" fill="#fff"/>
    <rect x="22" y="26" width="18" height="46" rx="7" fill="#e3effd"/><rect x="33" y="26" width="7" height="46" fill="#e3effd"/>
    <g fill="#9cc3f5"><rect x="26" y="34" width="10" height="3" rx="1.5"/><rect x="26" y="41" width="10" height="3" rx="1.5"/><rect x="26" y="48" width="10" height="3" rx="1.5"/></g>
    <g fill="#5aa0f2"><rect x="46" y="34" width="10" height="9" rx="2"/><rect x="61" y="34" width="10" height="9" rx="2"/><rect x="46" y="50" width="10" height="9" rx="2"/><rect x="61" y="50" width="10" height="9" rx="2"/></g>`),
  messages: tile('#6cf38a', '#11b83a', `
    <path fill="#fff" d="M50 22c-17.7 0-32 11.4-32 25.5 0 8 4.6 15.2 11.9 19.9-.7 4.2-3 8-6.4 10.6 6.2.4 12-1.6 16.4-5.2 3.2.8 6.6 1.2 10.1 1.2 17.7 0 32-11.4 32-25.5S67.7 22 50 22z"/>`),
  notes: tile('#ffffff', '#ececec', `
    <g clip-path="url(#clip)"><rect width="100" height="30" fill="#ffd54a"/><rect y="30" width="100" height="2" fill="#e2b13c"/></g>
    <g fill="#d6d6d6"><rect x="16" y="46" width="68" height="2"/><rect x="16" y="58" width="68" height="2"/><rect x="16" y="70" width="68" height="2"/><rect x="16" y="82" width="50" height="2"/></g>`),
  quicktime: tile('#2b3b5c', '#0b1220', `
    <circle cx="50" cy="50" r="27" fill="none" stroke="url(#ring)" stroke-width="7"/>
    <path fill="#fff" d="M43 37.5v25l21-12.5z"/>`,
    '<linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset="1" stop-color="#2563eb"/></linearGradient>'),
  settings: tile('#b9bcc2', '#6b6f78', `
    <g fill="#3f434b">${gearTeeth}<circle cx="50" cy="50" r="22"/></g>
    <circle cx="50" cy="50" r="14" fill="#d9dbe0"/><circle cx="50" cy="50" r="6" fill="#3f434b"/>`),
  trash: tile('#f2f3f5', '#c9ccd2', `
    <path d="M28 32h44l-4.5 46a5 5 0 0 1-5 4.5H37.5a5 5 0 0 1-5-4.5z" fill="#fff" fill-opacity=".75" stroke="#9aa0a8" stroke-width="2"/>
    <rect x="25" y="26" width="50" height="6" rx="3" fill="#9aa0a8"/>
    <g stroke="#b3b8bf" stroke-width="2"><path d="M40 38l2 38M50 38v38M60 38l-2 38"/></g>`),
  downloads: tile('#5ab0ff', '#0a5fd8', `
    <circle cx="50" cy="50" r="28" fill="#fff" fill-opacity=".18"/>
    <path fill="#fff" d="M45 24h10v28h11L50 72 34 52h11z"/>`),
  github: tile('#3b4048', '#16191d', `
    <path fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" d="M37 34L21 50l16 16M63 34l16 16-16 16"/>
    <path stroke="#8b949e" stroke-width="6" stroke-linecap="round" d="M56 28L44 72"/>`),
  terminal: tile('#3a3a3c', '#111113', `
    <rect x="12" y="14" width="76" height="8" rx="4" fill="#5a5a5e" fill-opacity=".6"/>
    <path fill="none" stroke="#e5e5e7" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" d="M24 40l12 10-12 10"/>
    <rect x="42" y="58" width="20" height="5" rx="2.5" fill="#e5e5e7"/>`),
};

const folder = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd3ff"/><stop offset="1" stop-color="#3ba2f0"/></linearGradient></defs>
<path d="M8 26a6 6 0 0 1 6-6h22l7 7h43a6 6 0 0 1 6 6v8H8z" fill="#5fb6f5"/>
<rect x="8" y="33" width="84" height="52" rx="6" fill="url(#f)"/>
<rect x="8" y="33" width="84" height="2" fill="#fff" fill-opacity=".45"/>
</svg>
`;
const file = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
<path d="M22 8h38l20 20v64H22z" fill="#fff" stroke="#c7c7cc" stroke-width="1.5"/>
<path d="M60 8v20h20z" fill="#e5e5ea" stroke="#c7c7cc" stroke-width="1.5" stroke-linejoin="round"/>
<g fill="#c7c7cc"><rect x="30" y="42" width="40" height="3" rx="1.5"/><rect x="30" y="52" width="40" height="3" rx="1.5"/><rect x="30" y="62" width="40" height="3" rx="1.5"/><rect x="30" y="72" width="24" height="3" rx="1.5"/></g>
</svg>
`;

const out = new URL('../src/icons/', import.meta.url);
for (const [name, svg] of Object.entries({ ...icons, folder, file })) writeFileSync(new URL(`${name}.svg`, out), svg);
