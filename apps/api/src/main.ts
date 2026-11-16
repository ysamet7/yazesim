import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { loadLocalEnvFile } from '@yazesim/server';
import { EnvValidationError, type ApiEnv } from '@yazesim/shared/env';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { loadApiEnv } from './config/env.js';

function readEnvironment(): ApiEnv {
  loadLocalEnvFile();
  try {
    return loadApiEnv();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      // The message names invalid variables only, never their values.
      process.stderr.write(`\nAPI başlatılamadı. ${error.message}\n\n`);
      process.exit(1);
    }
    throw error;
  }
}

const env = readEnvironment();
const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(env), {
  bufferLogs: true,
});
configureApp(app, env);
await app.listen(env.PORT);

// SIGTERM (the supervisor) and SIGINT (Ctrl+C): stop taking requests, run the
// shutdown hooks (database, Redis), then exit 0. Nest's own
// enableShutdownHooks re-raises the signal after closing, so the process
// would end by the signal instead of with a status code.
const shutdown = (signal: NodeJS.Signals): void => {
  process.removeListener('SIGINT', shutdown);
  process.removeListener('SIGTERM', shutdown);
  const logger = new Logger('Shutdown');
  logger.log(`API stopping (${signal})`);
  app.close().then(
    () => process.exit(0),
    (error: unknown) => {
      logger.error(error, 'API did not stop cleanly');
      process.exit(1);
    },
  );
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
