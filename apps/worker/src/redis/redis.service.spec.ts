import { Logger } from '@nestjs/common';
import type { WorkerEnv } from '@yazesim/shared/env';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { REDIS_READY_TIMEOUT_MS, RedisService } from './redis.service.js';

// Nothing listens on port 1: the client never becomes ready.
const env = { REDIS_URL: 'redis://:unused@127.0.0.1:1' } as WorkerEnv;

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('RedisService', () => {
  it('logs connection errors at most once per interval and again after recovery', async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const service = new RedisService(env);
    service.client.disconnect();
    warn.mockClear();

    service.client.emit('error', new Error('ECONNREFUSED'));
    service.client.emit('error', new Error('ECONNREFUSED'));
    expect(warn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(30_001);
    service.client.emit('error', new Error('ECONNREFUSED'));
    expect(warn).toHaveBeenCalledTimes(2);

    service.client.emit('ready');
    service.client.emit('error', new Error('ECONNREFUSED'));
    expect(warn).toHaveBeenCalledTimes(3);

    await service.onModuleDestroy();
  });

  it('bounds connection and command time so a stalled Redis never holds a request', async () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const service = new RedisService(env);
    expect(service.client.options).toMatchObject({
      connectTimeout: 2_000,
      commandTimeout: 2_000,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });
    await service.onModuleDestroy();
  });

  it('disconnects without QUIT when the connection was never ready', async () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const service = new RedisService(env);
    const quit = vi.spyOn(service.client, 'quit');
    const disconnect = vi.spyOn(service.client, 'disconnect');
    await service.onModuleDestroy();
    expect(quit).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalled();
  });

  it('waits for the first connection at startup, but not longer than the timeout', async () => {
    vi.useFakeTimers();
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const service = new RedisService(env);
    let started = false;
    const init = service.onModuleInit().then(() => {
      started = true;
    });
    await vi.advanceTimersByTimeAsync(REDIS_READY_TIMEOUT_MS - 1);
    expect(started).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await init;
    expect(started).toBe(true);
    await service.onModuleDestroy();
  });

  it('starts as soon as the connection is ready', async () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const service = new RedisService(env);
    const init = service.onModuleInit();
    service.client.emit('ready');
    await init;
    Object.defineProperty(service.client, 'status', { value: 'ready' });
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    service.client.disconnect();
  });
});
