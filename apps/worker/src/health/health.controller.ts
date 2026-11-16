import { Controller, Get, Header, Inject } from '@nestjs/common';
import { ApiException, HealthService, type HealthReport } from '@yazesim/server';
import type { WorkerEnv } from '@yazesim/shared/env';
import { ErrorCode } from '@yazesim/shared/errors';
import { WORKER_ENV } from '../config/env.js';

/**
 * `GET /saglik/canli` — liveness: the process is up.
 * `GET /saglik` — readiness: database, Redis, chain RPC and the queue worker.
 * The worker serves nothing else over HTTP; its port is for the supervisor.
 */
@Controller('saglik')
export class HealthController {
  constructor(
    private readonly health: HealthService,
    @Inject(WORKER_ENV) private readonly env: WorkerEnv,
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
