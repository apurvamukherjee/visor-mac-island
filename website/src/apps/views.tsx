import type { ComponentType } from 'react';
import type { AppId } from './apps';
import { Downloads } from './Downloads/Downloads';
import { Visor } from './Visor/Visor';

export const views: Partial<Record<AppId, ComponentType>> = {
  visor: Visor,
  downloads: Downloads,
};
