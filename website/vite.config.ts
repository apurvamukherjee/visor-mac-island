import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readRelease } from './release.ts';

export default defineConfig({
  // GitHub Pages serves the site under the repo name; Vercel serves it at the root.
  base: process.env.SITE_BASE ?? '/',
  plugins: [react()],
  define: { __RELEASE__: JSON.stringify(readRelease()) },
  server: { fs: { allow: ['..'] } },
});
