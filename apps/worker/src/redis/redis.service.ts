import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { WorkerEnv } from '@yazesim/shared/env';
import { Redis } from 'ioredis';
import { WORKER_ENV } from '../config/env.js';

const ERROR_LOG_INTERVAL_MS = 30_000;
/** How long startup waits for the first connection before serving anyway. */
export const REDIS_READY_TIMEOUT_MS = 2_000;

/**
 * Shared Redis connection. The worker starts even when Redis is down: commands
 * fail fast (no offline queue) and readiness reports the outage, while the
 * client keeps reconnecting in the background. Startup waits briefly for the
 * first connection, so the first requests do not fail only because the
 * socket was still opening.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);
  private lastErrorLoggedAt = 0;

  constructor(@Inject(WORKER_ENV) env: WorkerEnv) {
    this.client = new Redis(env.REDIS_URL, {
      connectTimeout: 2_000,
      // A stalled connection must not hold a request: commands fail after 2 s.
      commandTimeout: 2_000,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (attempt) => Math.min(attempt * 250, 5_000),
    });
    this.client.on('error', (error: Error) => {
      const now = Date.now();
      if (now - this.lastErrorLoggedAt < ERROR_LOG_INTERVAL_MS) return;
      this.lastErrorLoggedAt = now;
      this.logger.warn(
        { err: { name: error.name, message: error.message } },
        'Redis connection error',
      );
    });
    this.client.on('ready', () => {
      this.lastErrorLoggedAt = 0;
    });
  }

  async onModuleInit(): Promise<void> {
    if (this.client.status === 'ready') return;
    await new Promise<void>((resolve) => {
      const done = (): void => {
        clearTimeout(timer);
        this.client.off('ready', done);
        resolve();
      };
      const timer = setTimeout(done, REDIS_READY_TIMEOUT_MS);
      this.client.once('ready', done);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'ready') await this.client.quit();
    else this.client.disconnect();
  }
}
