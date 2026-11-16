import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { apiEnvSchema, webEnvSchema, workerEnvSchema } from '@yazesim/shared/env';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ensureEnvFile, parseEnvText } from './env-file.ts';
import { APP_ENV_FILES, databaseUrl, redisUrl, rpcUrl, type AppEnvFile } from './local-env.ts';
import { repoPath } from './paths.ts';

// Shape of a generated infra/docker/.env; the password holds characters a URL must escape.
const INFRA = {
  POSTGRES_USER: 'yazesim',
  POSTGRES_PASSWORD: 'p@ss/w:rd',
  POSTGRES_DB: 'yazesim',
  POSTGRES_APP_USER: 'yazesim_app',
  POSTGRES_APP_PASSWORD: 'app&pw',
  POSTGRES_PORT: '5433',
  REDIS_PASSWORD: 'r#dis',
  REDIS_PORT: '6380',
  ANVIL_PORT: '8546',
};

function exampleKeys(relativePath: string): string[] {
  return parseEnvText(readFileSync(repoPath(relativePath), 'utf8')).flatMap((line) =>
    line.kind === 'entry' ? [line.key] : [],
  );
}

function appFile(app: string): AppEnvFile {
  const file = APP_ENV_FILES.find((candidate) => candidate.app === app);
  if (!file) throw new Error(`no env file for ${app}`);
  return file;
}

describe('connection URLs', () => {
  it('escape credentials and use the IPv4 loopback address', () => {
    expect(databaseUrl(INFRA, 'owner')).toBe(
      'postgresql://yazesim:p%40ss%2Fw%3Ard@127.0.0.1:5433/yazesim',
    );
    expect(databaseUrl(INFRA, 'app')).toBe(
      'postgresql://yazesim_app:app%26pw@127.0.0.1:5433/yazesim',
    );
    expect(redisUrl(INFRA)).toBe('redis://:r%23dis@127.0.0.1:6380');
    expect(rpcUrl(INFRA)).toBe('http://127.0.0.1:8546');
  });

  it('refuse an incomplete infra file', () => {
    expect(() => databaseUrl({ ...INFRA, POSTGRES_PASSWORD: '' }, 'owner')).toThrow(
      /POSTGRES_PASSWORD/u,
    );
    expect(() => databaseUrl({ ...INFRA, POSTGRES_APP_PASSWORD: '' }, 'app')).toThrow(
      /POSTGRES_APP_PASSWORD/u,
    );
  });

  it('give the API and the worker the restricted role and migrations the owner', () => {
    const user = (app: string): string =>
      new URL(appFile(app).managed(INFRA, {}).DATABASE_URL ?? '').username;
    expect([user('api'), user('worker'), user('database')]).toEqual([
      'yazesim_app',
      'yazesim_app',
      'yazesim',
    ]);
  });
});

/**
 * Every variable a schema reads is documented in the matching `.env.example`,
 * and nothing undocumented sits there: a new setting cannot reach production
 * without its Turkish description.
 */
describe('.env.example files match the env schemas', () => {
  it.each([
    ['apps/api/.env.example', apiEnvSchema],
    ['apps/worker/.env.example', workerEnvSchema],
    ['apps/web/.env.example', webEnvSchema],
  ] as const)('%s', (example, schema) => {
    expect(exampleKeys(example).sort()).toEqual(Object.keys(schema.shape).sort());
  });

  it('the database example holds only the connection URL', () => {
    expect(exampleKeys('packages/database/.env.example')).toEqual(['DATABASE_URL']);
  });

  it('no example carries a value for a secret', () => {
    const secrets = /PASSWORD|KEY|PEPPER|SECRET|DATABASE_URL|REDIS_URL/u;
    for (const example of [
      'infra/docker/.env.example',
      ...APP_ENV_FILES.map((file) => file.examplePath),
    ]) {
      for (const line of parseEnvText(readFileSync(repoPath(example), 'utf8'))) {
        if (line.kind !== 'entry' || !secrets.test(line.key)) continue;
        // The active key id names a key; it is not a key itself.
        if (line.key === 'DATA_ENCRYPTION_ACTIVE_KEY_ID') continue;
        expect({ example, key: line.key, value: line.value }).toEqual({
          example,
          key: line.key,
          value: '',
        });
      }
    }
  });
});

describe('generated app env files pass their schemas', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'yazesim-local-env-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function generate(app: string): Record<string, string> {
    const file = appFile(app);
    const result = ensureEnvFile({
      examplePath: repoPath(file.examplePath),
      targetPath: path.join(dir, `${app}.env`),
      managed: file.managed(INFRA, {}),
      ...(file.generate ? { generate: file.generate } : {}),
    });
    // Empty means unset, as in parseEnv.
    return Object.fromEntries(Object.entries(result.values).filter(([, value]) => value !== ''));
  }

  it('api', () => {
    const env = apiEnvSchema.parse(generate('api'));
    expect(env.APP_ENV).toBe('local');
    expect(env.CHAIN_ID).toBe(31_337);
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:3200']);
  });

  it('worker', () => {
    expect(workerEnvSchema.parse(generate('worker')).PORT).toBe(4210);
  });

  it('web', () => {
    expect(webEnvSchema.parse(generate('web')).NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3200');
  });

  it('generates fresh secrets per file and keeps them on the next run', () => {
    const first = generate('api');
    const again = generate('api');
    expect(again.HASH_PEPPER).toBe(first.HASH_PEPPER);
    expect(again.DATA_ENCRYPTION_KEYS).toBe(first.DATA_ENCRYPTION_KEYS);
    rmSync(path.join(dir, 'api.env'));
    expect(generate('api').HASH_PEPPER).not.toBe(first.HASH_PEPPER);
  });

  it('fills in the local NoR token once the chain step deployed it', () => {
    const file = appFile('worker');
    const address = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
    expect(file.managed(INFRA, { norTokenAddress: address }).NOR_TOKEN_ADDRESS).toBe(address);
    expect(file.managed(INFRA, {})).not.toHaveProperty('NOR_TOKEN_ADDRESS');
  });
});
