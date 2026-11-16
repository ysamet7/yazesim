import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadLocalEnvFile } from './local-env.js';

const KEY = 'YAZESIM_ENV_SPEC_PROBE';

afterEach(() => {
  Reflect.deleteProperty(process.env, KEY);
});

describe('loadLocalEnvFile', () => {
  it('loads a present file without overriding the real environment', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'yazesim-env-'));
    const file = path.join(dir, '.env');
    writeFileSync(file, `${KEY}=from-file\n`);
    try {
      loadLocalEnvFile(file);
      expect(process.env[KEY]).toBe('from-file');

      process.env[KEY] = 'from-shell';
      loadLocalEnvFile(file);
      expect(process.env[KEY]).toBe('from-shell');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does nothing when the file does not exist', () => {
    expect(() => {
      loadLocalEnvFile(path.join(tmpdir(), 'yazesim-does-not-exist', '.env'));
    }).not.toThrow();
  });
});
