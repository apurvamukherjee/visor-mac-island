const repo = 'https://github.com/apurvamukherjee/visor-mac-island';

export const links = {
  repo,
  dmg: `${repo}/releases/latest/download/Visor.dmg`,
  // Releases since 3.9.0 carry the installer as Visor-Setup.exe too, so this always gets the newest, like the DMG.
  exe: `${repo}/releases/latest/download/Visor-Setup.exe`,
  releases: `${repo}/releases`,
  readme: `${repo}#readme`,
  changelog: `${repo}/blob/main/CHANGELOG.md`,
  issues: `${repo}/issues`,
  newIssue: `${repo}/issues/new`,
  license: `${repo}/blob/main/LICENSE`,
  author: 'https://github.com/apurvamukherjee',
  // MacNative's own embed: the listing link carries their referral tags, the badge is served by them.
  macnative: 'https://macnative.io/apps/visor?utm_source=macnative-badge&utm_medium=referral',
  macnativeBadge: (theme: 'light' | 'dark') => `https://macnative.io/badge?kind=listed&theme=${theme}&slug=visor`,
} as const;

export const QUARANTINE_CMD = 'xattr -dr com.apple.quarantine /Applications/Visor.app';
