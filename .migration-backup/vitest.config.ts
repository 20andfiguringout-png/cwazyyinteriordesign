import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname_resolved = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    pool: 'forks',
    isolate: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname_resolved, 'src'),
    },
  },
});
