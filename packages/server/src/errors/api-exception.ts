import { HttpException } from '@nestjs/common';
import { httpStatusForErrorCode, type ErrorCode } from '@yazesim/shared/errors';

/**
 * The only exception type application code should throw for expected failures.
 * Its code becomes the `code` of the error body and selects the HTTP status;
 * the message key and request id are added by `AllExceptionsFilter`.
 */
export class ApiException extends HttpException {
  readonly code: ErrorCode;
  readonly details: unknown;

  constructor(code: ErrorCode, details?: unknown) {
    super(code, httpStatusForErrorCode(code));
    this.code = code;
    this.details = details;
  }
}
