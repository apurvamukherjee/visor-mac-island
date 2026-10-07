import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readRelease } from './release';

export default defineConfig({
  base: '/visor-mac-island/',
  plugins: [react()],
  define: { __RELEASE__: JSON.stringify(readRelease()) },
  server: { fs: { allow: ['..'] } },
});
