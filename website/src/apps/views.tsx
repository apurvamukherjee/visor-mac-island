import type { ComponentType } from 'react';
import type { AppId } from './apps';

export const views: Partial<Record<AppId, ComponentType>> = {};
