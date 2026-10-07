import type { ComponentType } from 'react';
import type { AppId } from './apps';
import { AppStore } from './AppStore/AppStore';
import { Chrome } from './Chrome/Chrome';
import { Downloads } from './Downloads/Downloads';
import { Messages } from './Messages/Messages';
import { Music } from './Music/Music';
import { Notes } from './Notes/Notes';
import { QuickTime } from './QuickTime/QuickTime';
import { GitHub, Safari } from './Safari/Safari';
import { WhatsApp } from './Share/WhatsApp';
import { X } from './Share/X';
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
  whatsapp: WhatsApp,
  x: X,
  chrome: Chrome,
};
