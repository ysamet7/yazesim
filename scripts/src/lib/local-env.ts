/**
 * Local `.env` files for every app, derived from the Docker stack's generated
 * credentials. Derived ("managed") values are kept in sync on every bootstrap,
 * so resetting the stack never leaves an app with a stale password. Values are
 * written to disk only and never printed (golden rule 1).
 */
import { existsSync, readFileSync } from 'node:fs';
import { INFRA_ENV_EXAMPLE, INFRA_ENV_FILE } from './compose.ts';
import { ensureEnvFile, parseEnvText, randomSecret, type EnsureEnvResult } from './env-file.ts';
import { repoPath } from './paths.ts';

/** 127.0.0.1 rather than localhost: on Windows localhost may resolve to ::1 while Docker binds IPv4. */
const HOST = '127.0.0.1';

/** The web app's local address (apps/web dev server). */
export const LOCAL_WEB_ORIGIN = 'http://localhost:3200';

export type EnvValues = Readonly<Record<string, string>>;

export function ensureInfraEnv(): EnsureEnvResult {
  return ensureEnvFile({
    examplePath: repoPath(INFRA_ENV_EXAMPLE),
    targetPath: repoPath(INFRA_ENV_FILE),
    generate: {
      POSTGRES_PASSWORD: () => randomSecret(),
      REDIS_PASSWORD: () => randomSecret(),
    },
  });
}

/** Reads a generated env file (values are never printed); null when it does not exist. */
export function readEnvFile(relativePath: string): EnvValues | null {
  const file = repoPath(relativePath);
  if (!existsSync(file)) return null;
  const values: Record<string, string> = {};
  for (const line of parseEnvText(readFileSync(file, 'utf8'))) {
    if (line.kind === 'entry') values[line.key] = line.value;
  }
  return values;
}

export function readInfraEnv(): EnvValues | null {
  return readEnvFile(INFRA_ENV_FILE);
}

function required(infra: EnvValues, key: string): string {
  const value = infra[key];
  if (value === undefined || value === '') {
    throw new Error(
      `infra/docker/.env içinde ${key} boş; pnpm bootstrap komutunu yeniden çalıştırın.`,
    );
  }
  return value;
}

export function databaseUrl(infra: EnvValues): string {
  const user = encodeURIComponent(required(infra, 'POSTGRES_USER'));
  const password = encodeURIComponent(required(infra, 'POSTGRES_PASSWORD'));
  return `postgresql://${user}:${password}@${HOST}:${required(infra, 'POSTGRES_PORT')}/${required(infra, 'POSTGRES_DB')}`;
}

export function redisUrl(infra: EnvValues): string {
  return `redis://:${encodeURIComponent(required(infra, 'REDIS_PASSWORD'))}@${HOST}:${required(infra, 'REDIS_PORT')}`;
}

export function rpcUrl(infra: EnvValues): string {
  return `http://${HOST}:${required(infra, 'ANVIL_PORT')}`;
}

/** Values derived after the local chain deployment (bootstrap's `chain` step). */
export interface ChainValues {
  readonly norTokenAddress?: string;
}

export interface AppEnvFile {
  readonly app: string;
  readonly examplePath: string;
  readonly targetPath: string;
  readonly managed: (infra: EnvValues, chain: ChainValues) => Record<string, string>;
  /** Local secrets generated once when empty and kept afterwards (never printed). */
  readonly generate?: Readonly<Record<string, () => string>>;
}

function norToken(chain: ChainValues): Record<string, string> {
  return chain.norTokenAddress === undefined ? {} : { NOR_TOKEN_ADDRESS: chain.norTokenAddress };
}

/** Every app's local environment file and the values bootstrap manages in it. */
export const APP_ENV_FILES: readonly AppEnvFile[] = [
  {
    app: 'api',
    examplePath: 'apps/api/.env.example',
    targetPath: 'apps/api/.env',
    managed: (infra, chain) => ({
      CORS_ORIGINS: LOCAL_WEB_ORIGIN,
      DATABASE_URL: databaseUrl(infra),
      REDIS_URL: redisUrl(infra),
      RPC_URL: rpcUrl(infra),
      ...norToken(chain),
    }),
    generate: {
      // 32 random bytes: 43 base64url characters (apiEnvSchema). The key id
      // matches DATA_ENCRYPTION_ACTIVE_KEY_ID in apps/api/.env.example.
      DATA_ENCRYPTION_KEYS: () => `k1:${randomSecret(32)}`,
      HASH_PEPPER: () => randomSecret(32),
    },
  },
  {
    app: 'worker',
    examplePath: 'apps/worker/.env.example',
    targetPath: 'apps/worker/.env',
    managed: (infra, chain) => ({
      DATABASE_URL: databaseUrl(infra),
      REDIS_URL: redisUrl(infra),
      RPC_URL: rpcUrl(infra),
      ...norToken(chain),
    }),
  },
  {
    app: 'database',
    examplePath: 'packages/database/.env.example',
    targetPath: 'packages/database/.env',
    managed: (infra) => ({ DATABASE_URL: databaseUrl(infra) }),
  },
  {
    app: 'web',
    examplePath: 'apps/web/.env.example',
    targetPath: 'apps/web/.env.local',
    managed: () => ({ NEXT_PUBLIC_SITE_URL: LOCAL_WEB_ORIGIN }),
  },
];

export function ensureAppEnv(
  file: AppEnvFile,
  infra: EnvValues,
  chain: ChainValues = {},
): EnsureEnvResult {
  return ensureEnvFile({
    examplePath: repoPath(file.examplePath),
    targetPath: repoPath(file.targetPath),
    managed: file.managed(infra, chain),
    ...(file.generate ? { generate: file.generate } : {}),
  });
}
