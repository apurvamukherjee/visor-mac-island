import type { ComponentType } from 'react';
import type { AppId } from './apps';
import { AppStore } from './AppStore/AppStore';
import { Downloads } from './Downloads/Downloads';
import { Messages } from './Messages/Messages';
import { Music } from './Music/Music';
import { Notes } from './Notes/Notes';
import { QuickTime } from './QuickTime/QuickTime';
import { GitHub, Safari } from './Safari/Safari';
import { Terminal } from './Terminal/Terminal';
import { Visor } from './Visor/Visor';

export const views: Partial<Record<AppId, ComponentType>> = {
  visor: Visor,
  downloads: Downloads,
  terminal: Terminal,
  notes: Notes,
  safari: () => <Safari />,
  github: GitHub,
  quicktime: QuickTime,
  appstore: AppStore,
  music: Music,
  messages: Messages,
};
