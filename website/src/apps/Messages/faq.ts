import { QUARANTINE_CMD } from '../../links';

// Answers come from the README; this is a scripted FAQ, not real people.
export const faq: { q: string; a: string }[] = [
  { q: 'What is Visor?', a: 'A free, open-source Mac app that turns the MacBook notch into a music player, calendar, file shelf and the volume and brightness HUDs.' },
  { q: 'Is it free?', a: 'Yes, completely. It’s GPL-3.0 on GitHub; read it, fork it or send a pull request.' },
  { q: 'Why does macOS block it?', a: `Builds are ad-hoc signed, so macOS quarantines them. Run this once in Terminal: ${QUARANTINE_CMD}` },
  { q: 'Which Macs?', a: 'macOS 14 Sonoma or later on Apple silicon. Notched MacBooks get the full effect; other displays get a floating island.' },
  { q: 'What permissions?', a: 'Accessibility for the HUDs, Calendars and Reminders, Camera for the mirror, Automation for Music and Spotify, and Location for weather. Each one is optional.' },
  { q: 'Who made it?', a: 'Apurva Mukherjee, a full-stack engineer in Kolkata. apurva.space' },
];
