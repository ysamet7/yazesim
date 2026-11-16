import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { ErrorCode, errorMessageKey, type ApiErrorBody } from '@yazesim/shared/errors';
import type { Response } from 'express';
import { ApiException } from './api-exception.js';

const CODE_BY_STATUS: ReadonlyMap<number, ErrorCode> = new Map([
  [HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_FAILED],
  [HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHENTICATED],
  [HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN],
  [HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND],
  [HttpStatus.METHOD_NOT_ALLOWED, ErrorCode.NOT_FOUND],
  [HttpStatus.CONFLICT, ErrorCode.CONFLICT],
  [HttpStatus.PAYLOAD_TOO_LARGE, ErrorCode.PAYLOAD_TOO_LARGE],
  [HttpStatus.UNSUPPORTED_MEDIA_TYPE, ErrorCode.VALIDATION_FAILED],
  [HttpStatus.UNPROCESSABLE_ENTITY, ErrorCode.VALIDATION_FAILED],
  [HttpStatus.TOO_MANY_REQUESTS, ErrorCode.RATE_LIMITED],
  [HttpStatus.SERVICE_UNAVAILABLE, ErrorCode.SERVICE_UNAVAILABLE],
]);

interface Classified {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: unknown;
}

/** `type` values body-parser (raw-body, http-errors) sets on the client errors it raises. */
const BODY_PARSER_ERROR_TYPES: ReadonlySet<string> = new Set([
  'charset.unsupported',
  'encoding.unsupported',
  'entity.parse.failed',
  'entity.too.large',
  'entity.verify.failed',
  'parameters.too.many',
  'request.aborted',
  'request.size.invalid',
]);

/**
 * Errors raised by Express body parsing carry an HTTP status but are not
 * HttpExceptions. Only those are trusted: other libraries (viem, HTTP clients)
 * put the *upstream* service's status on their errors, which must stay a
 * logged 500.
 */
function statusOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const { status, expose, type } = error as { status?: unknown; expose?: unknown; type?: unknown };
  const isBodyParserError =
    expose === true && typeof type === 'string' && BODY_PARSER_ERROR_TYPES.has(type);
  return isBodyParserError && typeof status === 'number' && status >= 400 && status < 500
    ? status
    : undefined;
}

export function classifyException(exception: unknown): Classified {
  if (exception instanceof ApiException) {
    return {
      status: exception.getStatus(),
      code: exception.code,
      ...(exception.details === undefined ? {} : { details: exception.details }),
    };
  }
  const status = exception instanceof HttpException ? exception.getStatus() : statusOf(exception);
  if (status === undefined || status >= 500) {
    const code =
      status === HttpStatus.SERVICE_UNAVAILABLE
        ? ErrorCode.SERVICE_UNAVAILABLE
        : ErrorCode.INTERNAL_ERROR;
    return { status: status ?? HttpStatus.INTERNAL_SERVER_ERROR, code };
  }
  return { status, code: CODE_BY_STATUS.get(status) ?? ErrorCode.VALIDATION_FAILED };
}

/** Whole seconds a rate-limited client must wait, when the error says so. */
function retryAfterSeconds(code: ErrorCode, details: unknown): number | undefined {
  if (code !== ErrorCode.RATE_LIMITED || typeof details !== 'object' || details === null) {
    return undefined;
  }
  const { retryAfterSeconds: seconds } = details as { retryAfterSeconds?: unknown };
  return typeof seconds === 'number' && Number.isInteger(seconds) && seconds > 0
    ? seconds
    : undefined;
}

/**
 * Turns every error into the documented body `{ code, message, details?, requestId }`
 * Internal error messages and stack traces are logged, never returned.
 * A `RATE_LIMITED` error with `details.retryAfterSeconds` also sends `Retry-After`.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    // pino-http assigns the id; read it defensively so a missing id never breaks error handling.
    const { id } = context.getRequest<{ id?: unknown }>();
    const requestId = typeof id === 'string' ? id : undefined;
    const response = context.getResponse<Response>();
    const { status, code, details } = classifyException(exception);

    if (status >= 500 && code === ErrorCode.INTERNAL_ERROR) {
      this.logger.error(
        { err: exception, requestId },
        'Unhandled exception while processing request',
      );
    }

    const retryAfter = retryAfterSeconds(code, details);
    if (retryAfter !== undefined) response.setHeader('Retry-After', String(retryAfter));

    const body: ApiErrorBody = {
      code,
      message: errorMessageKey(code),
      ...(details === undefined ? {} : { details }),
      ...(requestId === undefined ? {} : { requestId }),
    };
    response.status(status).json(body);
  }
}
