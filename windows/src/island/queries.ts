import { useQuery } from '@tanstack/react-query';
import { getVersion } from '@tauri-apps/api/app';
import { fetchText, mediaCover, thumbnail, useSystem } from '../native';
import { useSettings } from '../settings/store';
import { checkForUpdate } from '../update';
import { useNow } from '../../../website/src/os/useNow';
import { parseIcs, type CalEvent } from './ics';
import { fetchLyrics, lineAt } from './lyrics';
import { fetchWeather } from './weather';

const MINUTE = 60_000;
const DAY_MS = 24 * 60 * MINUTE;
// MeetingMonitor: the Join button shows two minutes early and stays five minutes in.
const MEETING_LEAD = 2 * MINUTE;
const MEETING_GRACE = 5 * MINUTE;

function toDataUrl(bytes: ArrayBuffer) {
  return new Promise<string>((ok, fail) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? ok(reader.result) : fail(new Error('no data URL')));
    reader.onerror = () => fail(reader.error);
    // The image decoder sniffs PNG or JPEG itself; the type only has to say image.
    reader.readAsDataURL(new Blob([bytes], { type: 'image/jpeg' }));
  });
}

let coverUrl: string | null = null;

export function useCover() {
  const cover = useSystem((s) => s.media?.cover ?? 0);
  return useQuery({
    queryKey: ['cover', cover],
    queryFn: async () => {
      const bytes = await mediaCover();
      // A blob link, not a data URL: the island sets it in a style on every render, and a data URL
      // is the whole image as text. Each cover replaces the last, so the last one's link is freed.
      if (coverUrl) URL.revokeObjectURL(coverUrl);
      coverUrl = bytes.byteLength ? URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' })) : null;
      return coverUrl;
    },
    enabled: cover > 0,
    staleTime: Infinity,
    // The last cover stays up while the next one loads, instead of a ♪ flash on every skip.
    placeholderData: (last) => (cover > 0 ? last : undefined),
  }).data;
}

/** The cover's average color: Visor on the Mac tints the visualizer and glow with it. */
export function useCoverColor() {
  const cover = useCover();
  return useQuery({
    queryKey: ['cover-color', cover],
    queryFn: async () => {
      if (!cover) return null;
      const image = new Image();
      image.src = cover;
      await image.decode();
      // Scaling the whole cover into one pixel makes the browser average it.
      const canvas = new OffscreenCanvas(1, 1);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No 2D canvas to average the cover with');
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, 1, 1);
      const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
      return `rgb(${r} ${g} ${b})`;
    },
    enabled: cover != null,
    staleTime: Infinity,
  }).data;
}

export function useThumbnail(path: string) {
  return useQuery({ queryKey: ['thumb', path], queryFn: async () => toDataUrl(await thumbnail(path)), staleTime: Infinity, retry: false });
}

/** Today two days back to three days on, as the calendar strip shows. */
export function useEvents() {
  const calendars = useSettings((s) => s.calendars);
  const showCalendar = useSettings((s) => s.showCalendar);
  const meetingAlerts = useSettings((s) => s.meetingAlerts);
  const urls = calendars.split('\n').map((u) => u.trim()).filter(Boolean);
  return useQuery({
    queryKey: ['events', urls],
    queryFn: async (): Promise<CalEvent[]> => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const from = new Date(today.getTime() - 2 * DAY_MS);
      const to = new Date(today.getTime() + 4 * DAY_MS);
      // Each feed stands alone, so one dead link doesn't blank the others.
      const feeds = await Promise.allSettled(urls.map(fetchText));
      const read = feeds.flatMap((f) => (f.status === 'fulfilled' ? [f.value] : []));
      for (const f of feeds) if (f.status === 'rejected') console.warn('visor: a calendar failed to load', f.reason);
      if (!read.length) throw new Error('No calendar could be loaded');
      return read.flatMap((f) => parseIcs(f, from, to)).sort((a, b) => a.start.getTime() - b.start.getTime());
    },
    enabled: urls.length > 0 && (showCalendar || meetingAlerts),
    refetchInterval: 15 * MINUTE,
    staleTime: 5 * MINUTE,
  });
}

/** The video call that's about to start or just has, for the Join button. */
export function useMeeting() {
  const meetingAlerts = useSettings((s) => s.meetingAlerts);
  const events = useEvents().data;
  const now = useNow(30_000).getTime();
  if (!meetingAlerts) return null;
  return (
    events?.find((e) => e.call && !e.allDay && now >= e.start.getTime() - MEETING_LEAD && now <= e.start.getTime() + MEETING_GRACE) ?? null
  );
}

export function useWeather() {
  const show = useSettings((s) => s.showWeather && s.showCalendar);
  // WeatherManager.maxAge: half an hour between readings.
  return useQuery({ queryKey: ['weather'], queryFn: fetchWeather, enabled: show, staleTime: 30 * MINUTE, refetchInterval: 30 * MINUTE }).data;
}

/** The line to show under the artist; null when lyrics are off. */
export function useLyric(position: number) {
  const enabled = useSettings((s) => s.lyrics);
  const title = useSystem((s) => s.media?.title ?? '');
  const artist = useSystem((s) => s.media?.artist ?? '');
  // Not in the key: a browser often reports the length a moment after the title, and that's no reason to fetch again.
  const duration = useSystem((s) => s.media?.duration ?? 0);
  const { data, isPending } = useQuery({
    queryKey: ['lyrics', title, artist],
    queryFn: () => fetchLyrics(title, artist, duration),
    enabled: enabled && title !== '',
    staleTime: Infinity,
    // Three retries keep "Loading lyrics…" up for about 7 s when LRCLIB is down; one is enough.
    retry: 1,
  });
  if (!enabled || !title) return null;
  if (isPending) return 'Loading lyrics…';
  // Unsynced lyrics would be the whole song crammed into one cut-off line, so only synced ones show.
  return data?.length ? lineAt(data, position) : 'No synced lyrics';
}

export function useUpdate() {
  const enabled = useSettings((s) => s.checkForUpdates);
  // UpdateChecker: at launch and once a day after.
  return useQuery({
    queryKey: ['update'],
    queryFn: async () => checkForUpdate(await getVersion()),
    enabled,
    staleTime: DAY_MS,
    refetchInterval: DAY_MS,
  });
}
