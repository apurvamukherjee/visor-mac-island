import type { ComponentType } from 'react';
import type { AppId } from './apps';
import { AppStore } from './AppStore/AppStore';
import { apps } from './apps';
import { Call } from './Calls/Call';
import { Chrome } from './Chrome/Chrome';
import { Photos } from './Photos/Photos';
import { Calendar } from './Calendar/Calendar';
import { Weather } from './Weather/Weather';
import { Clock } from './Clock/Clock';
import { FaceTime } from './FaceTime/FaceTime';
import { Finder } from './Finder/Finder';
import { Downloads } from './Downloads/Downloads';
import { Messages } from './Messages/Messages';
import { Music } from './Music/Music';
import { Notes } from './Notes/Notes';
import { QuickTime } from './QuickTime/QuickTime';
import { GitHub, Safari } from './Safari/Safari';
import { WhatsApp } from './Share/WhatsApp';
import { X } from './Share/X';
import { Terminal } from './Terminal/Terminal';
import { Trash } from './Trash/Trash';
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
  zoom: () => <Call app="Zoom" brand="#0b5cff" icon={apps.zoom.icon} />,
  meet: () => <Call app="Meet" brand="#1a73e8" icon={apps.meet.icon} />,
  clock: Clock,
  weather: Weather,
  calendar: Calendar,
  photos: Photos,
  finder: Finder,
  trash: Trash,
  facetime: FaceTime,
};
