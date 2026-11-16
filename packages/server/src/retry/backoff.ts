export interface BackoffOptions {
  /** Upper bound of the first delay. */
  readonly initialMs?: number;
  /** No delay is longer than this. */
  readonly maxMs?: number;
  /** Growth of the upper bound per failure. */
  readonly factor?: number;
  /** A number in [0, 1); `Math.random` by default (tests pass their own). */
  readonly random?: () => number;
}

/**
 * Exponential backoff with full jitter: after the n-th consecutive failure the
 * wait is drawn uniformly from [0, min(maxMs, initialMs × factor^(n−1))). The
 * jitter keeps restarted processes from hitting a recovering RPC in lockstep.
 * `reset()` after a success starts over.
 */
export class Backoff {
  private readonly initialMs: number;
  private readonly maxMs: number;
  private readonly factor: number;
  private readonly random: () => number;
  private failures = 0;

  constructor(options: BackoffOptions = {}) {
    this.initialMs = options.initialMs ?? 1_000;
    this.maxMs = options.maxMs ?? 60_000;
    this.factor = options.factor ?? 2;
    this.random = options.random ?? Math.random;
    if (!(this.initialMs > 0 && this.maxMs >= this.initialMs && this.factor >= 1)) {
      throw new RangeError('Backoff needs 0 < initialMs <= maxMs and factor >= 1');
    }
  }

  /** Consecutive failures since the last reset. */
  get attempts(): number {
    return this.failures;
  }

  /** Records a failure and returns how long to wait before the next try, in ms. */
  next(): number {
    this.failures += 1;
    const ceiling = Math.min(this.maxMs, this.initialMs * this.factor ** (this.failures - 1));
    return Math.floor(this.random() * ceiling);
  }

  reset(): void {
    this.failures = 0;
  }
}
