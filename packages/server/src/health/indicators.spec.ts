import { describe, expect, it, vi } from 'vitest';
import { ChainHealthIndicator, PingHealthIndicator, RpcChainMismatchError } from './indicators.js';

const signal = new AbortController().signal;

describe('PingHealthIndicator', () => {
  it('passes the abort signal to the round trip and resolves when it succeeds', async () => {
    const ping = vi.fn(() => Promise.resolve('PONG'));
    const indicator = new PingHealthIndicator('redis', ping);
    expect(indicator.name).toBe('redis');
    await expect(indicator.check(signal)).resolves.toBeUndefined();
    expect(ping).toHaveBeenCalledWith(signal);
  });

  it('rejects when the round trip fails', async () => {
    const indicator = new PingHealthIndicator('database', () => Promise.reject(new Error('down')));
    await expect(indicator.check(signal)).rejects.toThrow('down');
  });
});

describe('ChainHealthIndicator (golden rule 5)', () => {
  it('is healthy when the endpoint serves the expected chain', async () => {
    const indicator = new ChainHealthIndicator(() => Promise.resolve(31337), 31337);
    expect(indicator.name).toBe('chain');
    await expect(indicator.check(signal)).resolves.toBeUndefined();
  });

  it('fails with a state word, never the URL, when the endpoint serves another chain', async () => {
    const indicator = new ChainHealthIndicator(() => Promise.resolve(43114), 31337);
    const error = await indicator.check(signal).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(RpcChainMismatchError);
    expect(error).toMatchObject({
      state: 'wrong_chain',
      actualChainId: 43114,
      expectedChainId: 31337,
    });
    expect((error as Error).message).toBe('RPC reports chain 43114, expected 31337');
  });
});
