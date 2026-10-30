export interface Line {
  time: number;
  text: string;
}

export interface Lyrics {
  synced: Line[];
  plain: string;
}

/** Synced lyrics in LRC: `[mm:ss.xx] words`, sometimes several stamps per line. Blank lines are dropped, as the Mac does. */
export function parseLrc(lrc: string): Line[] {
  const lines: Line[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    const text = raw.replace(/\[[^\]]*\]/g, '').trim();
    if (text) for (const [, m = '0', s = '0'] of stamps) lines.push({ time: Number(m) * 60 + Number(s), text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

/** The line being sung at `position` seconds, held through the gaps; the first line before the song starts, as the Mac's lyricLine. */
export function lineAt(lines: Line[], position: number) {
  let current = lines[0]?.text ?? '';
  for (const line of lines) {
    if (line.time > position) break;
    current = line.text;
  }
  return current;
}

interface LrcLibResult {
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

/** LRCLIB, as the Mac app's MusicManager uses: free, no key. */
export async function fetchLyrics(title: string, artist: string): Promise<Lyrics> {
  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const url = new URL('https://lrclib.net/api/search');
  url.searchParams.set('track_name', fold(title));
  url.searchParams.set('artist_name', fold(artist));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`LRCLIB answered ${res.status}`);
  const [first] = (await res.json()) as LrcLibResult[];
  return { synced: parseLrc(first?.syncedLyrics ?? ''), plain: first?.plainLyrics?.trim() ?? '' };
}
