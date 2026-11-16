import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  apiEnvSchema,
  CHAIN_FOR_APP_ENV,
  EnvValidationError,
  fieldKeyIds,
  findPublicSecretNames,
  parseEnv,
  webEnvSchema,
  workerEnvSchema,
  type EnvSource,
} from './env.js';

// Secrets are generated per run: no key-shaped literal ever sits in the repository.
const key = (): string => randomBytes(32).toString('base64url');
const PEPPER = key();
const KEYS = `k1:${key()},k2:${key()}`;

function localApi(overrides: EnvSource = {}): EnvSource {
  return {
    APP_ENV: 'local',
    CORS_ORIGINS: 'http://localhost:3200',
    DATABASE_URL: 'postgresql://yazesim:local@127.0.0.1:5433/yazesim',
    REDIS_URL: 'redis://:local@127.0.0.1:6380',
    DATA_ENCRYPTION_KEYS: KEYS,
    DATA_ENCRYPTION_ACTIVE_KEY_ID: 'k2',
    HASH_PEPPER: PEPPER,
    CHAIN_ID: '31337',
    RPC_URL: 'http://127.0.0.1:8546',
    ...overrides,
  };
}

function productionApi(overrides: EnvSource = {}): EnvSource {
  return localApi({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    CORS_ORIGINS: 'https://yazesim.example',
    CHAIN_ID: '43114',
    RPC_URL: 'https://rpc.example/ext/bc/C/rpc',
    ALLOW_MAINNET: 'true',
    ...overrides,
  });
}

function issuesOf(run: () => unknown): EnvValidationError {
  try {
    run();
  } catch (error) {
    if (error instanceof EnvValidationError) return error;
    throw error;
  }
  throw new Error('expected EnvValidationError');
}

describe('apiEnvSchema', () => {
  it('parses a local environment and fills in the defaults', () => {
    const env = parseEnv(apiEnvSchema, localApi());
    expect(env).toMatchObject({
      APP_ENV: 'local',
      NODE_ENV: 'development',
      LOG_LEVEL: 'info',
      PORT: 4200,
      TRUST_PROXY: false,
      QUEUE_PREFIX: 'yazesim',
      CHAIN_ID: 31337,
      ALLOW_MAINNET: false,
      CORS_ORIGINS: ['http://localhost:3200'],
    });
    expect(env.GEMINI_API_KEY).toBeUndefined();
  });

  it('treats an empty value as not set', () => {
    const env = parseEnv(apiEnvSchema, localApi({ GEMINI_API_KEY: '', PORT: '  ' }));
    expect(env.GEMINI_API_KEY).toBeUndefined();
    expect(env.PORT).toBe(4200);
  });

  it('lists every missing variable by name', () => {
    const error = issuesOf(() => parseEnv(apiEnvSchema, { APP_ENV: 'local' }));
    expect(error.variables).toEqual(
      expect.arrayContaining([
        'CORS_ORIGINS',
        'DATABASE_URL',
        'REDIS_URL',
        'DATA_ENCRYPTION_KEYS',
        'DATA_ENCRYPTION_ACTIVE_KEY_ID',
        'HASH_PEPPER',
        'CHAIN_ID',
        'RPC_URL',
      ]),
    );
    expect(error.message).toContain('Ortam değişkenleri geçersiz');
  });

  it('never repeats a value in its messages', () => {
    const leaked = 'k2:not-a-real-key-but-must-not-be-echoed';
    const weakPepper = 'short-pepper-value';
    const error = issuesOf(() =>
      parseEnv(
        apiEnvSchema,
        localApi({ DATA_ENCRYPTION_KEYS: leaked, HASH_PEPPER: weakPepper, DATABASE_URL: 'nope' }),
      ),
    );
    expect(error.variables).toEqual(['DATABASE_URL', 'DATA_ENCRYPTION_KEYS', 'HASH_PEPPER']);
    expect(error.message).not.toContain(leaked);
    expect(error.message).not.toContain(weakPepper);
  });

  it('accepts only the exact strings true and false as flags', () => {
    expect(parseEnv(apiEnvSchema, localApi({ TRUST_PROXY: 'true' })).TRUST_PROXY).toBe(true);
    for (const value of ['TRUE', '1', 'yes', ' true ']) {
      const error = issuesOf(() => parseEnv(apiEnvSchema, localApi({ TRUST_PROXY: value })));
      expect(error.variables).toEqual(['TRUST_PROXY']);
    }
  });

  it('reads integers only from decimal digits', () => {
    expect(issuesOf(() => parseEnv(apiEnvSchema, localApi({ PORT: '0x10' }))).variables).toEqual([
      'PORT',
    ]);
    expect(issuesOf(() => parseEnv(apiEnvSchema, localApi({ PORT: '70000' }))).variables).toEqual([
      'PORT',
    ]);
    expect(issuesOf(() => parseEnv(apiEnvSchema, localApi({ CHAIN_ID: '1' }))).variables).toEqual([
      'CHAIN_ID',
    ]);
  });

  it('requires the active encryption key to be one of the configured keys', () => {
    const error = issuesOf(() =>
      parseEnv(apiEnvSchema, localApi({ DATA_ENCRYPTION_ACTIVE_KEY_ID: 'k9' })),
    );
    expect(error.variables).toEqual(['DATA_ENCRYPTION_ACTIVE_KEY_ID']);
  });

  it('refuses a key id written twice', () => {
    const error = issuesOf(() =>
      parseEnv(apiEnvSchema, localApi({ DATA_ENCRYPTION_KEYS: `k1:${key()},k1:${key()}` })),
    );
    expect(error.variables).toContain('DATA_ENCRYPTION_KEYS');
  });

  it('normalizes addresses to their checksummed form', () => {
    const env = parseEnv(
      apiEnvSchema,
      localApi({
        NOR_TOKEN_ADDRESS: '0x5782b954d9dc46168458a7e02db49b01e5a1a669',
        ADMIN_ADDRESSES:
          '0x70997970c51812dc3a010c7d01b50e0d17dc79c8, 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      }),
    );
    expect(env.NOR_TOKEN_ADDRESS).toBe('0x5782B954d9Dc46168458a7e02DB49B01e5A1A669');
    expect(env.ADMIN_ADDRESSES).toEqual([
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    ]);
    const error = issuesOf(() => parseEnv(apiEnvSchema, localApi({ TREASURY_ADDRESS: '0x1234' })));
    expect(error.variables).toEqual(['TREASURY_ADDRESS']);
  });

  it('refuses an origin with a path', () => {
    const error = issuesOf(() =>
      parseEnv(apiEnvSchema, localApi({ CORS_ORIGINS: 'http://localhost:3200/app' })),
    );
    expect(error.variables).toEqual(['CORS_ORIGINS']);
  });

  describe('chain rules (golden rule 5)', () => {
    it('runs each environment on its own chain', () => {
      expect(CHAIN_FOR_APP_ENV).toEqual({ local: 31337, staging: 43113, production: 43114 });
      const error = issuesOf(() => parseEnv(apiEnvSchema, localApi({ CHAIN_ID: '43113' })));
      expect(error.variables).toEqual(['CHAIN_ID']);
    });

    it('opens mainnet only with ALLOW_MAINNET=true', () => {
      const error = issuesOf(() => parseEnv(apiEnvSchema, productionApi({ ALLOW_MAINNET: '' })));
      expect(error.variables).toEqual(['ALLOW_MAINNET']);
      expect(error.message).toContain('ALLOW_MAINNET=true');
      expect(parseEnv(apiEnvSchema, productionApi()).ALLOW_MAINNET).toBe(true);
    });

    it('never lets a local environment reach mainnet', () => {
      const error = issuesOf(() =>
        parseEnv(apiEnvSchema, localApi({ CHAIN_ID: '43114', ALLOW_MAINNET: 'true' })),
      );
      expect(error.variables).toEqual(['CHAIN_ID']);
    });

    it('requires https outside local development', () => {
      const error = issuesOf(() =>
        parseEnv(
          apiEnvSchema,
          productionApi({ RPC_URL: 'http://rpc.example', CORS_ORIGINS: 'http://yazesim.example' }),
        ),
      );
      expect(error.variables).toEqual(['CORS_ORIGINS', 'RPC_URL']);
    });
  });
});

describe('workerEnvSchema', () => {
  it('parses a local environment with its own defaults', () => {
    const env = parseEnv(workerEnvSchema, localApi());
    expect(env).toMatchObject({ PORT: 4210, QUEUE_PREFIX: 'yazesim', CHAIN_ID: 31337 });
  });

  it('applies the same chain rules', () => {
    const error = issuesOf(() =>
      parseEnv(workerEnvSchema, { ...localApi(), APP_ENV: 'staging', CHAIN_ID: '43114' }),
    );
    expect(error.variables).toEqual(['CHAIN_ID', 'ALLOW_MAINNET', 'RPC_URL']);
  });
});

describe('webEnvSchema', () => {
  const local = {
    NEXT_PUBLIC_APP_ENV: 'local',
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3200',
    NEXT_PUBLIC_API_URL: 'http://localhost:4200',
  };

  it('parses the public configuration', () => {
    expect(parseEnv(webEnvSchema, local)).toEqual(local);
  });

  it('requires https outside local development', () => {
    const error = issuesOf(() =>
      parseEnv(webEnvSchema, { ...local, NEXT_PUBLIC_APP_ENV: 'staging' }),
    );
    expect(error.variables).toEqual(['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_API_URL']);
  });
});

describe('findPublicSecretNames (golden rule 2)', () => {
  it('flags public variables named like secrets', () => {
    expect(
      findPublicSecretNames({
        NEXT_PUBLIC_GEMINI_API_KEY: 'x',
        NEXT_PUBLIC_session_secret: 'x',
        NEXT_PUBLIC_SITE_URL: 'x',
        GEMINI_API_KEY: 'x',
      }),
    ).toEqual(['NEXT_PUBLIC_GEMINI_API_KEY', 'NEXT_PUBLIC_session_secret']);
  });

  it.each([
    'NEXT_PUBLIC_DATABASE_URL',
    'NEXT_PUBLIC_REDIS_URL',
    'NEXT_PUBLIC_SENTRY_DSN',
    'NEXT_PUBLIC_AUTH_CLIENT_SECRET',
    'NEXT_PUBLIC_GOOGLE_CREDENTIALS',
    'NEXT_PUBLIC_WALLET_SEED',
    'NEXT_PUBLIC_JWT',
    'NEXT_PUBLIC_ADMIN_PASSPHRASE',
    'NEXT_PUBLIC_SESSION_ID',
  ])('flags %s', (name) => {
    expect(findPublicSecretNames({ [name]: 'x' })).toEqual([name]);
  });

  it('is empty for an ordinary public configuration', () => {
    expect(
      findPublicSecretNames({
        NEXT_PUBLIC_API_URL: 'x',
        NEXT_PUBLIC_SITE_URL: 'x',
        NEXT_PUBLIC_APP_ENV: 'x',
        PATH: '/bin',
      }),
    ).toEqual([]);
  });
});

describe('EnvValidationError', () => {
  it('reports each variable once and nested issues against the variable', () => {
    const error = issuesOf(() =>
      parseEnv(
        apiEnvSchema,
        localApi({ CORS_ORIGINS: 'http://a.example/x, http://b.example/y', ADMIN_ADDRESSES: ',' }),
      ),
    );
    expect(error.variables).toEqual(['CORS_ORIGINS', 'ADMIN_ADDRESSES']);
    expect(error.issues.length).toBeGreaterThan(error.variables.length);
  });

  it('names an issue without a variable as general', () => {
    const schema = z.object({}).refine(() => false, { message: 'genel kural' });
    const error = issuesOf(() => parseEnv(schema, {}));
    expect(error.variables).toEqual(['(genel)']);
  });
});

describe('fieldKeyIds', () => {
  it('lists the ids of a key ring', () => {
    expect(fieldKeyIds(KEYS)).toEqual(['k1', 'k2']);
  });
});
