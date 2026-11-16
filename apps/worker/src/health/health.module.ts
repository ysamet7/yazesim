import { Module } from '@nestjs/common';
import {
  ChainHealthIndicator,
  HEALTH_INDICATORS,
  HealthService,
  PingHealthIndicator,
  UnexpectedDependencyStateError,
  type HealthIndicator,
} from '@yazesim/server';
import type { WorkerEnv } from '@yazesim/shared/env';
import type { PublicClient } from 'viem';
import { CHAIN_CLIENT, ChainModule } from '../chain/chain.module.js';
import { WORKER_ENV } from '../config/env.js';
import { DatabaseModule } from '../database/database.module.js';
import { PrismaService } from '../database/prisma.service.js';
import { QueueModule } from '../queue/queue.module.js';
import { SystemQueue } from '../queue/system-queue.js';
import { RedisModule } from '../redis/redis.module.js';
import { RedisService } from '../redis/redis.service.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [DatabaseModule, RedisModule, ChainModule, QueueModule],
  controllers: [HealthController],
  providers: [
    HealthService,
    {
      provide: HEALTH_INDICATORS,
      inject: [PrismaService, RedisService, CHAIN_CLIENT, SystemQueue, WORKER_ENV],
      useFactory: (
        prisma: PrismaService,
        redis: RedisService,
        chain: PublicClient,
        queue: SystemQueue,
        env: WorkerEnv,
      ): readonly HealthIndicator[] => [
        new PingHealthIndicator('database', () => prisma.$queryRaw`SELECT 1`),
        new PingHealthIndicator('redis', () => redis.client.ping()),
        new ChainHealthIndicator(() => chain.getChainId(), env.CHAIN_ID),
        new PingHealthIndicator('queue', () =>
          queue.isRunning()
            ? Promise.resolve()
            : Promise.reject(new UnexpectedDependencyStateError('worker stopped', 'stopped')),
        ),
      ],
    },
  ],
})
export class HealthModule {}
