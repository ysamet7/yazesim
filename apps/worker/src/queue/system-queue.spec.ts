import { describe, expect, it } from 'vitest';
import { closeWithin, processSystemJob } from './system-queue.js';

describe('processSystemJob', () => {
  it('answers ping', () => {
    expect(processSystemJob({ name: 'ping' })).toEqual({ pong: true });
  });

  it('fails unknown jobs instead of dropping them', () => {
    expect(() => processSystemJob({ name: 'mystery' })).toThrow('Unknown system job: mystery');
  });
});

describe('closeWithin', () => {
  it('waits for a close that finishes in time', async () => {
    let disconnected = false;
    const finished = await closeWithin(
      () => Promise.resolve(),
      () => {
        disconnected = true;
        return Promise.resolve();
      },
      1_000,
    );
    expect(finished).toBe(true);
    expect(disconnected).toBe(false);
  });

  it('disconnects when close hangs past the grace period', async () => {
    let disconnected = false;
    const finished = await closeWithin(
      () => new Promise<void>(() => undefined),
      () => {
        disconnected = true;
        return Promise.resolve();
      },
      10,
    );
    expect(finished).toBe(false);
    expect(disconnected).toBe(true);
  });
});
