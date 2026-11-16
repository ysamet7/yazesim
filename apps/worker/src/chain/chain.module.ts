import { Inject, Injectable, Logger, Module, type OnApplicationBootstrap } from '@nestjs/common';
import { RpcChainMismatchError } from '@yazesim/server';
import type { WorkerEnv } from '@yazesim/shared/env';
import { createPublicClient, http, type PublicClient } from 'viem';
import { WORKER_ENV } from '../config/env.js';

/** Injection token for the read-only client of CHAIN_ID's RPC endpoint. */
export const CHAIN_CLIENT = Symbol('CHAIN_CLIENT');

/**
 * Refuses to start when the RPC endpoint serves another chain than CHAIN_ID:
 * such an endpoint could point at mainnet (golden rule 5). An unreachable
 * endpoint only warns; readiness reports it until it answers.
 */
@Injectable()
export class ChainStartupCheck implements OnApplicationBootstrap {
  private readonly logger = new Logger(ChainStartupCheck.name);

  constructor(
    @Inject(CHAIN_CLIENT) private readonly client: PublicClient,
    @Inject(WORKER_ENV) private readonly env: WorkerEnv,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    let actual: number;
    try {
      actual = await this.client.getChainId();
    } catch {
      this.logger.warn('Chain RPC is unreachable at startup; readiness reports it');
      return;
    }
    if (actual !== this.env.CHAIN_ID) throw new RpcChainMismatchError(actual, this.env.CHAIN_ID);
  }
}

/**
 * Read-only chain access. The server never holds a key that can send a
 * transaction (ADR-007); the RPC URL may embed a provider key and is never
 * logged.
 */
@Module({
  providers: [
    {
      provide: CHAIN_CLIENT,
      inject: [WORKER_ENV],
      useFactory: (env: WorkerEnv): PublicClient =>
        createPublicClient({
          transport: http(env.RPC_URL, { timeout: 2_000, retryCount: 0 }),
        }),
    },
    ChainStartupCheck,
  ],
  exports: [CHAIN_CLIENT],
})
export class ChainModule {}
