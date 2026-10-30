import { expect, test } from 'vitest';
import { isNewer, pickUpdate, type GitHubRelease } from './update';

test('versions compare part by part, numerically', () => {
  expect(isNewer('v3.10.0', '3.9.1')).toBe(true);
  expect(isNewer('v3.7.1', '3.7.1')).toBe(false);
  expect(isNewer('3.7', '3.7.1')).toBe(false);
  expect(isNewer('v4.0.0', '3.99.99')).toBe(true);
});

const release = (tag: string, assets: string[], extra: Partial<GitHubRelease> = {}): GitHubRelease => ({
  tag_name: tag,
  html_url: `https://example.com/${tag}`,
  draft: false,
  prerelease: false,
  assets: assets.map((name) => ({ name, browser_download_url: `https://example.com/${tag}/${name}` })),
  ...extra,
});

test('updates come from the newest release with a windows installer, mac tags or windows tags', () => {
  const releases = [
    release('v3.8.0', ['Visor.dmg']),
    release('windows-v3.7.3', ['Visor-Setup-3.7.3.exe'], { prerelease: true }),
    release('windows-v3.7.2', ['Visor-Setup-3.7.2.exe']),
    release('v3.7.1', ['Visor.dmg', 'Visor-Setup-3.7.1.exe']),
  ];
  expect(pickUpdate(releases, '3.7.1')).toEqual({ version: '3.7.2', url: 'https://example.com/windows-v3.7.2/Visor-Setup-3.7.2.exe' });
  expect(pickUpdate(releases, '3.7.2')).toBeNull();
  expect(pickUpdate([release('v3.8.0', ['Visor.dmg'])], '3.7.1')).toBeNull();
});
