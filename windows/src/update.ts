const LATEST = 'https://api.github.com/repos/apurvamukherjee/visor-mac-island/releases/latest';

export interface Release {
  version: string;
  url: string;
}

const bare = (v: string) => v.replace(/^v/, '');

/** Numeric, part by part, as UpdateChecker.isNewer compares: 3.10.0 is newer than 3.9.1. */
export function isNewer(tag: string, current: string) {
  const a = bare(tag).split('.').map(Number);
  const b = bare(current).split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d > 0;
  }
  return false;
}

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  assets: { name: string }[];
}

/** The newest release that carries a Windows installer, if it's newer than this build. */
export async function checkForUpdate(current: string): Promise<Release | null> {
  const res = await fetch(LATEST);
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  const release = (await res.json()) as GitHubRelease;
  const forWindows = release.assets.some((a) => a.name.endsWith('.exe'));
  return forWindows && isNewer(release.tag_name, current) ? { version: bare(release.tag_name), url: release.html_url } : null;
}
