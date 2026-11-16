import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute path of the repository root (this file lives in scripts/src/lib). */
export const REPO_ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));

export function repoPath(...segments: string[]): string {
  return path.join(REPO_ROOT, ...segments);
}
