import type { ComponentType } from 'react';
import type { AppId } from './apps';
import { Visor } from './Visor/Visor';

export const views: Partial<Record<AppId, ComponentType>> = {
  visor: Visor,
};
