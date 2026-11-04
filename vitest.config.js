import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.js'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/main.js'],
      reporter: ['text', 'html'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
