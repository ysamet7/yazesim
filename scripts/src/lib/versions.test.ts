import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { repoPath } from './paths.ts';
import {
  compareVersions,
  formatVersion,
  parseNodeRange,
  parseVersion,
  readRootManifest,
  readToolchain,
} from './versions.ts';

describe('parseVersion', () => {
  it.each([
    ['forge Version: 1.8.5\nCommit SHA: abc', [1, 8, 5]],
    ['v24.21.0', [24, 21, 0]],
    ['Docker version 29.7.2, build a7dcaa6', [29, 7, 2]],
    ['git version 2.55.0.windows.3', [2, 55, 0]],
    ['no version here', null],
  ])('parses %j', (text, expected) => {
    expect(parseVersion(text)).toEqual(expected);
  });
});

describe('compareVersions', () => {
  it('orders versions numerically', () => {
    expect(compareVersions([1, 10, 0], [1, 9, 9])).toBe(1);
    expect(compareVersions([1, 8, 5], [1, 8, 5])).toBe(0);
    expect(compareVersions([0, 9, 9], [1, 0, 0])).toBe(-1);
    expect(formatVersion([1, 8, 5])).toBe('1.8.5');
  });
});

describe('parseNodeRange', () => {
  it('reads the engines range format used by this repository', () => {
    expect(parseNodeRange('>=24.11.0 <25')).toEqual({ min: [24, 11, 0], maxMajorExclusive: 25 });
    expect(() => parseNodeRange('^24')).toThrow();
  });
});

/**
 * Tool versions are declared in several files that cannot import each other
 * (YAML, JSON, TOML). These tests keep them in lockstep with toolchain.json.
 */
describe('toolchain consistency', () => {
  const toolchain = readToolchain();
  const manifest = readRootManifest();

  it('pins the Anvil image to the toolchain Foundry version', () => {
    const compose = readFileSync(repoPath('infra/docker/docker-compose.yml'), 'utf8');
    expect(compose).toContain(`image: ghcr.io/foundry-rs/foundry:v${toolchain.foundry}`);
  });

  it('pins every Compose image by version and digest', () => {
    const compose = readFileSync(repoPath('infra/docker/docker-compose.yml'), 'utf8');
    const images = compose
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('image: '));
    expect(images).toHaveLength(3);
    for (const image of images) {
      expect(image).toMatch(/^image: [^@:]+:[^@:]+@sha256:[0-9a-f]{64}$/u);
    }
  });

  it('keeps .nvmrc equal to the toolchain Node version and inside the engines range', () => {
    const nvmrc = readFileSync(repoPath('.nvmrc'), 'utf8').trim();
    expect(nvmrc).toBe(toolchain.node);
    const range = parseNodeRange(manifest.engines.node);
    const node = parseVersion(nvmrc);
    expect(node).not.toBeNull();
    if (node) {
      expect(compareVersions(node, range.min)).toBeGreaterThanOrEqual(0);
      expect(node[0]).toBeLessThan(range.maxMajorExclusive);
    }
  });

  it.each(['node', 'foundry', 'gitleaks'] as const)('pins %s to an exact version', (tool) => {
    expect(toolchain[tool]).toMatch(/^\d+\.\d+\.\d+$/u);
  });

  it('pins pnpm with an exact packageManager version', () => {
    expect(manifest.packageManager).toMatch(/^pnpm@\d+\.\d+\.\d+$/u);
  });
});
