import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Island } from './island/Island';
import { startTransients } from './island/store';
import { startSystem } from './native';
import { Settings } from './settings/Settings';
import { startNativeSettings } from './settings/store';

const root = document.getElementById('root');
if (!root) throw new Error('index.html is missing #root');

// One bundle serves every window; the Rust side names them island-* or settings.
const isSettings = getCurrentWindow().label === 'settings';
document.documentElement.classList.add(isSettings ? 'is-settings' : 'is-island');

startNativeSettings();
if (!isSettings) {
  startSystem();
  startTransients();
}

const queries = new QueryClient();

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queries}>{isSettings ? <Settings /> : <Island />}</QueryClientProvider>
  </StrictMode>,
);
