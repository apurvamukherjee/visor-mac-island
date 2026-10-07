import finder from '../icons/finder.svg';
import messages from '../icons/messages.svg';
import notes from '../icons/notes.svg';
import quicktime from '../icons/quicktime.svg';
import settings from '../icons/settings.svg';
import trash from '../icons/trash.svg';
import downloads from '../icons/downloads.svg';
import github from '../icons/github.svg';
import terminal from '../icons/terminal.svg';

const visor = `${import.meta.env.BASE_URL}icon.png`;

export type AppId = 'finder' | 'visor' | 'github' | 'messages' | 'notes' | 'quicktime' | 'downloads' | 'terminal' | 'settings' | 'trash';

export interface AppMeta {
  name: string;
  icon: string;
  w: number;
  h: number;
}

export const apps: Record<AppId, AppMeta> = {
  finder: { name: 'Finder', icon: finder, w: 640, h: 400 },
  visor: { name: 'Visor', icon: visor, w: 760, h: 520 },
  github: { name: 'GitHub', icon: github, w: 820, h: 540 },
  messages: { name: 'Messages', icon: messages, w: 640, h: 460 },
  notes: { name: 'Notes', icon: notes, w: 680, h: 480 },
  quicktime: { name: 'QuickTime Player', icon: quicktime, w: 640, h: 420 },
  downloads: { name: 'Downloads', icon: downloads, w: 460, h: 440 },
  terminal: { name: 'Terminal', icon: terminal, w: 620, h: 380 },
  settings: { name: 'System Settings', icon: settings, w: 700, h: 480 },
  trash: { name: 'Trash', icon: trash, w: 480, h: 300 },
};

export const dockOrder: AppId[] = ['finder', 'visor', 'github', 'messages', 'notes', 'quicktime', 'downloads', 'terminal', 'settings'];
