import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { composesWithoutCopy } from './scripts/composesLoader';

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this repository at /<repo>/, not at the domain root,
  // so the built asset URLs need that prefix. The deploy workflow passes it in
  // as BASE_PATH; `npm run dev` and `npm run build` locally leave it unset and
  // get the root, which is what the dev server serves from.
  base: process.env.BASE_PATH ?? '/',
  // `composes: x from '…/craft.module.css'` must not paste a copy of craft into
  // every module that composes from it: the build's minifier keeps the LAST
  // copy, after the screens, and every screen override of a composed property
  // loses. Craft is loaded once, first, from src/main.tsx instead.
  plugins: [react(), composesWithoutCopy({ shared: 'src/components/meta/craft.module.css' })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // `.tmp/` is a gitignored scratch area, and a working copy of the repo
    // left in it gets collected as a second copy of every test file — which
    // silently doubles the reported count. A test suite that lies about how
    // much it ran is the instrument problem CLAUDE.md § 5 is about.
    exclude: ['**/node_modules/**', '**/dist/**', '.tmp/**'],
  },
  server: {
    allowedHosts: ['fragile-eats-dimness.ngrok-free.dev']
  }
});
