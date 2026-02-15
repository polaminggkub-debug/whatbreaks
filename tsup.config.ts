import { defineConfig } from 'tsup';

export default defineConfig([
  // CLI bundle
  {
    entry: ['src/cli/index.ts'],
    format: ['esm'],
    target: 'node18',
    clean: true,
    splitting: false,
    sourcemap: true,
    dts: false,
    outDir: 'dist/cli',
    banner: {
      js: '#!/usr/bin/env node',
    },
    external: ['ts-morph'],
  },
  // Playwright reporter (standalone, no external deps)
  {
    entry: ['src/playwright/whatbreaks-reporter.ts'],
    format: ['esm'],
    target: 'node18',
    clean: false,
    splitting: false,
    sourcemap: false,
    dts: false,
    outDir: 'dist/playwright',
  },
]);
