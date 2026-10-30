export interface Line {
  time: number;
  text: string;
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
  syncedLyrics: string | null;
}

// Bracketed extras that name an upload, not the song: "(Official Video)", "[Lyrics]", "(feat. X)".
const EXTRAS = /\s*[([][^)\]]*\b(official|video|audio|lyrics?|visuali[sz]er|remaster(ed)?|feat|ft|explicit|hd|4k|mv)\b[^)\]]*[)\]]/gi;
const REMASTER = /\s+-\s+[^-]*\bremaster(ed)?\b.*$/i;
const squash = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/** The song's own title and artist from what a player reports, YouTube's "Artist - Song (Official Video)" by a VEVO channel included. */
export function cleanQuery(title: string, artist: string) {
  let a = artist.replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').trim();
  let t = title.replace(EXTRAS, '').replace(REMASTER, '').trim();
  const dash = t.indexOf(' - ');
  if (dash > 0) {
    const left = t.slice(0, dash);
    if (!a || squash(left).includes(squash(a)) || squash(a).includes(squash(left))) {
      a = left;
      t = t.slice(dash + 3);
    }
  }
  return { title: t, artist: a };
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * LRCLIB, as the Mac app's MusicManager uses: free, no key. The exact lookup with the song's
 * length goes first, since search alone often lands on a live take or a cover; search is the fallback.
 */
export async function fetchLyrics(title: string, artist: string, duration: number): Promise<Line[]> {
  const q = cleanQuery(title, artist);
  const query = (endpoint: string) => {
    const url = new URL(`https://lrclib.net/api/${endpoint}`);
    url.searchParams.set('track_name', fold(q.title));
    url.searchParams.set('artist_name', fold(q.artist));
    return url;
  };
  if (duration > 0) {
    const url = query('get');
    url.searchParams.set('duration', String(Math.round(duration)));
    const res = await fetch(url);
    if (res.ok) {
      const exact = (await res.json()) as LrcLibResult;
      if (exact.syncedLyrics) return parseLrc(exact.syncedLyrics);
    } else if (res.status !== 404) throw new Error(`LRCLIB answered ${res.status}`);
  }
  const res = await fetch(query('search'));
  if (!res.ok) throw new Error(`LRCLIB answered ${res.status}`);
  const [first] = (await res.json()) as LrcLibResult[];
  return first?.syncedLyrics ? parseLrc(first.syncedLyrics) : [];
}
