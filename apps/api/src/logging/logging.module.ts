import { Module } from '@nestjs/common';
import { buildPinoHttpOptions } from '@yazesim/server';
import type { ApiEnv } from '@yazesim/shared/env';
import { LoggerModule } from 'nestjs-pino';
import { API_ENV } from '../config/env.js';

/** Request logging without bodies, secrets or chat content (golden rule 7). */
@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [API_ENV],
      useFactory: (env: ApiEnv) => ({
        pinoHttp: buildPinoHttpOptions({
          level: env.LOG_LEVEL,
          pretty: env.APP_ENV === 'local' && env.NODE_ENV === 'development',
          quietPaths: ['/api/v1/saglik/canli'],
        }),
      }),
    }),
  ],
})
export class LoggingModule {}
