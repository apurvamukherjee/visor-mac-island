export interface Line {
  time: number;
  text: string;
}

/** Synced lyrics in LRC: `[mm:ss.xx] words`, sometimes several stamps per line. */
export function parseLrc(lrc: string): Line[] {
  const lines: Line[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    const text = raw.replace(/\[[^\]]*\]/g, '').trim();
    for (const [, m = '0', s = '0'] of stamps) lines.push({ time: Number(m) * 60 + Number(s), text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

/** The line being sung at `position` seconds, or '' between verses. */
export function lineAt(lines: Line[], position: number) {
  let current = '';
  for (const line of lines) {
    if (line.time > position) break;
    current = line.text;
  }
  return current;
}

interface LrcLibResult {
  syncedLyrics: string | null;
}

/** LRCLIB, as the Mac app's MusicManager uses: free, no key. */
export async function fetchLyrics(title: string, artist: string): Promise<Line[]> {
  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const url = new URL('https://lrclib.net/api/search');
  url.searchParams.set('track_name', fold(title));
  url.searchParams.set('artist_name', fold(artist));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`LRCLIB answered ${res.status}`);
  const [first] = (await res.json()) as LrcLibResult[];
  return first?.syncedLyrics ? parseLrc(first.syncedLyrics) : [];
}
