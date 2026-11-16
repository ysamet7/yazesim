import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ensureEnvFile, parseEnvText, randomSecret, serializeEnvValue } from './env-file.ts';

let dir: string;
let example: string;
let target: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'yazesim-env-'));
  example = path.join(dir, '.env.example');
  target = path.join(dir, '.env');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('parseEnvText', () => {
  it('reads entries, comments and blank lines', () => {
    const lines = parseEnvText('# comment\n\nA=1\nB=\nC="x y"\nD=\'single\'\n');
    expect(lines.filter((line) => line.kind === 'entry')).toEqual([
      { kind: 'entry', key: 'A', value: '1' },
      { kind: 'entry', key: 'B', value: '' },
      { kind: 'entry', key: 'C', value: 'x y' },
      { kind: 'entry', key: 'D', value: 'single' },
    ]);
    expect(lines[0]).toEqual({ kind: 'other', raw: '# comment' });
  });

  it('unescapes double-quoted values', () => {
    const [line] = parseEnvText('A="a\\"b\\\\c\\nd"');
    expect(line).toEqual({ kind: 'entry', key: 'A', value: 'a"b\\c\nd' });
  });

  it('accepts CRLF input', () => {
    expect(parseEnvText('A=1\r\nB=2\r\n').filter((l) => l.kind === 'entry')).toHaveLength(2);
  });
});

describe('serializeEnvValue', () => {
  it.each([
    ['plain', 'plain'],
    ['', ''],
    ['postgresql://u:p@127.0.0.1:5432/db', 'postgresql://u:p@127.0.0.1:5432/db'],
    ['with space', '"with space"'],
    ['has#hash', '"has#hash"'],
    ['quote"inside', '"quote\\"inside"'],
    ['line\nbreak', '"line\\nbreak"'],
  ])('serializes %j as %s', (value, expected) => {
    expect(serializeEnvValue(value)).toBe(expected);
  });

  it('round-trips through the parser', () => {
    for (const value of ['a b', 'x"y', 'p\\q', 'm\nn', '#start', "it's"]) {
      const [line] = parseEnvText(`K=${serializeEnvValue(value)}`);
      expect(line).toEqual({ kind: 'entry', key: 'K', value });
    }
  });
});

describe('randomSecret', () => {
  it('produces URL-safe, unique secrets of the requested strength', () => {
    const a = randomSecret();
    const b = randomSecret();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/u);
    expect(randomSecret(48)).toHaveLength(64);
  });
});

describe('ensureEnvFile', () => {
  it('creates the file from the example, generating empty secrets', () => {
    writeFileSync(example, '# DB\nUSER=yazesim\nPASSWORD=\nPORT=5432\n');
    const result = ensureEnvFile({
      examplePath: example,
      targetPath: target,
      generate: { PASSWORD: () => 'generated' },
    });
    expect(result.created).toBe(true);
    expect(result.added).toEqual(['USER', 'PASSWORD', 'PORT']);
    expect(readFileSync(target, 'utf8')).toBe(
      '# DB\nUSER=yazesim\nPASSWORD=generated\nPORT=5432\n',
    );
    expect(result.values).toEqual({ USER: 'yazesim', PASSWORD: 'generated', PORT: '5432' });
  });

  it('never overwrites an existing non-empty value', () => {
    writeFileSync(example, 'PASSWORD=\nPORT=5432\n');
    writeFileSync(target, 'PASSWORD=mine\nPORT=6000\n');
    const result = ensureEnvFile({
      examplePath: example,
      targetPath: target,
      generate: { PASSWORD: () => 'generated' },
    });
    expect(result.created).toBe(false);
    expect(result.added).toEqual([]);
    expect(result.values).toEqual({ PASSWORD: 'mine', PORT: '6000' });
  });

  it('fills an existing but empty secret', () => {
    writeFileSync(example, 'PASSWORD=\n');
    writeFileSync(target, 'PASSWORD=\n');
    const result = ensureEnvFile({
      examplePath: example,
      targetPath: target,
      generate: { PASSWORD: () => 'generated' },
    });
    expect(result.values.PASSWORD).toBe('generated');
    expect(result.added).toEqual(['PASSWORD']);
  });

  it('adds keys introduced to the example later', () => {
    writeFileSync(example, 'A=1\nB=2\n');
    writeFileSync(target, 'A=keep\n');
    const result = ensureEnvFile({ examplePath: example, targetPath: target });
    expect(result.added).toEqual(['B']);
    expect(result.values).toEqual({ A: 'keep', B: '2' });
  });

  it('keeps managed values in sync and reports the change', () => {
    writeFileSync(example, 'DATABASE_URL=\n');
    writeFileSync(target, 'DATABASE_URL=postgresql://old\n');
    const result = ensureEnvFile({
      examplePath: example,
      targetPath: target,
      managed: { DATABASE_URL: 'postgresql://new' },
    });
    expect(result.updated).toEqual(['DATABASE_URL']);
    expect(result.values.DATABASE_URL).toBe('postgresql://new');
  });

  it('preserves local additions that are not in the example', () => {
    writeFileSync(example, 'A=1\n');
    writeFileSync(target, 'A=1\nMY_DEBUG=true\n');
    ensureEnvFile({ examplePath: example, targetPath: target });
    const text = readFileSync(target, 'utf8');
    expect(text).toContain('MY_DEBUG=true');
    expect(text.indexOf('MY_DEBUG')).toBeGreaterThan(text.indexOf('A=1'));
  });

  it('is idempotent', () => {
    writeFileSync(example, '# c\nA=\nB=x y\n');
    ensureEnvFile({ examplePath: example, targetPath: target, generate: { A: () => 'gen' } });
    const first = readFileSync(target, 'utf8');
    const result = ensureEnvFile({
      examplePath: example,
      targetPath: target,
      generate: { A: () => 'other' },
    });
    expect(readFileSync(target, 'utf8')).toBe(first);
    expect(result.added).toEqual([]);
    expect(result.updated).toEqual([]);
  });

  it.skipIf(process.platform === 'win32')('restricts the file to its owner', () => {
    writeFileSync(example, 'A=1\n');
    ensureEnvFile({ examplePath: example, targetPath: target });
    expect(statSync(target).mode & 0o777).toBe(0o600);
  });

  it.skipIf(process.platform === 'win32')(
    'tightens an existing world-readable file before writing secrets into it',
    () => {
      writeFileSync(example, 'A=\n');
      writeFileSync(target, 'A=\n', { mode: 0o644 });
      chmodSync(target, 0o644);
      ensureEnvFile({ examplePath: example, targetPath: target, generate: { A: () => 's' } });
      expect(statSync(target).mode & 0o777).toBe(0o600);
    },
  );

  it('fails clearly when the example is missing', () => {
    expect(() => ensureEnvFile({ examplePath: example, targetPath: target })).toThrow(
      /\.env\.example/u,
    );
  });
});
