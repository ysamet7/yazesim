/**
 * Error codes shared by the API, the worker and the web app.
 *
 * Every API error body has the shape `{ code, message, details?, requestId? }`.
 * `message` is a message key (`errors.<CODE>`): the web app shows the Turkish
 * text from its catalogue, so no user-facing copy lives in the API. Codes are
 * added in the phase that first needs them (credits in phase 3, chat in 4).
 */
import { z } from 'zod';

export const ErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  CHAIN_NOT_SUPPORTED: 'CHAIN_NOT_SUPPORTED',
  MAINNET_LOCKED: 'MAINNET_LOCKED',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

const HTTP_STATUS: Readonly<Record<ErrorCode, number>> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  CHAIN_NOT_SUPPORTED: 400,
  // Golden rule 5: mainnet needs an explicit opt-in.
  MAINNET_LOCKED: 403,
};

export function httpStatusForErrorCode(code: ErrorCode): number {
  return HTTP_STATUS[code];
}

export type ErrorMessageKey = `errors.${ErrorCode}`;

export function errorMessageKey(code: ErrorCode): ErrorMessageKey {
  return `errors.${code}`;
}

const errorCodeSchema = z.enum(ErrorCode);

export const apiErrorBodySchema = z.strictObject({
  code: errorCodeSchema,
  message: z.string().regex(/^errors\.[A-Z][A-Z0-9_]*$/u),
  details: z.unknown().optional(),
  requestId: z.string().optional(),
});

export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;
