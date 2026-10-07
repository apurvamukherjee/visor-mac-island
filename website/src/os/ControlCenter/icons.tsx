// Line icons drawn to match the weight of SF Symbols in macOS Control Center.
const svg = (d: React.ReactNode, size = 22) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);

export const icons = {
  wifi: svg(<><path d="M2.5 9a14 14 0 0 1 19 0" /><path d="M5.8 12.4a9.3 9.3 0 0 1 12.4 0" /><path d="M9.1 15.7a4.6 4.6 0 0 1 5.8 0" /><circle cx="12" cy="19" r="1.2" fill="currentColor" /></>),
  bluetooth: svg(<path d="M7 7l10 10-5 4V3l5 4L7 17" />),
  airdrop: svg(<><circle cx="12" cy="12" r="2" /><path d="M7.8 16.2a6 6 0 1 1 8.4 0" /><path d="M5 19a10 10 0 1 1 14 0" /></>),
  airdropOff: svg(<><circle cx="12" cy="12" r="2" /><path d="M7.8 16.2a6 6 0 1 1 8.4 0" /><path d="M5 19a10 10 0 1 1 14 0" /><path d="M4 4l16 16" /></>),
  screenshot: svg(<><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><rect x="7.5" y="9" width="9" height="6.5" rx="1.5" /><circle cx="12" cy="12.2" r="1.6" /></>, 24),
  mirroring: svg(<><rect x="3" y="4" width="13" height="10" rx="2" /><rect x="8" y="9" width="13" height="10" rx="2" /></>, 26),
  sunSmall: svg(<><circle cx="12" cy="12" r="3.5" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></>, 18),
  sunLarge: svg(<><circle cx="12" cy="12" r="4.5" fill="currentColor" /><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1" /></>, 20),
  speaker: svg(<path d="M4 9h3l5-4v14l-5-4H4z" fill="currentColor" />, 18),
  speakerLoud: svg(<><path d="M3 9h3l5-4v14l-5-4H3z" fill="currentColor" /><path d="M15 9.5a3.5 3.5 0 0 1 0 5M17.5 7a7 7 0 0 1 0 10M20 4.5a10.5 10.5 0 0 1 0 15" /></>, 22),
  airplay: svg(<><path d="M7 17.5a7 7 0 1 1 10 0" /><path d="M9.5 15a3.5 3.5 0 1 1 5 0" /><path d="M8 21l4-4.5 4 4.5z" fill="currentColor" /></>, 20),
  keyboardDim: svg(<><path d="M5 18h3M16 18h3M7.5 13.5l1.4 1.4M16.5 13.5l-1.4 1.4M12 12v2" /><path d="M8 18a4 4 0 0 1 8 0" /></>, 18),
  lock: svg(<><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M9 21h6M12 17v4" /><rect x="9.5" y="10" width="5" height="4" rx="1" fill="currentColor" /><path d="M10.5 10V8.6a1.5 1.5 0 0 1 3 0V10" /></>, 26),
  appearance: svg(<><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17" /><path d="M3.5 12a8.5 8.5 0 0 0 17 0z" fill="currentColor" /></>, 26),
  prev: <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden><path d="M11 6v12L2 12zM21 6v12l-9-6z" /></svg>,
  next: <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden><path d="M3 6v12l9-6zM13 6v12l9-6z" /></svg>,
  play: <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden><path d="M7 4v16l13-8z" /></svg>,
  pause: <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>,
  chevron: svg(<path d="M9 6l6 6-6 6" />, 16),
};
