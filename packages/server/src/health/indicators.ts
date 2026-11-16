import { UnexpectedDependencyStateError, type HealthIndicator } from './health-indicator.js';

/** A dependency that is healthy when a cheap round trip succeeds (SELECT 1, PING). */
export class PingHealthIndicator implements HealthIndicator {
  readonly name: string;
  private readonly ping: (signal: AbortSignal) => Promise<unknown>;

  constructor(name: string, ping: (signal: AbortSignal) => Promise<unknown>) {
    this.name = name;
    this.ping = ping;
  }

  async check(signal: AbortSignal): Promise<undefined> {
    await this.ping(signal);
  }
}

/**
 * Raised when the RPC endpoint serves another chain than configured. Such an
 * endpoint must never be used: it could point at mainnet (golden rule 5). The
 * message names the chain ids only, never the URL, which may embed a key.
 */
export class RpcChainMismatchError extends UnexpectedDependencyStateError {
  readonly actualChainId: number;
  readonly expectedChainId: number;

  constructor(actualChainId: number, expectedChainId: number) {
    super(
      `RPC reports chain ${String(actualChainId)}, expected ${String(expectedChainId)}`,
      'wrong_chain',
    );
    this.actualChainId = actualChainId;
    this.expectedChainId = expectedChainId;
  }
}

/** Healthy when the configured RPC endpoint answers for the expected chain. */
export class ChainHealthIndicator implements HealthIndicator {
  readonly name = 'chain';
  private readonly getChainId: (signal: AbortSignal) => Promise<number>;
  private readonly expectedChainId: number;

  constructor(getChainId: (signal: AbortSignal) => Promise<number>, expectedChainId: number) {
    this.getChainId = getChainId;
    this.expectedChainId = expectedChainId;
  }

  async check(signal: AbortSignal): Promise<undefined> {
    const actual = await this.getChainId(signal);
    if (actual !== this.expectedChainId) {
      throw new RpcChainMismatchError(actual, this.expectedChainId);
    }
  }
}
