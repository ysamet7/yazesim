import { describe, expect, it } from 'vitest';
import { findForbiddenPaths } from './repo-guard.ts';

describe('findForbiddenPaths', () => {
  it.each([
    'external/index.php',
    'external/deep/nested/file.ts',
    './external/x',
    'external\\windows\\path.txt',
    'docs/inceleme-raporu.md',
    'notes/Inceleme-Raporu-2.md',
    '.env',
    'apps/api/.env',
    'apps/web/.env.local',
    'infra/docker/.env.production',
  ])('rejects %s', (path) => {
    expect(findForbiddenPaths([path])).toHaveLength(1);
  });

  it.each([
    'apps/api/.env.example',
    'infra/docker/.env.example',
    'apps/api/src/external-api.ts',
    'docs/plans/faz-0.md',
    'packages/shared/src/env.ts',
    'apps/web/environment.ts',
    '',
  ])('allows %s', (path) => {
    expect(findForbiddenPaths([path])).toEqual([]);
  });

  it('reports each violation with its reason', () => {
    expect(findForbiddenPaths(['README.md', 'external/a', 'apps/api/.env'])).toEqual([
      { path: 'external/a', reason: expect.stringContaining('external/') as unknown },
      { path: 'apps/api/.env', reason: expect.stringContaining('.env') as unknown },
    ]);
  });
});
