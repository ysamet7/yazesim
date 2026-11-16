import { Module } from '@nestjs/common';
import {
  ChainHealthIndicator,
  HEALTH_INDICATORS,
  HealthService,
  PingHealthIndicator,
  type HealthIndicator,
} from '@yazesim/server';
import type { ApiEnv } from '@yazesim/shared/env';
import type { PublicClient } from 'viem';
import { CHAIN_CLIENT, ChainModule } from '../chain/chain.module.js';
import { API_ENV } from '../config/env.js';
import { DatabaseModule } from '../database/database.module.js';
import { PrismaService } from '../database/prisma.service.js';
import { RedisModule } from '../redis/redis.module.js';
import { RedisService } from '../redis/redis.service.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [DatabaseModule, RedisModule, ChainModule],
  controllers: [HealthController],
  providers: [
    HealthService,
    {
      // Everything the API needs to serve traffic (readiness).
      provide: HEALTH_INDICATORS,
      inject: [PrismaService, RedisService, CHAIN_CLIENT, API_ENV],
      useFactory: (
        prisma: PrismaService,
        redis: RedisService,
        chain: PublicClient,
        env: ApiEnv,
      ): readonly HealthIndicator[] => [
        new PingHealthIndicator('database', () => prisma.$queryRaw`SELECT 1`),
        new PingHealthIndicator('redis', () => redis.client.ping()),
        new ChainHealthIndicator(() => chain.getChainId(), env.CHAIN_ID),
      ],
    },
  ],
})
export class HealthModule {}
