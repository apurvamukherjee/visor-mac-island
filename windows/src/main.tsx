import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getCurrentWindow } from '@tauri-apps/api/window';
import '@fontsource-variable/inter/wght.css';
import { Island } from './island/Island';
import { startTransients } from './island/store';
import { report, showSettings, startSystem } from './native';
import { Settings } from './settings/Settings';
import { startNativeSettings, useSettings } from './settings/store';
import { Tasks } from './tasks/Tasks';

const root = document.getElementById('root');
if (!root) throw new Error('index.html is missing #root');

// One bundle serves every window; the Rust side names them island-*, settings or tasks.
const label = getCurrentWindow().label;
const isIsland = label !== 'settings' && label !== 'tasks';
document.documentElement.classList.add(isIsland ? 'is-island' : 'is-settings');

startNativeSettings();
// Settings reads the accent and battery too, so every window listens to the system state.
startSystem();
if (isIsland) {
  startTransients();
  // First launch: the first monitor's island opens Settings, which starts with the welcome.
  if (label.endsWith('-0') && !useSettings.getState().onboarded) showSettings().catch(report);
}

const queries = new QueryClient();

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queries}>{label === 'settings' ? <Settings /> : label === 'tasks' ? <Tasks /> : <Island />}</QueryClientProvider>
  </StrictMode>,
);
