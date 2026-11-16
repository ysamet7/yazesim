import { Writable } from 'node:stream';
import { pino } from 'pino';
import { describe, expect, it } from 'vitest';
import {
  REDACTED,
  buildLoggerOptions,
  buildPinoHttpOptions,
  pathOnly,
  resolveRequestId,
} from './pino-options.js';

function captureLogger(): { logger: pino.Logger; lines: () => Record<string, unknown>[] } {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });
  const logger = pino(buildLoggerOptions('info'), stream);
  return {
    logger,
    lines: () =>
      chunks
        .join('')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line) as Record<string, unknown>),
  };
}

describe('log redaction (no personal data or secrets in logs)', () => {
  it('redacts sensitive fields at every logged depth', () => {
    const { logger, lines } = captureLogger();
    logger.info({
      email: 'ayse@example.com',
      user: { phone: '+905551112233', profile: { tcKimlikNo: '10000000146' } },
      payout: { iban: 'TR000000000000000000000001' },
      wallet: { privateKey: '0xabc', mnemonic: 'test test junk' },
      message: { content: 'f00d', prompt: 'sigortam atıyor', amount: '5000' },
      deep: { level: { inner: { token: 'refresh' } } },
    });
    const [line] = lines();
    const text = JSON.stringify(line);
    for (const secret of [
      'ayse@example.com',
      '+905551112233',
      '10000000146',
      'TR000000000000000000000001',
      '0xabc',
      'test test junk',
      'f00d',
      'sigortam atıyor',
      'refresh',
    ]) {
      expect(text).not.toContain(secret);
    }
    expect(text).toContain('"amount":"5000"');
    expect(line).toMatchObject({ email: REDACTED, payout: { iban: REDACTED } });
  });

  it('redacts name variants at any depth', () => {
    const { logger, lines } = captureLogger();
    logger.info({
      body: { user: { profile: { contact: { details: { phone: '+905550000001' } } } } },
      tcNo: '10000000001',
      TC: '10000000002',
      phone_number: '+905550000002',
      iban_number: 'TR000000000000000000000002',
      birthDate: '1990-01-01',
      fullName: 'Ayşe Yılmaz',
      headers: { Authorization: 'Bearer leaked', cookie: 'sid=leaked' },
      list: [{ email: 'list@example.com' }],
    });
    const text = JSON.stringify(lines()[0]);
    for (const secret of [
      '+905550000001',
      '10000000001',
      '10000000002',
      '+905550000002',
      'TR000000000000000000000002',
      '1990-01-01',
      'Ayşe Yılmaz',
      'Bearer leaked',
      'sid=leaked',
      'list@example.com',
    ]) {
      expect(text).not.toContain(secret);
    }
  });

  it('redacts environment-shaped secrets and connection strings', () => {
    const { logger, lines } = captureLogger();
    logger.info({
      DATABASE_URL: 'postgresql://yazesim:db-password@127.0.0.1:5433/yazesim',
      RPC_URL: 'https://rpc.example/v2/provider-key',
      S3_SECRET_ACCESS_KEY: 's3-secret',
      HASH_PEPPER: 'pepper-value',
      GEMINI_API_KEY: 'ai-key',
      DISTRIBUTOR_PRIVATE_KEY: '0xkey',
      note: 'retry against redis://:redis-password@127.0.0.1:6379',
    });
    const text = JSON.stringify(lines()[0]);
    for (const secret of [
      'db-password',
      'provider-key',
      's3-secret',
      'pepper-value',
      'ai-key',
      '0xkey',
      'redis-password',
    ]) {
      expect(text).not.toContain(secret);
    }
    expect(text).toContain('redis://[REDACTED]@127.0.0.1:6379');
  });

  it('logs errors without URLs or client-library fields', () => {
    const { logger, lines } = captureLogger();
    const error = Object.assign(new Error('HTTP request failed. URL: https://rpc.example/v2/k1'), {
      name: 'HttpRequestError',
      code: 'ECONNRESET',
      url: 'https://rpc.example/v2/k1',
    });
    logger.error({ err: error, requestId: 'r1' }, 'failed');
    const [line] = lines();
    expect(JSON.stringify(line)).not.toContain('rpc.example');
    expect(line).toMatchObject({
      requestId: 'r1',
      err: {
        type: 'HttpRequestError',
        code: 'ECONNRESET',
        message: 'HTTP request failed. URL: [url]',
      },
    });
  });

  it('keeps safe fields such as amounts, order keys and flags', () => {
    const { logger, lines } = captureLogger();
    logger.info({
      amount: '50000000000000000000000',
      orderKey: '0xabc',
      tokenAddress: '0xdef',
      chainId: 43113,
      emailVerified: true,
      phone: null,
    });
    expect(lines()[0]).toMatchObject({
      amount: '50000000000000000000000',
      orderKey: '0xabc',
      tokenAddress: '0xdef',
      chainId: 43113,
      emailVerified: true,
      phone: null,
    });
  });

  it('scrubs the message text and its interpolation values', () => {
    const { logger, lines } = captureLogger();
    logger.info('sent to uye@example.com via postgres://app:parola@db/yazesim and 05321234567');
    logger.info('user %s logged in from %j', 'uye@example.com', { ip: '10.0.0.1' });
    const [first, second] = lines();
    expect(first?.msg).toBe('sent to [email] via [url] and [phone]');
    expect(second?.msg).toBe(`user [email] logged in from {"ip":"${REDACTED}"}`);
  });

  it('scrubs class instances and child logger bindings', () => {
    const { logger, lines } = captureLogger();
    class SignupDto {
      readonly email = 'uye@example.com';
      readonly password = 'hunter2';
    }
    const child = logger.child({ email: 'uye@example.com', component: 'auth' });
    child.info({ dto: new SignupDto() });
    child.child({ phone: '05321234567' }, { level: 'debug' }).info('grandchild');
    const text = JSON.stringify(lines());
    expect(text).not.toMatch(/uye@example\.com|hunter2|05321234567/u);
    expect(text).toContain('"component":"auth"');
    expect(lines()).toHaveLength(2);
  });

  it('scrubs non-error values logged under err', () => {
    const { logger, lines } = captureLogger();
    logger.info({ err: { password: 'hunter2', reason: 'x' } });
    expect(lines()[0]?.err).toEqual({ password: REDACTED, reason: 'x' });
  });

  it('keeps ESM stack locations in logged errors', () => {
    const { logger, lines } = captureLogger();
    const error = new Error('boom');
    error.stack = 'Error: boom\n    at inner (file:///app/dist/main.js:10:5)';
    logger.error({ err: error });
    expect((lines()[0]?.err as { stack: string }).stack).toContain('file:///app/dist/main.js:10:5');
  });

  it('redacts credentials in request and response headers', () => {
    const { logger, lines } = captureLogger();
    logger.info({
      req: {
        headers: {
          authorization: 'Bearer abc',
          cookie: 'session=xyz',
          'x-csrf-token': 'csrf',
          accept: 'json',
        },
      },
      res: { headers: { 'set-cookie': 'session=xyz' } },
    });
    const text = JSON.stringify(lines()[0]);
    expect(text).not.toContain('Bearer abc');
    expect(text).not.toContain('session=xyz');
    expect(text).not.toContain('"csrf"');
    expect(text).toContain('"accept":"json"');
  });
});

describe('request ids', () => {
  it('reuses a well-formed incoming id', () => {
    expect(resolveRequestId('2F4B7A9E-6C1D-4E8F-9A0B-1C2D3E4F5A6B')).toBe(
      '2f4b7a9e-6c1d-4e8f-9a0b-1c2d3e4f5a6b',
    );
    expect(resolveRequestId(['2f4b7a9e-6c1d-4e8f-9a0b-1c2d3e4f5a6b'])).toBe(
      '2f4b7a9e-6c1d-4e8f-9a0b-1c2d3e4f5a6b',
    );
  });

  it.each([undefined, '', 'not-a-uuid', '<script>', 'x'.repeat(500)])(
    'replaces %j with a fresh id',
    (incoming) => {
      const id = resolveRequestId(incoming);
      expect(id).toMatch(/^[0-9a-f-]{36}$/u);
      expect(id).not.toBe(incoming);
    },
  );
});

describe('pathOnly', () => {
  it('drops the query string, which may carry personal data', () => {
    expect(pathOnly('/api/v1/users?email=ayse@example.com')).toBe('/api/v1/users');
    expect(pathOnly('/api/v1/health')).toBe('/api/v1/health');
    expect(pathOnly(undefined)).toBe('');
  });
});

describe('buildPinoHttpOptions', () => {
  const base = { level: 'debug', pretty: true, quietPaths: ['/api/v1/health/live'] };

  it('uses the configured level and pretty output only when asked', () => {
    expect(buildPinoHttpOptions(base)).toMatchObject({
      level: 'debug',
      transport: { target: 'pino-pretty' },
    });
    expect(buildPinoHttpOptions({ ...base, pretty: false })).not.toHaveProperty('transport');
  });

  it('logs errors and server failures at error level and client errors at warn', () => {
    const level = buildPinoHttpOptions(base).customLogLevel;
    const req = {} as never;
    expect(level?.(req, { statusCode: 200 } as never, undefined)).toBe('info');
    expect(level?.(req, { statusCode: 404 } as never, undefined)).toBe('warn');
    expect(level?.(req, { statusCode: 503 } as never, undefined)).toBe('error');
    expect(level?.(req, { statusCode: 200 } as never, new Error('x'))).toBe('error');
  });

  it('serializes only the request id, method and path', () => {
    const serializers = buildPinoHttpOptions(base).serializers as Record<
      string,
      (value: unknown) => unknown
    >;
    expect(
      serializers.req?.({
        id: 'id-1',
        method: 'GET',
        url: '/api/v1/x?email=a@b.c',
        headers: { cookie: 'c' },
      }),
    ).toEqual({ id: 'id-1', method: 'GET', path: '/api/v1/x' });
    expect(serializers.res?.({ statusCode: 201, headers: {} })).toEqual({ statusCode: 201 });
  });

  it('skips access logs for quiet paths only', () => {
    const autoLogging = buildPinoHttpOptions(base).autoLogging as {
      ignore: (req: { url: string }) => boolean;
    };
    expect(autoLogging.ignore({ url: '/api/v1/health/live' })).toBe(true);
    expect(autoLogging.ignore({ url: '/api/v1/health/live?probe=1' })).toBe(true);
    expect(autoLogging.ignore({ url: '/api/v1/health' })).toBe(false);
    const none = buildPinoHttpOptions({ level: 'info', pretty: false }).autoLogging as {
      ignore: (req: { url: string }) => boolean;
    };
    expect(none.ignore({ url: '/api/v1/health/live' })).toBe(false);
  });

  it('sets the request id header on the response', () => {
    const genReqId = buildPinoHttpOptions(base).genReqId as (req: unknown, res: unknown) => string;
    const headers: Record<string, string> = {};
    const id = genReqId(
      { headers: {} },
      { setHeader: (name: string, value: string) => (headers[name] = value) },
    );
    expect(headers['x-request-id']).toBe(id);
  });
});
