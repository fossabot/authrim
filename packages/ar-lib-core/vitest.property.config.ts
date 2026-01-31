/**
 * Vitest configuration for property-based tests
 *
 * Runs only fast-check property tests, which may take longer than unit tests.
 * Use `pnpm test:property` to run these tests separately.
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['../../test/setup.ts'],
    include: ['src/**/__tests__/**/*.property.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Property tests may take longer, increase timeout
    testTimeout: 60000,
    // Optionally increase hook timeout for async property tests
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'test/', 'dist/', '**/*.d.ts', '**/*.config.*', '**/mockData.ts'],
    },
  },
  resolve: {
    alias: {
      'cloudflare:workers': path.resolve(__dirname, '../../test/mocks/cloudflare-workers.ts'),
    },
  },
});
