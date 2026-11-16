import type { ApiEnv } from '@yazesim/shared/env';
import { describe, expect, it } from 'vitest';
import { ApiException } from '@yazesim/server';
import { HealthController } from './health.controller.js';
import type { HealthReport, HealthService } from '@yazesim/server';

const healthy: HealthReport = {
  status: 'ok',
  uptimeSeconds: 12,
  checks: { database: { status: 'ok', latencyMs: 3 } },
};
const unhealthy: HealthReport = {
  status: 'error',
  uptimeSeconds: 12,
  checks: { database: { status: 'error', latencyMs: 2_000, reason: 'timeout' } },
};

function controller(report: HealthReport, appEnv: ApiEnv['APP_ENV']): HealthController {
  const service = { check: () => Promise.resolve(report) } as unknown as HealthService;
  return new HealthController(service, { APP_ENV: appEnv } as ApiEnv);
}

describe('HealthController', () => {
  it('answers liveness without dependencies', () => {
    expect(controller(unhealthy, 'local').liveness()).toEqual({ status: 'ok' });
  });

  it('returns the full report outside production', async () => {
    await expect(controller(healthy, 'staging').readiness()).resolves.toEqual(healthy);
  });

  it('hides check details in production', async () => {
    await expect(controller(healthy, 'production').readiness()).resolves.toEqual({ status: 'ok' });
  });

  it('raises SERVICE_UNAVAILABLE with check details outside production', async () => {
    const error: unknown = await controller(unhealthy, 'local')
      .readiness()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiException);
    expect(error).toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      details: { checks: unhealthy.checks },
    });
  });

  it('raises SERVICE_UNAVAILABLE without details in production', async () => {
    const error: unknown = await controller(unhealthy, 'production')
      .readiness()
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ code: 'SERVICE_UNAVAILABLE', details: undefined });
  });
});
