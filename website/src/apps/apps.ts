import appstore from '../icons/apps/appstore.webp';
import launchpad from '../icons/apps/apps.webp';
import calendar from '../icons/apps/calendar.webp';
import chrome from '../icons/apps/chrome.webp';
import claude from '../icons/apps/claude.svg';
import clock from '../icons/apps/clock.webp';
import downloads from '../icons/apps/downloads.webp';
import facetime from '../icons/apps/facetime.webp';
import finder from '../icons/apps/finder.webp';
import github from '../icons/apps/github.svg';
import maps from '../icons/apps/maps.webp';
import meet from '../icons/apps/meet.svg';
import messages from '../icons/apps/messages.webp';
import music from '../icons/apps/music.webp';
import notes from '../icons/apps/notes.webp';
import photos from '../icons/apps/photos.webp';
import preview from '../icons/apps/preview.webp';
import quicktime from '../icons/apps/quicktime.webp';
import safari from '../icons/apps/safari.webp';
import settings from '../icons/apps/settings.webp';
import terminal from '../icons/apps/terminal.webp';
import trash from '../icons/apps/trash.webp';
import weather from '../icons/apps/weather.webp';
import whatsapp from '../icons/apps/whatsapp.webp';
import x from '../icons/apps/x.svg';
import xcode from '../icons/apps/xcode.webp';
import zoom from '../icons/apps/zoom.svg';

const visor = `${import.meta.env.BASE_URL}icon.png`;

export interface AppMeta {
  name: string;
  icon: string;
  w: number;
  h: number;
  dark?: boolean;
}

const meta = {
  finder: { name: 'Finder', icon: finder, w: 720, h: 440 },
  launchpad: { name: 'Apps', icon: launchpad, w: 0, h: 0 },
  messages: { name: 'Messages', icon: messages, w: 680, h: 480 },
  facetime: { name: 'FaceTime', icon: facetime, w: 560, h: 420, dark: true },
  visor: { name: 'Visor', icon: visor, w: 780, h: 540 },
  github: { name: 'GitHub', icon: github, w: 900, h: 580 },
  music: { name: 'Music', icon: music, w: 620, h: 420 },
  maps: { name: 'Maps', icon: maps, w: 720, h: 480 },
  appstore: { name: 'App Store', icon: appstore, w: 900, h: 580 },
  notes: { name: 'Notes', icon: notes, w: 740, h: 500 },
  safari: { name: 'Safari', icon: safari, w: 980, h: 620 },
  downloads: { name: 'Downloads', icon: downloads, w: 460, h: 470 },
  claude: { name: 'Claude', icon: claude, w: 520, h: 400 },
  settings: { name: 'System Settings', icon: settings, w: 720, h: 500 },
  xcode: { name: 'Xcode', icon: xcode, w: 680, h: 460 },
  terminal: { name: 'Terminal', icon: terminal, w: 640, h: 400, dark: true },
  whatsapp: { name: 'WhatsApp', icon: whatsapp, w: 640, h: 460 },
  x: { name: 'X', icon: x, w: 560, h: 420, dark: true },
  chrome: { name: 'Google Chrome', icon: chrome, w: 560, h: 400 },
  zoom: { name: 'Zoom', icon: zoom, w: 520, h: 380 },
  meet: { name: 'Google Meet', icon: meet, w: 520, h: 380 },
  photos: { name: 'Photos', icon: photos, w: 760, h: 500 },
  weather: { name: 'Weather', icon: weather, w: 440, h: 460 },
  clock: { name: 'Clock', icon: clock, w: 640, h: 420, dark: true },
  calendar: { name: 'Calendar', icon: calendar, w: 760, h: 520 },
  preview: { name: 'Preview', icon: preview, w: 720, h: 560 },
  quicktime: { name: 'QuickTime Player', icon: quicktime, w: 660, h: 440, dark: true },
  trash: { name: 'Trash', icon: trash, w: 520, h: 320 },
} satisfies Record<string, AppMeta>;

export type AppId = keyof typeof meta;
export const apps: Record<AppId, AppMeta> = meta;

export const dockOrder: AppId[] = [
  'finder', 'launchpad', 'messages', 'facetime', 'visor', 'github', 'music', 'maps', 'appstore', 'notes', 'safari',
  'downloads', 'claude', 'settings', 'xcode', 'terminal', 'whatsapp', 'x', 'chrome', 'zoom', 'meet',
];
