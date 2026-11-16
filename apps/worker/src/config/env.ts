import { workerEnvSchema, parseEnv, type WorkerEnv, type EnvSource } from '@yazesim/shared/env';

/** Injection token for the validated worker environment. */
export const WORKER_ENV = Symbol('WORKER_ENV');

/**
 * Validates the environment. Throws `EnvValidationError` listing invalid
 * variables without their values.
 */
export function loadWorkerEnv(source: EnvSource = process.env): WorkerEnv {
  return parseEnv(workerEnvSchema, source);
}
