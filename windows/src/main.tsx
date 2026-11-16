import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getCurrentWindow } from '@tauri-apps/api/window';
import '@fontsource-variable/inter/wght.css';
import { report, showSettings, startSystem } from './native';
import { startNativeSettings, useSettings } from './settings/store';

const root = document.getElementById('root');
if (!root) throw new Error('index.html is missing #root');

// One page serves every window; the Rust side names them island-*, glow-*, settings or tasks.
const label = getCurrentWindow().label;
const isGlow = label.startsWith('glow-');
const isIsland = !isGlow && label !== 'settings' && label !== 'tasks';
document.documentElement.classList.add(isGlow ? 'is-glow' : isIsland ? 'is-island' : 'is-settings');

startNativeSettings();
// Settings reads the accent and battery too, so every window listens to the system state.
startSystem();
// First launch: the first monitor's island opens Settings, which starts with the welcome.
if (isIsland && label.endsWith('-0') && !useSettings.getState().onboarded) showSettings().catch(report);

// Each window loads only its own code: every one is a webview of its own, and the glow's is
// opened afresh each time music starts.
const View = lazy(async () => {
  if (isGlow) return { default: (await import('./glow/Glow')).Glow };
  if (label === 'settings') return { default: (await import('./settings/Settings')).Settings };
  if (label === 'tasks') return { default: (await import('./tasks/Tasks')).Tasks };
  const [{ Island }, { startTransients }] = await Promise.all([import('./island/Island'), import('./island/store')]);
  startTransients();
  return { default: Island };
});

const queries = new QueryClient();

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queries}>
      <Suspense>
        <View />
      </Suspense>
    </QueryClientProvider>
  </StrictMode>,
);
