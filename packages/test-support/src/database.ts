/**
 * A throwaway database next to the one `appBase` names: created and migrated
 * by the owner role with the real migrations, used by the suite through the
 * application's restricted role, and dropped by `drop()`. End-to-end suites
 * run on one, so the development database never sees test data, every run
 * starts from the same state, and the apps are tested with the privileges
 * they have in production.
 */
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { PrismaClient, prismaClientOptions } from '@yazesim/database';

// From src/ or dist/ of this package.
const DATABASE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../database');

function withDatabase(url: URL, name: string): string {
  const copy = new URL(url.href);
  copy.pathname = `/${name}`;
  return copy.href;
}

/**
 * The owner's connection (CREATE DATABASE, migrations): DATABASE_OWNER_URL,
 * else packages/database/.env, which `pnpm bootstrap` writes.
 */
function ownerBase(): URL {
  const envFile = path.join(DATABASE_DIR, '.env');
  const value =
    process.env.DATABASE_OWNER_URL ??
    (existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')).DATABASE_URL : undefined);
  if (value === undefined || value === '') {
    throw new Error(
      'packages/database/.env içinde DATABASE_URL yok: önce `pnpm bootstrap` çalıştırın.',
    );
  }
  return new URL(value);
}

export interface ThrowawayDatabase {
  /** The application role's connection to the new database. */
  readonly url: string;
  drop(): Promise<void>;
}

export async function createThrowawayDatabase(appBase: string): Promise<ThrowawayDatabase> {
  const name = `yazesim_e2e_${randomBytes(6).toString('hex')}`;
  const owner = ownerBase();
  const admin = new PrismaClient(prismaClientOptions(withDatabase(owner, 'postgres')));
  await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  const ownerUrl = withDatabase(owner, name);
  const url = withDatabase(new URL(appBase), name);
  const drop = async (): Promise<void> => {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin.$disconnect();
  };
  try {
    execFileSync(
      process.execPath,
      [path.join(DATABASE_DIR, 'node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'deploy'],
      { cwd: DATABASE_DIR, env: { ...process.env, DATABASE_URL: ownerUrl }, stdio: 'pipe' },
    );
  } catch (error) {
    await drop();
    throw error;
  }
  return { url, drop };
}
