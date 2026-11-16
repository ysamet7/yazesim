/**
 * `pnpm repo:guard` — fails when a tracked file must never be in this public
 * repository (see lib/repo-guard.ts). CI runs it over the whole checkout; the
 * pre-commit hook runs it with `--staged` over the files being committed.
 */
import { capture } from './lib/exec.ts';
import { log } from './lib/log.ts';
import { findForbiddenPaths } from './lib/repo-guard.ts';

const staged = process.argv.includes('--staged');
const listed = staged
  ? capture('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'])
  : capture('git', ['ls-files', '-z']);

if (!listed.ok) {
  log.fail(`git dosya listesi alınamadı: ${listed.stderr}`);
  process.exitCode = 1;
} else {
  const violations = findForbiddenPaths(listed.stdout.split('\0'));
  if (violations.length === 0) {
    if (!staged) log.ok('Depo koruması: yasaklı dosya yok.');
  } else {
    for (const violation of violations) log.fail(`${violation.path}: ${violation.reason}`);
    log.info(
      staged
        ? 'Bu dosyaları commit dışı bırakın: git restore --staged <dosya>'
        : 'Bu dosyaları depodan çıkarın: git rm --cached <dosya>',
    );
    process.exitCode = 1;
  }
}
