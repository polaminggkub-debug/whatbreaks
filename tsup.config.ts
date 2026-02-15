import { defineConfig } from 'tsup';

export default defineConfig({
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
});
