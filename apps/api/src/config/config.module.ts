import { Global, Module, type DynamicModule } from '@nestjs/common';
import type { ApiEnv } from '@yazesim/shared/env';
import { API_ENV } from './env.js';

/** Provides the validated environment to every module via the `API_ENV` token. */
@Global()
@Module({})
export class ConfigModule {
  static forRoot(env: ApiEnv): DynamicModule {
    return {
      module: ConfigModule,
      providers: [{ provide: API_ENV, useValue: env }],
      exports: [API_ENV],
    };
  }
}
