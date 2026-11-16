import { describe, expect, it } from 'vitest';
import {
  apiErrorBodySchema,
  ErrorCode,
  errorMessageKey,
  httpStatusForErrorCode,
} from './errors.js';

describe('error codes', () => {
  it('maps every code to an HTTP error status', () => {
    for (const code of Object.values(ErrorCode)) {
      const status = httpStatusForErrorCode(code);
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    }
  });

  it('keeps the statuses clients rely on', () => {
    expect(httpStatusForErrorCode(ErrorCode.VALIDATION_FAILED)).toBe(400);
    expect(httpStatusForErrorCode(ErrorCode.UNAUTHENTICATED)).toBe(401);
    expect(httpStatusForErrorCode(ErrorCode.RATE_LIMITED)).toBe(429);
    expect(httpStatusForErrorCode(ErrorCode.SERVICE_UNAVAILABLE)).toBe(503);
    expect(httpStatusForErrorCode(ErrorCode.MAINNET_LOCKED)).toBe(403);
  });

  it('names a message key for each code', () => {
    expect(errorMessageKey(ErrorCode.NOT_FOUND)).toBe('errors.NOT_FOUND');
  });
});

describe('apiErrorBodySchema', () => {
  it('accepts the documented body', () => {
    const body = {
      code: 'VALIDATION_FAILED',
      message: 'errors.VALIDATION_FAILED',
      details: { issues: [] },
      requestId: '2f4b7a9e-6c1d-4e8f-9a0b-1c2d3e4f5a6b',
    };
    expect(apiErrorBodySchema.parse(body)).toEqual(body);
  });

  it('rejects unknown codes, free-text messages and extra fields', () => {
    expect(apiErrorBodySchema.safeParse({ code: 'NOPE', message: 'errors.NOPE' }).success).toBe(
      false,
    );
    expect(apiErrorBodySchema.safeParse({ code: 'NOT_FOUND', message: 'Bulunamadı' }).success).toBe(
      false,
    );
    expect(
      apiErrorBodySchema.safeParse({
        code: 'NOT_FOUND',
        message: 'errors.NOT_FOUND',
        stack: 'Error: at …',
      }).success,
    ).toBe(false);
  });
});
