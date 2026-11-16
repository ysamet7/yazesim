/**
 * `pnpm repo:guard` — fails when a file must never be in this public repository
 * (see lib/repo-guard.ts). By default it checks every tracked file and every
 * path that any commit on any branch ever touched: a file added and later
 * removed would still be published with the history. The pre-commit hook runs
 * it with `--staged` over the files being committed.
 */
import { capture } from './lib/exec.ts';
import { log } from './lib/log.ts';
import { findForbiddenPaths } from './lib/repo-guard.ts';

const staged = process.argv.includes('--staged');
const listings = staged
  ? [capture('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'])]
  : [
      capture('git', ['ls-files', '-z']),
      capture('git', ['log', '--all', '--name-only', '--format=', '-z']),
    ];
const failed = listings.find((listing) => !listing.ok);

if (failed) {
  log.fail(`git dosya listesi alınamadı: ${failed.stderr}`);
  process.exitCode = 1;
} else {
  const paths = new Set(listings.flatMap((listing) => listing.stdout.split(/[\0\n]/u)));
  const violations = findForbiddenPaths([...paths]);
  if (violations.length === 0) {
    if (!staged) log.ok('Depo koruması: dosyalarda ve geçmişte yasaklı dosya yok.');
  } else {
    for (const violation of violations) log.fail(`${violation.path}: ${violation.reason}`);
    log.info(
      staged
        ? 'Bu dosyaları commit dışı bırakın: git restore --staged <dosya>'
        : 'Bu dosyaları depodan ve geçmişten çıkarın (geçmişteyse yayından önce geçmiş yeniden yazılmalı).',
    );
    process.exitCode = 1;
  }
}
