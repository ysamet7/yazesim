import { apiEnvSchema, parseEnv, type ApiEnv, type EnvSource } from '@yazesim/shared/env';

/** Injection token for the validated API environment. */
export const API_ENV = Symbol('API_ENV');

/**
 * Validates the environment. Throws `EnvValidationError` listing invalid
 * variables without their values.
 */
export function loadApiEnv(source: EnvSource = process.env): ApiEnv {
  return parseEnv(apiEnvSchema, source);
}
