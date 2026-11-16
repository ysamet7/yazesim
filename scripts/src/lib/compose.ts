/** Helpers for the local Docker stack in infra/docker. */
import { capture, run } from './exec.ts';

// Relative to the repository root so arguments never contain spaces.
export const COMPOSE_FILE = 'infra/docker/docker-compose.yml';
export const INFRA_ENV_FILE = 'infra/docker/.env';
export const INFRA_ENV_EXAMPLE = 'infra/docker/.env.example';

export function compose(
  args: readonly string[],
  options: { quiet?: boolean } = {},
): Promise<string> {
  return run(
    'docker',
    ['compose', '-f', COMPOSE_FILE, '--env-file', INFRA_ENV_FILE, ...args],
    options,
  );
}

/** Compose project name (overridable with COMPOSE_PROJECT_NAME, as in docker compose). */
export function composeProjectName(): string {
  return process.env.COMPOSE_PROJECT_NAME ?? 'yazesim';
}

/** True when the stack's PostgreSQL volume already exists (initialized with earlier credentials). */
export function databaseVolumeExists(): boolean {
  const name = `${composeProjectName()}_postgres-data`;
  const result = capture('docker', ['volume', 'ls', '--quiet', '--filter', `name=^${name}$`]);
  return result.ok && result.stdout.split(/\r?\n/u).includes(name);
}
