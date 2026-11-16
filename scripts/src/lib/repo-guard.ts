/**
 * Paths that must never be tracked in this public repository (golden rules 1,
 * 3 and 4): the earlier attempt under `external/`, its review report, and
 * local env files. The pre-commit hook blocks staging them; CI runs
 * `pnpm repo:guard` over every tracked file and every path in the history as
 * the second line.
 *
 * Matching ignores case: on macOS (`core.ignorecase=true`) `git add -f
 * External/a.txt` stages the real `external/a.txt` under that spelling.
 */

const FORBIDDEN: readonly { readonly pattern: RegExp; readonly reason: string }[] = [
  { pattern: /^external\//iu, reason: 'external/ yalnız okunur ve açık depoya girmez' },
  { pattern: /inceleme-raporu/iu, reason: 'inceleme raporu açık depoya girmez' },
  {
    // .env, .env.local, .env-prod, .envrc, prod.env
    pattern: /(^|\/)(\.env([.-][^/]*|rc)?|[^/]+\.env)$/iu,
    reason: '.env dosyaları gizli bilgi taşır; yalnız .env.example commit edilir',
  },
];

/** Allowed despite matching above: committed templates. */
const ALLOWED = /(^|\/)\.env\.example$/u;

export interface GuardViolation {
  readonly path: string;
  readonly reason: string;
}

export function findForbiddenPaths(paths: readonly string[]): GuardViolation[] {
  const violations: GuardViolation[] = [];
  for (const raw of paths) {
    const path = raw.replace(/\\/gu, '/').replace(/^\.\//u, '');
    if (path === '' || ALLOWED.test(path)) continue;
    const rule = FORBIDDEN.find((candidate) => candidate.pattern.test(path));
    if (rule) violations.push({ path, reason: rule.reason });
  }
  return violations;
}
