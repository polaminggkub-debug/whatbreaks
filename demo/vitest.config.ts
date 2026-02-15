import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'src/core'),
      '@skills': path.resolve(__dirname, 'src/skills'),
      '@items': path.resolve(__dirname, 'src/items'),
      '@battle': path.resolve(__dirname, 'src/battle'),
      '@characters': path.resolve(__dirname, 'src/characters'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
