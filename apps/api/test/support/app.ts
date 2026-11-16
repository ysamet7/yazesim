/** Starts the real application module against the local stack, as `main.ts` does. */
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { ApiEnv } from '@yazesim/shared/env';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { loadApiEnv } from '../../src/config/env.js';

export async function startApp(
  overrides: Record<string, string> = {},
): Promise<{ app: NestExpressApplication; env: ApiEnv }> {
  const env = loadApiEnv({
    ...process.env,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    ...overrides,
  });
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.forRoot(env)],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bufferLogs: true });
  configureApp(app, env);
  // Listening already, so supertest never starts and stops the server itself
  // (its shared ephemeral server races when requests overlap).
  await app.listen(0, '127.0.0.1');
  return { app, env };
}
