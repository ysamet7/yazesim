import 'reflect-metadata';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { WorkerEnv } from '@yazesim/shared/env';
import { QueueEvents } from 'bullmq';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { loadWorkerEnv } from '../src/config/env.js';
import { redisConnection } from '../src/queue/connection.js';
import { SYSTEM_QUEUE, SystemQueue } from '../src/queue/system-queue.js';

async function startWorker(
  overrides: Record<string, string> = {},
): Promise<{ app: NestExpressApplication; env: WorkerEnv }> {
  const env = loadWorkerEnv({
    ...process.env,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    ...overrides,
  });
  const moduleRef = await Test.createTestingModule({ imports: [AppModule.forRoot(env)] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bufferLogs: true });
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  return { app, env };
}

describe('worker (against the local stack)', () => {
  let app: NestExpressApplication;
  let env: WorkerEnv;

  beforeAll(async () => {
    ({ app, env } = await startWorker());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /saglik/canli answers without touching dependencies', async () => {
    const response = await request(app.getHttpServer()).get('/saglik/canli').expect(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('GET /saglik reports database, redis, chain and the queue worker as ready', async () => {
    const response = await request(app.getHttpServer()).get('/saglik').expect(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      checks: {
        database: { status: 'ok' },
        redis: { status: 'ok' },
        chain: { status: 'ok' },
        queue: { status: 'ok' },
      },
    });
  });

  it('processes a job from the system queue', async () => {
    const events = new QueueEvents(SYSTEM_QUEUE, {
      connection: redisConnection(env.REDIS_URL),
      prefix: env.QUEUE_PREFIX,
    });
    try {
      await events.waitUntilReady();
      const job = await app.get(SystemQueue).queue.add('ping', {});
      await expect(job.waitUntilFinished(events, 10_000)).resolves.toEqual({ pong: true });
    } finally {
      await events.close();
    }
  });

  it('sends locked-down headers', async () => {
    const response = await request(app.getHttpServer()).get('/saglik/canli');
    expect(response.headers['content-security-policy']).toBe(
      "default-src 'none';frame-ancestors 'none';base-uri 'none'",
    );
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('answers unknown paths with the documented error body', async () => {
    const response = await request(app.getHttpServer()).get('/yok').expect(404);
    expect(response.body).toMatchObject({ code: 'NOT_FOUND', message: 'errors.NOT_FOUND' });
  });
});

describe('worker readiness when Redis is down', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    ({ app } = await startWorker({ REDIS_URL: 'redis://:unused@127.0.0.1:1' }));
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 503 and names the failing checks', async () => {
    const response = await request(app.getHttpServer()).get('/saglik').expect(503);
    expect(response.body).toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      details: { checks: { database: { status: 'ok' }, redis: { status: 'error' } } },
    });
  });
});
