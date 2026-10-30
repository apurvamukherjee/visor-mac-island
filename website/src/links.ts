const repo = 'https://github.com/apurvamukherjee/visor-mac-island';

export const links = {
  repo,
  dmg: `${repo}/releases/latest/download/Visor.dmg`,
  // Windows releases are never marked latest (the Mac's update check reads latest), so this names the tag. Bump it with each windows-v release.
  exe: `${repo}/releases/latest/download/Visor-Setup.exe`,
  releases: `${repo}/releases`,
  readme: `${repo}#readme`,
  changelog: `${repo}/blob/main/CHANGELOG.md`,
  issues: `${repo}/issues`,
  newIssue: `${repo}/issues/new`,
  license: `${repo}/blob/main/LICENSE`,
  author: 'https://github.com/apurvamukherjee',
} as const;

export const QUARANTINE_CMD = 'xattr -dr com.apple.quarantine /Applications/Visor.app';
