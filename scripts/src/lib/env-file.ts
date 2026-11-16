/**
 * Generates and maintains local `.env` files from their committed `.env.example`
 * templates (golden rule 1). Values are only ever written to disk; callers
 * must never print them.
 */
import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export type EnvLine =
  | { readonly kind: 'entry'; readonly key: string; readonly value: string }
  | { readonly kind: 'other'; readonly raw: string };

const ENTRY = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u;

function unquote(raw: string): string {
  if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
    return raw
      .slice(1, -1)
      .replace(/\\(["\\n])/gu, (_match, char: string) => (char === 'n' ? '\n' : char));
  }
  if (raw.length >= 2 && raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1);
  }
  return raw;
}

export function parseEnvText(text: string): EnvLine[] {
  return text
    .replace(/\r\n/gu, '\n')
    .replace(/\n$/u, '')
    .split('\n')
    .map((raw): EnvLine => {
      const match = ENTRY.exec(raw);
      const key = match?.[1];
      if (key === undefined) return { kind: 'other', raw };
      return { kind: 'entry', key, value: unquote((match?.[2] ?? '').trim()) };
    });
}

/** Quotes a value only when needed so the file stays readable. */
export function serializeEnvValue(value: string): string {
  if (/^[A-Za-z0-9_@%+=:,./-]*$/u.test(value)) return value;
  return `"${value.replace(/\\/gu, '\\\\').replace(/"/gu, '\\"').replace(/\n/gu, '\\n')}"`;
}

/** Random URL-safe secret with `bytes` bytes of entropy (default 24 → 32 characters). */
export function randomSecret(bytes = 24): string {
  return randomBytes(bytes).toString('base64url');
}

export interface EnsureEnvOptions {
  readonly examplePath: string;
  readonly targetPath: string;
  /** Values derived from other files; always kept in sync (e.g. DATABASE_URL). */
  readonly managed?: Readonly<Record<string, string>>;
  /** Generators for values left empty in the example (e.g. random secrets). */
  readonly generate?: Readonly<Record<string, () => string>>;
}

export interface EnsureEnvResult {
  readonly created: boolean;
  /** Keys that did not have a value before this run. */
  readonly added: readonly string[];
  /** Managed keys whose value changed. */
  readonly updated: readonly string[];
  /** Final values, for deriving other files. Never print these. */
  readonly values: Readonly<Record<string, string>>;
}

const LOCAL_ADDITIONS_HEADER = "# ── Yerel eklemeler (.env.example'da olmayan anahtarlar) ──";

function entriesOf(lines: readonly EnvLine[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of lines) if (line.kind === 'entry') map.set(line.key, line.value);
  return map;
}

/**
 * Creates `targetPath` from `examplePath` or brings an existing file up to date.
 * Existing non-empty values are never overwritten, except managed values.
 */
export function ensureEnvFile(options: EnsureEnvOptions): EnsureEnvResult {
  if (!existsSync(options.examplePath)) {
    throw new Error(
      `Şablon bulunamadı: ${path.basename(options.examplePath)} (${options.examplePath})`,
    );
  }
  const exampleLines = parseEnvText(readFileSync(options.examplePath, 'utf8'));
  const created = !existsSync(options.targetPath);
  const existingText = created ? '' : readFileSync(options.targetPath, 'utf8');
  const existing = entriesOf(parseEnvText(existingText));
  const managed = options.managed ?? {};
  const generate = options.generate ?? {};

  const values: Record<string, string> = {};
  const added: string[] = [];
  const updated: string[] = [];
  const output: string[] = [];

  for (const line of exampleLines) {
    if (line.kind === 'other') {
      output.push(line.raw);
      continue;
    }
    const current = existing.get(line.key);
    let value: string;
    if (Object.hasOwn(managed, line.key)) {
      value = managed[line.key] ?? '';
      if (current !== undefined && current !== '' && current !== value) updated.push(line.key);
    } else if (current !== undefined && current !== '') {
      value = current;
    } else {
      value = line.value !== '' ? line.value : (generate[line.key]?.() ?? '');
    }
    if ((current === undefined || current === '') && value !== '') added.push(line.key);
    values[line.key] = value;
    output.push(`${line.key}=${serializeEnvValue(value)}`);
  }

  const localAdditions = [...existing].filter(([key]) => !Object.hasOwn(values, key));
  if (localAdditions.length > 0) {
    output.push('', LOCAL_ADDITIONS_HEADER);
    for (const [key, value] of localAdditions) {
      values[key] = value;
      output.push(`${key}=${serializeEnvValue(value)}`);
    }
  }

  const text = `${output.join('\n')}\n`;
  if (text !== existingText) {
    writeFileSync(options.targetPath, text, { encoding: 'utf8', mode: 0o600 });
  }
  // `mode` only applies when a file is created; this also tightens a file that
  // was created earlier with wider permissions.
  chmodSync(options.targetPath, 0o600);
  return { created, added, updated, values };
}
