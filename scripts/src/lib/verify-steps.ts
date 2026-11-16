/**
 * What `pnpm verify` runs: the checks of CI (.github/workflows/ci.yml) on this
 * machine, so a pull request is fully verified before its CI run.
 */

export type VerifyGroup =
  /** Secret scan, repository guard, audit, formatting, lint, types, unit tests, build. */
  | 'core'
  /** Database and API tests against the local stack `pnpm bootstrap` prepared. */
  | 'integration';

export interface VerifyStep {
  readonly label: string;
  readonly group: VerifyGroup;
  readonly command: string;
  readonly args: readonly string[];
}

export const VERIFY_STEPS: readonly VerifyStep[] = [
  {
    label: 'Gizli bilgi taraması (gitleaks)',
    group: 'core',
    command: 'gitleaks',
    args: ['git', '--redact', '--no-banner', '--verbose', '.'],
  },
  { label: 'Depo koruması', group: 'core', command: 'pnpm', args: ['repo:guard'] },
  {
    label: 'Bağımlılık denetimi',
    group: 'core',
    command: 'pnpm',
    args: ['audit', '--audit-level', 'high'],
  },
  { label: 'Biçim', group: 'core', command: 'pnpm', args: ['format:check'] },
  {
    label: 'Lint, tip kontrolü, birim testleri, derleme',
    group: 'core',
    command: 'pnpm',
    args: ['turbo', 'run', 'lint', 'typecheck', 'test', 'build'],
  },
  {
    label: 'Veritabanı testleri',
    group: 'integration',
    command: 'pnpm',
    args: ['turbo', 'run', 'test:db'],
  },
  {
    label: 'Uçtan uca API ve işçi testleri',
    group: 'integration',
    command: 'pnpm',
    args: ['turbo', 'run', 'test:e2e'],
  },
];

export interface VerifyArgs {
  readonly quick: boolean;
}

export function parseVerifyArgs(argv: readonly string[]): VerifyArgs {
  for (const arg of argv) {
    if (arg !== '--quick') throw new Error(`Bilinmeyen seçenek: ${arg} (geçerli: --quick)`);
  }
  return { quick: argv.includes('--quick') };
}

export function selectSteps(args: VerifyArgs): readonly VerifyStep[] {
  return VERIFY_STEPS.filter((step) => !args.quick || step.group === 'core');
}
