/**
 * `pnpm verify` — CI's checks on this machine, stopping at the first failure.
 * `--quick` runs only the secret scan, guard, audit, formatting, lint, types,
 * unit tests and build. The integration tests need the local stack that
 * `pnpm bootstrap` prepared.
 */
import { CommandError, run } from './lib/exec.ts';
import { log } from './lib/log.ts';
import { REPO_ROOT } from './lib/paths.ts';
import { parseVerifyArgs, selectSteps } from './lib/verify-steps.ts';

async function main(): Promise<void> {
  const steps = selectSteps(parseVerifyArgs(process.argv.slice(2)));
  log.title(`YazeSim doğrulama (${String(steps.length)} adım)`);
  const started = Date.now();
  for (const [index, step] of steps.entries()) {
    log.step(index + 1, steps.length, step.label);
    const stepStarted = Date.now();
    await run(step.command, step.args, { cwd: REPO_ROOT });
    log.ok(`${String(Math.round((Date.now() - stepStarted) / 1000))} sn`);
  }
  const minutes = ((Date.now() - started) / 60_000).toFixed(1);
  log.title(`Hepsi geçti (${minutes} dk).`);
}

main().catch((error: unknown) => {
  if (error instanceof CommandError) {
    log.fail(`Durdu: ${error.message}`);
  } else {
    log.fail(error instanceof Error ? error.message : String(error));
  }
  process.exitCode = 1;
});
