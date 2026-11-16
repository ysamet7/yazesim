import { Inject, Injectable, Logger } from '@nestjs/common';
import { scrubUrls } from '../logging/scrub.js';
import {
  HEALTH_INDICATORS,
  UnexpectedDependencyStateError,
  type HealthIndicator,
} from './health-indicator.js';

export type CheckStatus = 'ok' | 'error';
export type FailureReason = 'timeout' | 'unavailable' | 'unexpected_state';

export interface CheckResult {
  readonly status: CheckStatus;
  readonly latencyMs: number;
  readonly reason?: FailureReason;
  /** What the indicator reported about itself (`IndicatorState`). */
  readonly state?: string;
}

export interface HealthReport {
  readonly status: CheckStatus;
  readonly uptimeSeconds: number;
  readonly checks: Readonly<Record<string, CheckResult>>;
}

/** Per-dependency budget; readiness must answer quickly even when a dependency hangs. */
export const CHECK_TIMEOUT_MS = 2_000;
/**
 * Readiness results are shared for this long. The endpoint is public, so a
 * request flood must not turn into a flood of database, Redis, RPC and S3 calls.
 */
export const CACHE_TTL_MS = 2_000;

class CheckTimeoutError extends Error {
  override readonly name = 'CheckTimeoutError';
}

/** Strips URLs (an RPC URL may embed a provider API key) before an error message is logged. */
export function sanitizeErrorMessage(message: string): string {
  return scrubUrls(message).slice(0, 300);
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private cached:
    { readonly expiresAt: number; readonly report: Promise<HealthReport> } | undefined;

  constructor(@Inject(HEALTH_INDICATORS) private readonly indicators: readonly HealthIndicator[]) {}

  /** Runs every indicator in parallel; concurrent and repeated calls share one run per TTL window. */
  check(): Promise<HealthReport> {
    const now = Date.now();
    if (this.cached !== undefined && this.cached.expiresAt > now) return this.cached.report;
    const report = this.runAll();
    this.cached = { expiresAt: now + CACHE_TTL_MS, report };
    return report;
  }

  private async runAll(): Promise<HealthReport> {
    const results = await Promise.all(
      this.indicators.map(
        async (indicator) => [indicator.name, await this.runOne(indicator)] as const,
      ),
    );
    const checks = Object.fromEntries(results);
    const status: CheckStatus = results.every(([, result]) => result.status === 'ok')
      ? 'ok'
      : 'error';
    return { status, uptimeSeconds: Math.floor(process.uptime()), checks };
  }

  private async runOne(indicator: HealthIndicator): Promise<CheckResult> {
    const started = performance.now();
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new CheckTimeoutError(`${indicator.name} check exceeded ${CHECK_TIMEOUT_MS} ms`));
      }, CHECK_TIMEOUT_MS);
    });
    try {
      const result = await Promise.race([indicator.check(controller.signal), timeout]);
      return {
        status: 'ok',
        latencyMs: Math.round(performance.now() - started),
        ...(result?.state === undefined ? {} : { state: result.state }),
      };
    } catch (error) {
      const reason: FailureReason =
        error instanceof CheckTimeoutError
          ? 'timeout'
          : error instanceof UnexpectedDependencyStateError
            ? 'unexpected_state'
            : 'unavailable';
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.warn(
        {
          check: indicator.name,
          reason,
          err: { name: err.name, message: sanitizeErrorMessage(err.message) },
        },
        'Readiness check failed',
      );
      const state = error instanceof UnexpectedDependencyStateError ? error.state : undefined;
      return {
        status: 'error',
        latencyMs: Math.round(performance.now() - started),
        reason,
        ...(state === undefined ? {} : { state }),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
