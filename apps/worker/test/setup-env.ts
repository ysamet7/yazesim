import { existsSync } from 'node:fs';
import { inject } from 'vitest';

// End-to-end tests run against the local Docker stack configured by `pnpm bootstrap`...
if (existsSync('.env')) process.loadEnvFile('.env');
// ...on the throwaway database of this run, with queue jobs under its own prefix.
process.env.DATABASE_URL = inject('databaseUrl');
process.env.QUEUE_PREFIX = inject('queuePrefix');
