import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Icons, the padlock and the bell come from website/, and must use this app's React, not the site's copy.
  resolve: { dedupe: ['react', 'react-dom'] },
  // Tauri's devUrl points here, so the port can't drift.
  server: { port: 1420, strictPort: true, fs: { allow: ['..'] } },
  clearScreen: false,
});
