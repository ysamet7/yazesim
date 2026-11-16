import { defineConfig } from 'vitest/config';

/**
 * Integration tests against a real PostgreSQL (`pnpm --filter @yazesim/database
 * test:db`): each suite creates, migrates and drops its own database. Needs the
 * local Docker stack (`pnpm bootstrap`) or CI's integration job.
 */
export default defineConfig({
  test: {
    include: ['test/**/*.db-spec.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
