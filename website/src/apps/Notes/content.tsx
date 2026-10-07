import type { ReactNode } from 'react';
import { QUARANTINE_CMD, links } from '../../links';
import { inline } from '../markdown';
import { Command } from '../ui';

export interface Note {
  id: string;
  title: string;
  preview: string;
  folder: 'Apurva' | 'Visor';
  body: ReactNode;
}

const ext = (href: string, text: string) => <a href={href} target="_blank" rel="noreferrer">{text}</a>;

const rows = (pairs: [string, string][], boldFirst = false) => (
  <table>
    <tbody>
      {pairs.map(([a, b]) => <tr key={a}><td>{boldFirst ? <b>{a}</b> : a}</td><td>{b}</td></tr>)}
    </tbody>
  </table>
);

export const notes: Note[] = [
  {
    id: 'hello',
    title: 'Hi, I’m Apurva 👋',
    preview: 'Full-stack engineer and product builder',
    folder: 'Apurva',
    body: (
      <>
        <p>I’m <b>Apurva Mukherjee</b>, a full-stack engineer and product builder based in Kolkata, working mostly in React, React Native and Node.js.</p>
        <p>Visor is my free, open-source app for the MacBook notch. This desktop is its website: everything you see is clickable.</p>
        <ul>
          <li>Portfolio: {ext('https://apurva.space', 'apurva.space')}</li>
          <li>GitHub: {ext(links.author, '@apurvamukherjee')}</li>
          <li>Visor: {ext(links.repo, 'visor-mac-island')}</li>
        </ul>
        <p>Found a bug or want a feature? {ext(links.newIssue, 'Open an issue')}.</p>
      </>
    ),
  },
  {
    id: 'new',
    title: `What’s new in ${__RELEASE__.version}`,
    preview: __RELEASE__.date,
    folder: 'Visor',
    body: (
      <>
        <ul>{__RELEASE__.notes.map((n) => <li key={n}>{inline(n)}</li>)}</ul>
        <p>{ext(links.changelog, 'Full changelog ↗')}</p>
      </>
    ),
  },
  {
    id: 'install',
    title: 'Install Visor',
    preview: 'Download, drag, clear quarantine',
    folder: 'Visor',
    body: (
      <>
        <ol>
          <li>Download {ext(links.dmg, 'Visor.dmg')} (always the latest release).</li>
          <li>Open it and drag <b>Visor</b> into <b>Applications</b>.</li>
          <li>Builds are ad-hoc signed, so macOS quarantines them. Clear that once:<Command text={QUARANTINE_CMD} /></li>
          <li>Open Visor. The welcome tour explains each permission before it asks for it.</li>
        </ol>
        <p>Needs macOS 14 Sonoma or later and Apple silicon. Notched MacBooks get the full effect; other displays get a floating island.</p>
      </>
    ),
  },
  {
    id: 'use',
    title: 'How to use',
    preview: 'Hover, scroll, drag a file',
    folder: 'Visor',
    body: rows([
      ['Hover over the notch, or click it', 'opens'],
      ['Move the pointer away', 'closes'],
      ['Scroll down on the notch with two fingers', 'opens'],
      ['Scroll up on the open notch', 'closes'],
      ['Swipe sideways on the closed notch', 'changes track'],
      ['Drag a file toward the notch', 'opens the shelf for you to drop it'],
      ['Click the record icon in the menu bar', 'shows Settings, Restart and Quit'],
    ]),
  },
  {
    id: 'shortcuts',
    title: 'Keyboard shortcuts',
    preview: '⌘⇧I and ⌘⇧H',
    folder: 'Visor',
    body: (
      <>
        <p><kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>I</kbd> opens or closes the notch.</p>
        <p><kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>H</kbd> shows a sneak peek of what’s playing.</p>
        <p>Change either one in Settings → Shortcuts.</p>
      </>
    ),
  },
  {
    id: 'permissions',
    title: 'Permissions',
    preview: 'Each one is optional',
    folder: 'Visor',
    body: (
      <>
        {rows([
          ['Accessibility', 'Replacing the system HUDs and handling the brightness and backlight keys'],
          ['Calendars, Reminders', 'The calendar and reminders beside the player'],
          ['Camera', 'The mirror'],
          ['Automation', 'Controlling Apple Music and Spotify'],
          ['Location', 'The weather beside the calendar (off unless you turn it on)'],
        ], true)}
        <p>Skip one and only the feature that needs it stays off.</p>
      </>
    ),
  },
  {
    id: 'build',
    title: 'Build from source',
    preview: 'xcodegen and xcodebuild',
    folder: 'Visor',
    body: (
      <>
        <Command text="brew install xcodegen" />
        <Command text="xcodegen generate" />
        <Command text="xcodebuild -scheme Visor -configuration Debug build" />
        <p>Package a styled DMG with <code>bash scripts/make-dmg.sh</code>. Visor is GPL-3.0: {ext(links.license, 'read the license')}.</p>
      </>
    ),
  },
];
