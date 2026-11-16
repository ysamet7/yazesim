import { Global, Module, type DynamicModule } from '@nestjs/common';
import type { WorkerEnv } from '@yazesim/shared/env';
import { WORKER_ENV } from './env.js';

/** Provides the validated environment to every module via the `WORKER_ENV` token. */
@Global()
@Module({})
export class ConfigModule {
  static forRoot(env: WorkerEnv): DynamicModule {
    return {
      module: ConfigModule,
      providers: [{ provide: WORKER_ENV, useValue: env }],
      exports: [WORKER_ENV],
    };
  }
}
