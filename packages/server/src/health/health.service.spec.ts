import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { UnexpectedDependencyStateError, type HealthIndicator } from './health-indicator.js';
import {
  CACHE_TTL_MS,
  CHECK_TIMEOUT_MS,
  HealthService,
  sanitizeErrorMessage,
} from './health.service.js';

function indicator(
  name: string,
  check: HealthIndicator['check'],
): { readonly name: string; readonly check: Mock<HealthIndicator['check']> } {
  return { name, check: vi.fn(check) };
}

const ok = (): Promise<undefined> => Promise.resolve(undefined);

beforeEach(() => {
  vi.useFakeTimers();
  // Failed checks are logged by design; keep test output readable.
  vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('HealthService', () => {
  it('reports ok when every dependency is usable', async () => {
    const service = new HealthService([indicator('database', ok), indicator('redis', ok)]);
    const report = await service.check();
    expect(report.status).toBe('ok');
    expect(Object.keys(report.checks)).toEqual(['database', 'redis']);
    expect(report.checks.database).toMatchObject({ status: 'ok' });
  });

  it('classifies failures without exposing error messages', async () => {
    const service = new HealthService([
      indicator('database', ok),
      indicator('redis', () => Promise.reject(new Error('ECONNREFUSED 127.0.0.1:6379'))),
      indicator('chain', () =>
        Promise.reject(new UnexpectedDependencyStateError('chain 1, expected 31337')),
      ),
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- verifies non-Error rejections are handled
      indicator('storage', () => Promise.reject('not even an Error')),
    ]);
    const report = await service.check();
    expect(report.status).toBe('error');
    expect(report.checks.database?.status).toBe('ok');
    expect(report.checks.redis).toMatchObject({ status: 'error', reason: 'unavailable' });
    expect(report.checks.chain).toMatchObject({ status: 'error', reason: 'unexpected_state' });
    expect(report.checks.storage).toMatchObject({ status: 'error', reason: 'unavailable' });
    expect(JSON.stringify(report)).not.toContain('ECONNREFUSED');
  });

  it('shows the state an indicator reports, healthy or not', async () => {
    const service = new HealthService([
      indicator('worker', () => Promise.resolve({ state: 'standby' })),
      indicator('database', ok),
      indicator('lag', () =>
        Promise.reject(new UnexpectedDependencyStateError('300 s behind', 'lagging')),
      ),
    ]);
    const report = await service.check();
    expect(report.checks).toEqual({
      worker: { status: 'ok', latencyMs: expect.any(Number) as number, state: 'standby' },
      database: { status: 'ok', latencyMs: expect.any(Number) as number },
      lag: {
        status: 'error',
        latencyMs: expect.any(Number) as number,
        reason: 'unexpected_state',
        state: 'lagging',
      },
    });
    expect(JSON.stringify(report)).not.toContain('300 s');
  });

  it('times out a hanging dependency and aborts its signal', async () => {
    let signal: AbortSignal | undefined;
    const hanging = indicator('chain', (s) => {
      signal = s;
      return new Promise<undefined>(() => undefined);
    });
    const service = new HealthService([hanging, indicator('database', ok)]);
    const pending = service.check();
    await vi.advanceTimersByTimeAsync(CHECK_TIMEOUT_MS);
    const report = await pending;
    expect(report.checks.chain).toMatchObject({ status: 'error', reason: 'timeout' });
    expect(report.checks.database?.status).toBe('ok');
    expect(signal?.aborted).toBe(true);
  });

  it('shares one run between concurrent and repeated calls within the TTL', async () => {
    const database = indicator('database', ok);
    const service = new HealthService([database]);
    const [a, b] = await Promise.all([service.check(), service.check()]);
    await service.check();
    expect(a).toBe(b);
    expect(database.check).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(CACHE_TTL_MS + 1);
    await service.check();
    expect(database.check).toHaveBeenCalledTimes(2);
  });
});

describe('sanitizeErrorMessage', () => {
  it('removes URLs that may carry credentials or provider keys', () => {
    expect(
      sanitizeErrorMessage(
        'HTTP request failed. URL: https://avax.example/v3/abcdef123 Status: 401',
      ),
    ).toBe('HTTP request failed. URL: [url] Status: 401');
    expect(sanitizeErrorMessage('connect to postgresql://u:p@db:5432/x failed')).toBe(
      'connect to [url] failed',
    );
  });

  it('truncates very long messages', () => {
    expect(sanitizeErrorMessage('x'.repeat(1_000))).toHaveLength(300);
  });
});
