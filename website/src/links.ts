const repo = 'https://github.com/apurvamukherjee/visor-mac-island';

export const links = {
  repo,
  dmg: `${repo}/releases/latest/download/Visor.dmg`,
  releases: `${repo}/releases`,
  readme: `${repo}#readme`,
  changelog: `${repo}/blob/main/CHANGELOG.md`,
  issues: `${repo}/issues`,
  newIssue: `${repo}/issues/new`,
  license: `${repo}/blob/main/LICENSE`,
  author: 'https://github.com/apurvamukherjee',
} as const;

export const QUARANTINE_CMD = 'xattr -dr com.apple.quarantine /Applications/Visor.app';
