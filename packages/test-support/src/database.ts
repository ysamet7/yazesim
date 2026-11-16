/**
 * A throwaway database next to the one `base` names: created, migrated with
 * the real migrations, and dropped by `drop()`. End-to-end suites run on one,
 * so the development database never sees test data and every run starts from
 * the same state.
 */
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient, prismaClientOptions } from '@yazesim/database';

// From src/ or dist/ of this package.
const DATABASE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../database');

function withDatabase(url: URL, name: string): string {
  const copy = new URL(url.href);
  copy.pathname = `/${name}`;
  return copy.href;
}

export interface ThrowawayDatabase {
  readonly url: string;
  drop(): Promise<void>;
}

export async function createThrowawayDatabase(base: string): Promise<ThrowawayDatabase> {
  const name = `yazesim_e2e_${randomBytes(6).toString('hex')}`;
  const admin = new PrismaClient(prismaClientOptions(withDatabase(new URL(base), 'postgres')));
  await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  const url = withDatabase(new URL(base), name);
  const drop = async (): Promise<void> => {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin.$disconnect();
  };
  try {
    execFileSync(
      process.execPath,
      [path.join(DATABASE_DIR, 'node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'deploy'],
      { cwd: DATABASE_DIR, env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' },
    );
  } catch (error) {
    await drop();
    throw error;
  }
  return { url, drop };
}
