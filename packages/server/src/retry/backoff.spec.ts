import { describe, expect, it } from 'vitest';
import { Backoff } from './backoff.js';

describe('Backoff', () => {
  it('doubles the ceiling per failure up to the maximum', () => {
    // A random source just below 1 shows each ceiling.
    const backoff = new Backoff({ initialMs: 1_000, maxMs: 60_000, random: () => 0.999_999 });
    const delays = Array.from({ length: 9 }, () => backoff.next());
    expect(delays).toEqual([999, 1_999, 3_999, 7_999, 15_999, 31_999, 59_999, 59_999, 59_999]);
    expect(backoff.attempts).toBe(9);
  });

  it('draws each wait uniformly below the ceiling (full jitter)', () => {
    const draws = [0, 0.5, 0.25];
    const backoff = new Backoff({ initialMs: 1_000, random: () => draws.shift() ?? 0 });
    expect([backoff.next(), backoff.next(), backoff.next()]).toEqual([0, 1_000, 1_000]);
  });

  it('starts over after a reset', () => {
    const backoff = new Backoff({ initialMs: 100, random: () => 0.999_999 });
    backoff.next();
    backoff.next();
    backoff.reset();
    expect(backoff.attempts).toBe(0);
    expect(backoff.next()).toBe(99);
  });

  it('uses 1 s to 60 s by default and stays in range with Math.random', () => {
    const backoff = new Backoff();
    for (let i = 0; i < 20; i += 1) {
      const delay = backoff.next();
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThan(60_000);
    }
  });

  it.each([{ initialMs: 0 }, { initialMs: 2_000, maxMs: 1_000 }, { factor: 0.5 }])(
    'refuses %o',
    (options) => {
      expect(() => new Backoff(options)).toThrow(RangeError);
    },
  );
});
