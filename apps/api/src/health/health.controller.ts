import { Controller, Get, Header, Inject } from '@nestjs/common';
import { ApiException, HealthService, type HealthReport } from '@yazesim/server';
import type { ApiEnv } from '@yazesim/shared/env';
import { ErrorCode } from '@yazesim/shared/errors';
import { API_ENV } from '../config/env.js';

/**
 * `GET /api/v1/saglik/canli` — liveness: the process is up (no dependency checks).
 * `GET /api/v1/saglik` — readiness: database, Redis and the chain RPC are usable.
 * Readiness results are shared for 2 seconds, so probes cannot overload a
 * dependency. Outside production the response lists every check; in
 * production only the overall status is returned.
 */
@Controller('saglik')
export class HealthController {
  constructor(
    private readonly health: HealthService,
    @Inject(API_ENV) private readonly env: ApiEnv,
  ) {}

  @Get('canli')
  @Header('Cache-Control', 'no-store')
  liveness(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  async readiness(): Promise<HealthReport | { status: 'ok' }> {
    const report = await this.health.check();
    const production = this.env.APP_ENV === 'production';
    if (report.status !== 'ok') {
      throw new ApiException(
        ErrorCode.SERVICE_UNAVAILABLE,
        production ? undefined : { checks: report.checks },
      );
    }
    return production ? { status: 'ok' } : report;
  }
}
