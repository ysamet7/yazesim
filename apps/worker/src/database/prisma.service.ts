import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, prismaClientOptions } from '@yazesim/database';
import type { WorkerEnv } from '@yazesim/shared/env';
import { WORKER_ENV } from '../config/env.js';

/** The shared Prisma client (packages/database) as a Nest provider. */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(WORKER_ENV) env: WorkerEnv) {
    super(prismaClientOptions(env.DATABASE_URL));
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
