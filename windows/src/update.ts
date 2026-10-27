// Not /releases/latest: that's the Mac's release, and Windows builds ship under their own windows-v tags.
const RELEASES = 'https://api.github.com/repos/apurvamukherjee/visor-mac-island/releases?per_page=20';

export interface Release {
  version: string;
  url: string;
}

const bare = (v: string) => v.replace(/^(windows-)?v/, '');

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

export interface GitHubRelease {
  tag_name: string;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
  assets: { name: string }[];
}

/** The highest-versioned published release that carries a Windows installer, if it's newer than this build. */
export function pickUpdate(releases: GitHubRelease[], current: string): Release | null {
  let best: GitHubRelease | null = null;
  for (const r of releases) {
    if (r.draft || r.prerelease || !r.assets.some((a) => a.name.endsWith('.exe'))) continue;
    if (!best || isNewer(r.tag_name, best.tag_name)) best = r;
  }
  return best && isNewer(best.tag_name, current) ? { version: bare(best.tag_name), url: best.html_url } : null;
}

export async function checkForUpdate(current: string): Promise<Release | null> {
  const res = await fetch(RELEASES);
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  return pickUpdate((await res.json()) as GitHubRelease[], current);
}
