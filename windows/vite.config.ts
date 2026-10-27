import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Tauri's devUrl points here, so the port can't drift.
  server: { port: 1420, strictPort: true },
  clearScreen: false,
});
