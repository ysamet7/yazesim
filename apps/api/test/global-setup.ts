/**
 * The end-to-end tests run on a throwaway database: created next to the local
 * (or CI) database named by DATABASE_URL, migrated with the real migrations,
 * and dropped at the end. The development database, whose audit log cannot be
 * cleaned up by design, never sees test data; every run starts from the same
 * state.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createThrowawayDatabase } from '@yazesim/test-support';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

const API_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const envFile = path.join(API_DIR, '.env');
  if (process.env.DATABASE_URL === undefined && existsSync(envFile)) process.loadEnvFile(envFile);
  const base = process.env.DATABASE_URL;
  if (base === undefined || base === '') {
    throw new Error('DATABASE_URL yok: önce `pnpm bootstrap` çalıştırın.');
  }
  const database = await createThrowawayDatabase(base);
  project.provide('databaseUrl', database.url);
  return () => database.drop();
}
