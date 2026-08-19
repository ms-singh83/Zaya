import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'app/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['lib/domain/**/*.ts'],
      exclude: ['lib/domain/**/*.test.ts', 'lib/domain/index.ts'],
      // docs/16-TESTING-STRATEGY.md §1: lib/domain is the one place the number is enforced.
      thresholds: { lines: 95, functions: 95, branches: 90, statements: 95 },
    },
  },
});
