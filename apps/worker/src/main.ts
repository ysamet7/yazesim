import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { loadLocalEnvFile } from '@yazesim/server';
import { EnvValidationError, type WorkerEnv } from '@yazesim/shared/env';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { loadWorkerEnv } from './config/env.js';

function readEnvironment(): WorkerEnv {
  loadLocalEnvFile();
  try {
    return loadWorkerEnv();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      // The message names invalid variables only, never their values.
      process.stderr.write(`\nİşçi başlatılamadı. ${error.message}\n\n`);
      process.exit(1);
    }
    throw error;
  }
}

const env = readEnvironment();
const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(env), {
  bufferLogs: true,
});
configureApp(app);
// Locally only this computer can reach the server; containers listen on all
// interfaces behind their platform's network.
await app.listen(env.PORT, env.APP_ENV === 'local' ? '127.0.0.1' : '0.0.0.0');

// SIGTERM and SIGINT: stop taking jobs, let running jobs finish, close
// connections, then exit 0.
const shutdown = (signal: NodeJS.Signals): void => {
  process.removeListener('SIGINT', shutdown);
  process.removeListener('SIGTERM', shutdown);
  const logger = new Logger('Shutdown');
  logger.log(`Worker stopping (${signal})`);
  app.close().then(
    () => process.exit(0),
    (error: unknown) => {
      logger.error(error, 'Worker did not stop cleanly');
      process.exit(1);
    },
  );
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
