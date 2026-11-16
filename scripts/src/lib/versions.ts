import { readFileSync } from 'node:fs';
import { repoPath } from './paths.ts';

export type Version = readonly [major: number, minor: number, patch: number];

/** Extracts the first `x.y.z` version from tool output such as `forge Version: 1.8.5`. */
export function parseVersion(text: string): Version | null {
  const match = /(\d+)\.(\d+)\.(\d+)/u.exec(text);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareVersions(a: Version, b: Version): number {
  for (let i = 0; i < 3; i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return Math.sign(diff);
  }
  return 0;
}

export function formatVersion(version: Version): string {
  return version.join('.');
}

export interface Toolchain {
  readonly node: string;
  readonly foundry: string;
  readonly gitleaks: string;
}

/** Tool versions pinned in toolchain.json (single source of truth for non-npm tools). */
export function readToolchain(): Toolchain {
  return JSON.parse(readFileSync(repoPath('toolchain.json'), 'utf8')) as Toolchain;
}

export interface RootManifest {
  readonly packageManager: string;
  readonly engines: { readonly node: string };
}

export function readRootManifest(): RootManifest {
  return JSON.parse(readFileSync(repoPath('package.json'), 'utf8')) as RootManifest;
}

/** Parses the `>=24.11.0 <25` engines range used by the root package.json. */
export function parseNodeRange(range: string): { min: Version; maxMajorExclusive: number } {
  const match = /^>=(\d+\.\d+\.\d+)\s+<(\d+)$/u.exec(range.trim());
  const min = match?.[1] === undefined ? null : parseVersion(match[1]);
  if (!min || match?.[2] === undefined) throw new Error(`Unsupported engines.node range: ${range}`);
  return { min, maxMajorExclusive: Number(match[2]) };
}
