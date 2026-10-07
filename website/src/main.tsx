import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { openStartupWindows } from './os/boot';
import { installShortcuts } from './os/shortcuts';
import './App.css';

// The boot bar's last 0.3s fill plus its 0.35s-delayed 0.5s fade, from index.html.
const BOOT_OUT_MS = 900;

openStartupWindows();
installShortcuts();

const root = document.getElementById('root');
if (!root) throw new Error('#root missing from index.html');
createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={new QueryClient()}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);

// Hand off from index.html's boot screen: finish the bar, then dissolve it into the welcome screen.
const boot = document.getElementById('boot');
if (boot) {
  boot.classList.add('is-done');
  setTimeout(() => boot.remove(), BOOT_OUT_MS);
}
