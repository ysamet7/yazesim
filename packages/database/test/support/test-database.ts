/**
 * A throwaway PostgreSQL database for integration tests: created next to the
 * local (or CI) database named by `DATABASE_URL`, migrated with the real
 * migrations, and dropped afterwards. Tests never write into the development
 * database, whose append-only tables cannot be cleaned up by design.
 */
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient, prismaClientOptions } from '../../src/index.js';

const PACKAGE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export interface TestDatabase {
  readonly url: string;
  readonly prisma: PrismaClient;
  drop(): Promise<void>;
}

function baseUrl(): URL {
  const envFile = path.join(PACKAGE_DIR, '.env');
  if (process.env.DATABASE_URL === undefined && existsSync(envFile)) process.loadEnvFile(envFile);
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error('DATABASE_URL yok: önce `pnpm bootstrap` çalıştırın.');
  return new URL(value);
}

function withDatabase(url: URL, name: string): string {
  const copy = new URL(url.href);
  copy.pathname = `/${name}`;
  return copy.href;
}

/** The Prisma CLI entry point of this package (no shell, no npx). */
function prismaCli(): string {
  return path.join(PACKAGE_DIR, 'node_modules', 'prisma', 'build', 'index.js');
}

/** Creates and migrates a fresh database; call `drop()` in `afterAll`. */
export async function createTestDatabase(): Promise<TestDatabase> {
  const base = baseUrl();
  const name = `yazesim_test_${randomBytes(6).toString('hex')}`;
  const admin = new PrismaClient(prismaClientOptions(withDatabase(base, 'postgres')));
  await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  const url = withDatabase(base, name);
  const prisma = new PrismaClient(prismaClientOptions(url));
  const drop = async (): Promise<void> => {
    await prisma.$disconnect();
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin.$disconnect();
  };
  try {
    execFileSync(process.execPath, [prismaCli(), 'migrate', 'deploy'], {
      cwd: PACKAGE_DIR,
      env: { ...process.env, DATABASE_URL: url },
      stdio: 'pipe',
    });
  } catch (error) {
    await drop();
    throw error;
  }
  return { url, prisma, drop };
}
