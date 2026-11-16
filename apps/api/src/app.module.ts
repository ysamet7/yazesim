import { Module, type DynamicModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from '@yazesim/server';
import type { ApiEnv } from '@yazesim/shared/env';
import { ConfigModule } from './config/config.module.js';
import { CryptoModule } from './crypto/crypto.module.js';
import { HealthModule } from './health/health.module.js';
import { LoggingModule } from './logging/logging.module.js';

@Module({})
export class AppModule {
  /** The environment is validated before Nest starts and injected from here on. */
  static forRoot(env: ApiEnv): DynamicModule {
    return {
      module: AppModule,
      imports: [ConfigModule.forRoot(env), CryptoModule, LoggingModule, HealthModule],
      providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
    };
  }
}
