/** A dependency the API needs to serve traffic (database, cache, chain, storage). */
export interface HealthIndicator {
  /** Stable key used in the readiness report. */
  readonly name: string;
  /**
   * Resolves when the dependency is usable; rejects otherwise. Implementations
   * should honour `signal` where the client supports cancellation. May resolve
   * with a short state word the report shows (e.g. a worker: `active`, `standby`).
   */
  check(signal: AbortSignal): Promise<IndicatorState | undefined>;
}

/** A short state word for the readiness report: never a message, the API's report is public. */
export interface IndicatorState {
  readonly state: string;
}

/** Injection token for the list of indicators the readiness check runs. */
export const HEALTH_INDICATORS = Symbol('HEALTH_INDICATORS');

/** Raised by an indicator when the dependency answers but is not the expected one. */
export class UnexpectedDependencyStateError extends Error {
  override readonly name = 'UnexpectedDependencyStateError';

  /** `state`: shown in the readiness report, see {@link IndicatorState}. */
  constructor(
    message: string,
    readonly state?: string,
  ) {
    super(message);
  }
}
