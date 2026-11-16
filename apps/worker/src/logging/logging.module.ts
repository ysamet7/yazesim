import { Module } from '@nestjs/common';
import { buildPinoHttpOptions } from '@yazesim/server';
import type { WorkerEnv } from '@yazesim/shared/env';
import { LoggerModule } from 'nestjs-pino';
import { WORKER_ENV } from '../config/env.js';

/** Request logging without bodies, secrets or chat content (golden rule 7). */
@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [WORKER_ENV],
      useFactory: (env: WorkerEnv) => ({
        pinoHttp: buildPinoHttpOptions({
          level: env.LOG_LEVEL,
          pretty: env.APP_ENV === 'local' && env.NODE_ENV === 'development',
          quietPaths: ['/saglik/canli'],
        }),
      }),
    }),
  ],
})
export class LoggingModule {}
