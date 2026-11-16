/**
 * Environment validation. Every service parses its environment with one of
 * these schemas at startup and refuses to start on a missing or invalid
 * value. Messages name the variable and the problem, never the value, so a
 * secret cannot leak into a log or a terminal (CLAUDE.md golden rule 1).
 *
 * Variables that later phases use are already listed (optional) so that
 * every `.env.example` documents the whole configuration from the start.
 */
import { getAddress, isAddress, type Address } from 'viem';
import { z } from 'zod';
import {
  CHAIN_IDS,
  isSupportedChainId,
  MAINNET_CHAIN_ID,
  type SupportedChainId,
} from './chains.js';

export const APP_ENVS = ['local', 'staging', 'production'] as const;
export type AppEnv = (typeof APP_ENVS)[number];

/** Each deployment environment runs on exactly one chain. */
export const CHAIN_FOR_APP_ENV: Readonly<Record<AppEnv, SupportedChainId>> = {
  local: CHAIN_IDS.local,
  staging: CHAIN_IDS.fuji,
  production: CHAIN_IDS.avalanche,
};

// ── Primitive schemas ────────────────────────────────────────────────────

const appEnv = z.enum(APP_ENVS);
const nodeEnv = z.enum(['development', 'test', 'production']).default('development');
const logLevel = z
  .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
  .default('info');

/**
 * Only the exact, lowercase strings "true" and "false". "1", "yes", "TRUE" or
 * " true" are rejected rather than guessed (zod's default is case-insensitive).
 */
const strictBoolean = z.stringbool({ truthy: ['true'], falsy: ['false'], case: 'sensitive' });

/** Decimal digits only: "0x7a69", "1e3" or "80.0" are rejected instead of coerced. */
const decimalInteger = z
  .string()
  .trim()
  .regex(/^[0-9]{1,10}$/u, { message: 'Yalnızca rakamlardan oluşan bir tam sayı girin' })
  .transform(Number);

const port = decimalInteger.pipe(z.number().int().min(1).max(65_535));

const chainId = decimalInteger.pipe(
  z.number().refine(isSupportedChainId, {
    message: `Desteklenmeyen zincir. Geçerli değerler: ${Object.values(CHAIN_IDS).join(', ')}`,
  }),
);

const httpUrl = z.url({ protocol: /^https?$/u });
const postgresUrl = z.url({ protocol: /^postgres(ql)?$/u });
const redisUrl = z.url({ protocol: /^rediss?$/u });

const isBareOrigin = (value: string): boolean =>
  URL.canParse(value) && new URL(value).origin === value;

/** scheme://host[:port], no path or trailing slash. */
const bareOrigin = httpUrl.refine(isBareOrigin, {
  message: 'Yalnızca köken (scheme://host[:port]) olmalı, yol içeremez',
});

/** Comma-separated list of origins (scheme://host[:port], no path). */
const originList = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim().replace(/\/$/u, ''))
      .filter((item) => item !== ''),
  )
  .pipe(z.array(bareOrigin).min(1));

/** Prefix of the queue keys in Redis, shared by the API (producer) and the worker. */
const queuePrefix = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9_-]{0,40}$/u, {
    message: 'Küçük harf, rakam, _ ve - (en çok 41 karakter)',
  })
  .default('yazesim');

/**
 * A random secret of at least `minBytes` bytes as unpadded base64url (what
 * `pnpm bootstrap` generates). The message never repeats the value.
 */
const base64UrlSecret = (minBytes: number) =>
  z
    .string()
    .trim()
    .refine(
      (value) => /^[A-Za-z0-9_-]+$/u.test(value) && Math.floor((value.length * 6) / 8) >= minBytes,
      {
        message: `En az ${String(minBytes)} baytlık, dolgusuz base64url bir gizli değer olmalı`,
      },
    );

/** An EVM address in any letter case, normalized to its checksummed form. */
const evmAddress = z
  .string()
  .trim()
  .refine((value) => isAddress(value, { strict: false }), {
    message: '0x ile başlayan 40 onaltılık haneli bir adres olmalı',
  })
  .transform((value): Address => getAddress(value));

/** Comma-separated EVM addresses (1–20), e.g. the administrators. */
const addressList = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item !== ''),
  )
  .pipe(z.array(evmAddress).min(1).max(20));

/** Identifier of an encryption key (`FieldCipher` envelope). */
const keyId = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9-]{0,15}$/u, {
    message: 'Küçük harf, rakam ve tire (en çok 16 karakter)',
  });

/** One `id:key` entry: a key id and 32 random bytes as base64url (43 characters, optional `=`). */
const FIELD_KEY_ENTRY = /^[a-z0-9][a-z0-9-]{0,15}:[A-Za-z0-9_-]{43}=?$/u;

const fieldKeyEntries = (value: string): string[] =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');

/** The key ids of a valid `DATA_ENCRYPTION_KEYS` value. */
export function fieldKeyIds(spec: string): string[] {
  return fieldKeyEntries(spec).map((entry) => entry.slice(0, entry.indexOf(':')));
}

/**
 * The application-layer encryption keys (golden rule 7): comma-separated
 * `id:key` entries. Kept as written for the cipher (`parseFieldKeys` in
 * @yazesim/server) and never echoed.
 */
const fieldKeys = z
  .string()
  .refine(
    (value) => {
      const entries = fieldKeyEntries(value);
      return entries.length > 0 && entries.every((entry) => FIELD_KEY_ENTRY.test(entry));
    },
    { message: 'Her girdi <kimlik>:<32 baytlık base64url anahtar> olmalı' },
  )
  .refine((value) => new Set(fieldKeyIds(value)).size === fieldKeyIds(value).length, {
    message: 'Aynı anahtar kimliği iki kez yazılmış',
  });

// ── Shared rules ─────────────────────────────────────────────────────────

interface ChainSettings {
  readonly APP_ENV: AppEnv;
  readonly CHAIN_ID: number;
  readonly ALLOW_MAINNET: boolean;
  readonly RPC_URL: string;
}

/**
 * Golden rule 5: each environment runs on its own chain, and Avalanche
 * mainnet (where NoR is live) opens only with `ALLOW_MAINNET=true`.
 */
function checkChain(env: ChainSettings, ctx: z.RefinementCtx): void {
  const expected = CHAIN_FOR_APP_ENV[env.APP_ENV];
  if (env.CHAIN_ID !== expected) {
    ctx.addIssue({
      code: 'custom',
      path: ['CHAIN_ID'],
      message: `${env.APP_ENV} ortamı ${String(expected)} zincirinde çalışır`,
    });
  }
  if (env.CHAIN_ID === MAINNET_CHAIN_ID && !env.ALLOW_MAINNET) {
    ctx.addIssue({
      code: 'custom',
      path: ['ALLOW_MAINNET'],
      message: 'Ana ağ (43114) yalnız ALLOW_MAINNET=true ile açılır (CLAUDE.md altın kural 5)',
    });
  }
  if (env.APP_ENV !== 'local' && !env.RPC_URL.startsWith('https://')) {
    ctx.addIssue({
      code: 'custom',
      path: ['RPC_URL'],
      message: 'Yerel ortam dışında https:// ile başlamalı',
    });
  }
}

function requireHttps(
  appEnvValue: AppEnv,
  values: readonly string[],
  variable: string,
  ctx: z.RefinementCtx,
): void {
  if (appEnvValue !== 'local' && values.some((value) => !value.startsWith('https://'))) {
    ctx.addIssue({
      code: 'custom',
      path: [variable],
      message: 'Yerel ortam dışında https:// ile başlamalı',
    });
  }
}

const serverBase = {
  APP_ENV: appEnv,
  NODE_ENV: nodeEnv,
  LOG_LEVEL: logLevel,
};

const chainFields = {
  CHAIN_ID: chainId,
  /** JSON-RPC endpoint of CHAIN_ID; a provider URL may embed a key, so it is never logged. */
  RPC_URL: httpUrl,
  ALLOW_MAINNET: strictBoolean.default(false),
  /** The NoR token on CHAIN_ID (mainnet: 0x5782…a669; locally the test token). Phase 5. */
  NOR_TOKEN_ADDRESS: evmAddress.optional(),
  /** Treasury that receives top-ups (ADR-007); the server only watches it. Phase 5. */
  TREASURY_ADDRESS: evmAddress.optional(),
};

// ── API ──────────────────────────────────────────────────────────────────

export const apiEnvSchema = z
  .object({
    ...serverBase,
    PORT: port.default(4200),
    /** Web origins allowed to call the API with credentials. */
    CORS_ORIGINS: originList,
    /** Behind exactly one reverse proxy (staging, production): trust its client IP header. */
    TRUST_PROXY: strictBoolean.default(false),
    DATABASE_URL: postgresUrl,
    REDIS_URL: redisUrl,
    QUEUE_PREFIX: queuePrefix,
    /** Encryption keys of chat content and other personal data (golden rule 7). */
    DATA_ENCRYPTION_KEYS: fieldKeys,
    DATA_ENCRYPTION_ACTIVE_KEY_ID: keyId,
    /** Pepper of keyed hashes (e-mail, IP); changing it orphans every stored hash. */
    HASH_PEPPER: base64UrlSecret(32),
    ...chainFields,
    /** Wallets allowed into /yonetim (phase 2, with a second factor). */
    ADMIN_ADDRESSES: addressList.optional(),
    /** Server-only AI provider key (golden rule 2). Required from phase 4. */
    GEMINI_API_KEY: z.string().trim().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    if (!fieldKeyIds(env.DATA_ENCRYPTION_KEYS).includes(env.DATA_ENCRYPTION_ACTIVE_KEY_ID)) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATA_ENCRYPTION_ACTIVE_KEY_ID'],
        message: "DATA_ENCRYPTION_KEYS'teki kimliklerden biri olmalı",
      });
    }
    requireHttps(env.APP_ENV, env.CORS_ORIGINS, 'CORS_ORIGINS', ctx);
    checkChain(env, ctx);
  });

export type ApiEnv = z.output<typeof apiEnvSchema>;

// ── Worker ───────────────────────────────────────────────────────────────

export const workerEnvSchema = z
  .object({
    ...serverBase,
    /** Port of the worker's own health endpoint (/saglik). */
    PORT: port.default(4210),
    DATABASE_URL: postgresUrl,
    REDIS_URL: redisUrl,
    QUEUE_PREFIX: queuePrefix,
    ...chainFields,
  })
  .superRefine((env, ctx) => {
    checkChain(env, ctx);
  });

export type WorkerEnv = z.output<typeof workerEnvSchema>;

// ── Web ──────────────────────────────────────────────────────────────────

/**
 * Public configuration of the web app. Everything here ends up in the
 * browser bundle, so it never holds a secret (golden rule 2).
 */
export const webEnvSchema = z
  .object({
    NEXT_PUBLIC_APP_ENV: appEnv,
    /** Address the site is served from, for absolute links and metadata. */
    NEXT_PUBLIC_SITE_URL: bareOrigin,
    /** The API's origin; the only other place pages may connect to. */
    NEXT_PUBLIC_API_URL: bareOrigin,
  })
  .superRefine((env, ctx) => {
    requireHttps(env.NEXT_PUBLIC_APP_ENV, [env.NEXT_PUBLIC_SITE_URL], 'NEXT_PUBLIC_SITE_URL', ctx);
    requireHttps(env.NEXT_PUBLIC_APP_ENV, [env.NEXT_PUBLIC_API_URL], 'NEXT_PUBLIC_API_URL', ctx);
  });

export type WebEnv = z.output<typeof webEnvSchema>;

/**
 * Name fragments that mark a secret: keys, passwords and passphrases, tokens,
 * credentials, seeds, session or auth material, and connection strings to the
 * database or Redis. Public origins (`*_SITE_URL`, `*_API_URL`) stay allowed.
 */
const SECRET_NAME =
  /KEY|SECRET|TOKEN|PASS|MNEMONIC|PEPPER|PRIVATE|CREDENTIAL|SEED|JWT|AUTH|SESSION|COOKIE|DSN|DATABASE|REDIS|POSTGRES/u;

/**
 * Public (`NEXT_PUBLIC_*`) variables whose name looks like a secret. Next.js
 * inlines every public variable into the browser bundle, which anyone can
 * download and read; the web build refuses to run while this list is not
 * empty (golden rule 2: the AI provider key stays on the server).
 */
export function findPublicSecretNames(source: EnvSource): string[] {
  return Object.keys(source)
    .filter((name) => name.startsWith('NEXT_PUBLIC_') && SECRET_NAME.test(name.toUpperCase()))
    .sort();
}

// ── Parsing ──────────────────────────────────────────────────────────────

export interface EnvIssue {
  readonly variable: string;
  readonly message: string;
}

export class EnvValidationError extends Error {
  readonly issues: readonly EnvIssue[];

  constructor(issues: readonly EnvIssue[]) {
    const lines = issues.map((issue) => `  • ${issue.variable}: ${issue.message}`);
    super(`Ortam değişkenleri geçersiz (${String(issues.length)}):\n${lines.join('\n')}`);
    this.name = 'EnvValidationError';
    this.issues = issues;
  }

  /** Names of the invalid variables, in schema order. */
  get variables(): string[] {
    return [...new Set(this.issues.map((issue) => issue.variable))];
  }
}

export type EnvSource = Readonly<Record<string, string | undefined>>;

/**
 * Validates an environment source (usually `process.env`) against a schema.
 *
 * @throws {EnvValidationError} listing every invalid variable without its value.
 */
export function parseEnv<Schema extends z.ZodType>(
  schema: Schema,
  source: EnvSource,
): z.output<Schema> {
  // An empty or blank value (`GEMINI_API_KEY=` in a .env file) means "not set":
  // optional variables fall back to their default, required ones are reported missing.
  const present = Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined && value.trim() !== ''),
  );
  const result = schema.safeParse(present, { error: z.locales.tr().localeError });
  if (result.success) return result.data;
  throw new EnvValidationError(
    result.error.issues.map((issue) => ({
      // The variable is the top-level key; nested paths (one entry of a
      // comma-separated list) are reported against the variable itself.
      variable: issue.path[0] === undefined ? '(genel)' : String(issue.path[0]),
      message: issue.message,
    })),
  );
}
