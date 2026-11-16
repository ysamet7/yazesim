/**
 * The end-to-end tests run on a throwaway database (see apps/api) and put
 * queue jobs under a prefix of their own, removed at the end, so a
 * development worker never sees them.
 */
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createThrowawayDatabase } from '@yazesim/test-support';
import { Queue } from 'bullmq';
import type { TestProject } from 'vitest/node';
import { redisConnection } from '../src/queue/connection.js';
import { SYSTEM_QUEUE } from '../src/queue/system-queue.js';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
    queuePrefix: string;
  }
}

const WORKER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const envFile = path.join(WORKER_DIR, '.env');
  if (process.env.DATABASE_URL === undefined && existsSync(envFile)) process.loadEnvFile(envFile);
  const base = process.env.DATABASE_URL;
  const redisUrl = process.env.REDIS_URL;
  if (base === undefined || base === '' || redisUrl === undefined || redisUrl === '') {
    throw new Error('DATABASE_URL veya REDIS_URL yok: önce `pnpm bootstrap` çalıştırın.');
  }
  const database = await createThrowawayDatabase(base);
  const queuePrefix = `e2e-${randomBytes(6).toString('hex')}`;
  project.provide('databaseUrl', database.url);
  project.provide('queuePrefix', queuePrefix);

  return async () => {
    await database.drop();
    const queue = new Queue(SYSTEM_QUEUE, {
      connection: redisConnection(redisUrl),
      prefix: queuePrefix,
    });
    await queue.obliterate({ force: true });
    await queue.close();
  };
}
