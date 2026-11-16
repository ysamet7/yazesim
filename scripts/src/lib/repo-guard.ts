/**
 * Paths that must never be tracked in this public repository (golden rules 1,
 * 3 and 4): the earlier attempt under `external/`, its review report, and
 * local env files. The pre-commit hook blocks staging them; CI runs
 * `pnpm repo:guard` over every tracked file as the second line.
 */

const FORBIDDEN: readonly { readonly pattern: RegExp; readonly reason: string }[] = [
  { pattern: /^external\//u, reason: 'external/ yalnız okunur ve açık depoya girmez' },
  { pattern: /inceleme-raporu/iu, reason: 'inceleme raporu açık depoya girmez' },
  {
    pattern: /(^|\/)\.env(\.[^/]*)?$/u,
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
