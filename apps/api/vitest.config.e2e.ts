import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { testDatabaseUrl } from './test/setup/test-database.js';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    fileParallelism: false,
    globalSetup: ['./test/setup/global-setup.ts'],
    env: { DATABASE_URL: testDatabaseUrl(), NODE_ENV: 'test' },
  },
});
