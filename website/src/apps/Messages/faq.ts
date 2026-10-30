import { QUARANTINE_CMD } from '../../links';

// Answers come from the README; this is a scripted FAQ, not real people.
export const faq: { q: string; a: string }[] = [
  { q: 'What is Visor?', a: 'A free, open-source app that turns the MacBook notch into a music player, calendar, file shelf and the volume and brightness HUDs. On Windows it’s an island at the top of the screen.' },
  { q: 'Is it free?', a: 'Yes, completely. It’s GPL-3.0 on GitHub; read it, fork it or send a pull request.' },
  { q: 'Why does macOS block it?', a: `Builds are self-signed, not notarized, so macOS quarantines them. Run this once in Terminal: ${QUARANTINE_CMD}` },
  { q: 'The HUD stopped after updating?', a: 'Updating from 3.6.1 or earlier makes macOS forget the Accessibility permission once. Open Settings → HUDs, click Reset and Ask Again, and allow Visor. From 3.6.2 on, updates keep it.' },
  { q: 'Does it run on Windows?', a: 'Yes, on Windows 10 and 11: Download for Windows gets Visor-Setup.exe. It shows what’s playing with synced lyrics, your calendar, a file shelf, timers and the volume HUD. Ctrl+Alt+Space opens it from anywhere.' },
  { q: 'Why does Windows warn about the installer?', a: 'It isn’t code-signed yet, so SmartScreen asks once. Click More info, then Run anyway. It installs for your user only, no admin needed.' },
  { q: 'Which Macs?', a: 'macOS 14 Sonoma or later on Apple silicon. Notched MacBooks get the full effect; other displays get a floating island.' },
  { q: 'What permissions?', a: 'Accessibility for the HUDs, Calendars and Reminders, Camera for the mirror, Automation for Music and Spotify, and Location for weather. Each one is optional.' },
  { q: 'Who made it?', a: 'Apurva Mukherjee, a full-stack engineer in Kolkata. apurva.space' },
];
