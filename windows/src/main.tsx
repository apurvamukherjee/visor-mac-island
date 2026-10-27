import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Island } from './island/Island';
import { Settings } from './settings/Settings';

const root = document.getElementById('root');
if (!root) throw new Error('index.html is missing #root');

// One bundle serves every window; the Rust side names them island-* or settings.
const isSettings = getCurrentWindow().label === 'settings';
document.documentElement.classList.add(isSettings ? 'is-settings' : 'is-island');

createRoot(root).render(<StrictMode>{isSettings ? <Settings /> : <Island />}</StrictMode>);
