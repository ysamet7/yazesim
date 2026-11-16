import 'reflect-metadata';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { FieldCipher } from '@yazesim/server';
import { EnvValidationError, type ApiEnv } from '@yazesim/shared/env';
import { apiErrorBodySchema } from '@yazesim/shared/errors';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadApiEnv } from '../src/config/env.js';
import { startApp } from './support/app.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

/** A JSON-RPC endpoint that reports Avalanche mainnet (43114) for every request. */
async function mainnetRpc(): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk: Buffer) => (body += chunk.toString()));
    req.on('end', () => {
      const { id } = JSON.parse(body) as { id: number };
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ jsonrpc: '2.0', id, result: '0xa86a' }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${String(port)}`,
    close: () =>
      new Promise<void>((resolve) =>
        server.close(() => {
          resolve();
        }),
      ),
  };
}

describe('API (against the local stack)', () => {
  let app: NestExpressApplication;
  let env: ApiEnv;

  beforeAll(async () => {
    ({ app, env } = await startApp());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('health', () => {
    it('GET /api/v1/saglik/canli answers without touching dependencies', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/saglik/canli').expect(200);
      expect(response.body).toEqual({ status: 'ok' });
      expect(response.headers['cache-control']).toBe('no-store');
    });

    it('GET /api/v1/saglik reports database, redis and chain as ready', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/saglik').expect(200);
      expect(response.body).toMatchObject({
        status: 'ok',
        checks: {
          database: { status: 'ok' },
          redis: { status: 'ok' },
          chain: { status: 'ok' },
        },
      });
    });
  });

  describe('request ids', () => {
    it('assigns a request id to every response', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/saglik/canli');
      expect(response.headers['x-request-id']).toMatch(UUID);
    });

    it('keeps a well-formed incoming request id', async () => {
      const id = '2f4b7a9e-6c1d-4e8f-9a0b-1c2d3e4f5a6b';
      const response = await request(app.getHttpServer())
        .get('/api/v1/saglik/canli')
        .set('x-request-id', id);
      expect(response.headers['x-request-id']).toBe(id);
    });
  });

  describe('error body', () => {
    it('returns the documented body for an unknown route', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/yok-boyle-bir-yer')
        .expect(404);
      expect(apiErrorBodySchema.parse(response.body)).toEqual({
        code: 'NOT_FOUND',
        message: 'errors.NOT_FOUND',
        requestId: response.headers['x-request-id'],
      });
    });

    it('returns the documented body for malformed JSON instead of an HTML page', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/saglik')
        .set('content-type', 'application/json')
        .send('{"broken":')
        .expect(400);
      expect(response.headers['content-type']).toMatch(/application\/json/u);
      expect(response.body).toMatchObject({
        code: 'VALIDATION_FAILED',
        message: 'errors.VALIDATION_FAILED',
      });
    });
  });

  describe('security headers', () => {
    it('sends a locked-down policy and no caching on API responses', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/saglik/canli');
      expect(response.headers['content-security-policy']).toBe(
        "default-src 'none';frame-ancestors 'none';base-uri 'none'",
      );
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['referrer-policy']).toBe('no-referrer');
      expect(response.headers['x-powered-by']).toBeUndefined();
      const notFound = await request(app.getHttpServer()).get('/api/v1/yok');
      expect(notFound.headers['cache-control']).toBe('no-store');
    });
  });

  describe('CORS', () => {
    it('allows the configured web origin with credentials', async () => {
      const origin = env.CORS_ORIGINS[0] ?? '';
      const response = await request(app.getHttpServer())
        .options('/api/v1/saglik')
        .set('origin', origin)
        .set('access-control-request-method', 'GET')
        .expect(204);
      expect(response.headers['access-control-allow-origin']).toBe(origin);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('does not allow other origins', async () => {
      const response = await request(app.getHttpServer())
        .options('/api/v1/saglik')
        .set('origin', 'https://evil.example')
        .set('access-control-request-method', 'GET');
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('field encryption', () => {
    it('is wired with the configured keys and round-trips chat-sized text', () => {
      const cipher = app.get(FieldCipher);
      const text = 'Sigortam attı, ne yapmalıyım? Çğıöşü İ'.repeat(50);
      const envelope = cipher.encrypt(text, 'message.content:test');
      expect(envelope).not.toContain('Sigorta');
      expect(cipher.decrypt(envelope, 'message.content:test')).toBe(text);
      expect(() => cipher.decrypt(envelope, 'message.content:other')).toThrow();
    });
  });
});

describe('API readiness when a dependency is down', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    // Port 1 on loopback: nothing listens there, the connection is refused at once.
    ({ app } = await startApp({ REDIS_URL: 'redis://:unused@127.0.0.1:1' }));
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 503 SERVICE_UNAVAILABLE and names the failing check', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/saglik').expect(503);
    expect(response.body).toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      message: 'errors.SERVICE_UNAVAILABLE',
      details: {
        checks: {
          database: { status: 'ok' },
          redis: { status: 'error' },
        },
      },
    });
  });

  it('keeps liveness green so the process is not restarted for an external outage', async () => {
    await request(app.getHttpServer()).get('/api/v1/saglik/canli').expect(200);
  });
});

describe('API behind a proxy', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    ({ app } = await startApp({ TRUST_PROXY: 'true' }));
  });

  afterAll(async () => {
    await app.close();
  });

  it('trusts exactly one proxy hop', () => {
    const express = app.getHttpAdapter().getInstance() as { get: (key: string) => unknown };
    expect(express.get('trust proxy')).toBe(1);
  });
});

describe('environment validation', () => {
  it('rejects an incomplete environment before the app starts', () => {
    expect(() => loadApiEnv({ APP_ENV: 'local' })).toThrow(EnvValidationError);
  });

  it('never echoes a rejected secret', () => {
    const leaked = 'not-a-valid-pepper!';
    let error: unknown;
    try {
      loadApiEnv({ ...process.env, HASH_PEPPER: leaked });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(EnvValidationError);
    expect((error as Error).message).toContain('HASH_PEPPER');
    expect((error as Error).message).not.toContain(leaked);
  });
});

describe('API startup with an RPC on another chain', () => {
  it('refuses to start (golden rule 5)', async () => {
    const rpc = await mainnetRpc();
    try {
      await expect(startApp({ RPC_URL: rpc.url })).rejects.toThrow(
        'RPC reports chain 43114, expected 31337',
      );
    } finally {
      await rpc.close();
    }
  });
});
