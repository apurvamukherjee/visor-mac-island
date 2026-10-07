import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { openStartupWindows } from './os/boot';
import './App.css';

openStartupWindows();

const root = document.getElementById('root');
if (!root) throw new Error('#root missing from index.html');
createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={new QueryClient()}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
