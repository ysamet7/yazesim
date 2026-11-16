import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  type ArgumentsHost,
} from '@nestjs/common';
import { ErrorCode, apiErrorBodySchema } from '@yazesim/shared/errors';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AllExceptionsFilter, classifyException } from './all-exceptions.filter.js';
import { ApiException } from './api-exception.js';

function hostFor(requestId?: string) {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const setHeader = vi.fn();
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ id: requestId }),
      getResponse: () => ({ status, setHeader }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json, setHeader };
}

describe('classifyException', () => {
  it('uses the code and details of an ApiException', () => {
    expect(classifyException(new ApiException(ErrorCode.CONFLICT, { field: 'orderRef' }))).toEqual({
      status: 409,
      code: 'CONFLICT',
      details: { field: 'orderRef' },
    });
  });

  it.each([
    [new BadRequestException(), 400, 'VALIDATION_FAILED'],
    [new HttpException('x', HttpStatus.UNAUTHORIZED), 401, 'UNAUTHENTICATED'],
    [new ForbiddenException(), 403, 'FORBIDDEN'],
    [new NotFoundException(), 404, 'NOT_FOUND'],
    [new HttpException('x', HttpStatus.METHOD_NOT_ALLOWED), 405, 'NOT_FOUND'],
    [new PayloadTooLargeException(), 413, 'PAYLOAD_TOO_LARGE'],
    [new HttpException('x', HttpStatus.TOO_MANY_REQUESTS), 429, 'RATE_LIMITED'],
    [new HttpException('x', HttpStatus.I_AM_A_TEAPOT), 418, 'VALIDATION_FAILED'],
    [new ServiceUnavailableException(), 503, 'SERVICE_UNAVAILABLE'],
    [new HttpException('x', HttpStatus.BAD_GATEWAY), 502, 'INTERNAL_ERROR'],
  ])('maps %o to %i %s', (exception, status, code) => {
    expect(classifyException(exception)).toEqual({ status, code });
  });

  it('maps body-parser errors by their status', () => {
    // Shape produced by http-errors inside body-parser.
    const tooLarge = Object.assign(new Error('request entity too large'), {
      status: 413,
      statusCode: 413,
      expose: true,
      type: 'entity.too.large',
    });
    expect(classifyException(tooLarge)).toEqual({ status: 413, code: 'PAYLOAD_TOO_LARGE' });
    const badJson = Object.assign(new SyntaxError('Unexpected token'), {
      status: 400,
      statusCode: 400,
      expose: true,
      type: 'entity.parse.failed',
    });
    expect(classifyException(badJson)).toEqual({ status: 400, code: 'VALIDATION_FAILED' });
    const charset = Object.assign(new Error('unsupported charset "UTF-7"'), {
      status: 415,
      expose: true,
      type: 'charset.unsupported',
    });
    expect(classifyException(charset)).toEqual({ status: 415, code: 'VALIDATION_FAILED' });
  });

  it.each([
    new Error('database password is wrong'),
    'string error',
    null,
    { status: 'nope' },
    { status: 200 },
    // Client-library errors carry the *upstream* HTTP status: an
    // expired RPC key must be a logged 500, not "please sign in".
    Object.assign(new Error('HTTP request failed. Status: 401'), {
      name: 'HttpRequestError',
      status: 401,
    }),
    Object.assign(new Error('Request failed with status code 403'), {
      status: 403,
      response: { status: 403 },
    }),
    Object.assign(new Error('rate limited'), { statusCode: 429 }),
    Object.assign(new Error('not found'), { status: 404, expose: true }),
    Object.assign(new Error('spoofed'), { status: 401, expose: true, type: 'auth.failed' }),
    Object.assign(new Error('not exposed'), {
      status: 400,
      expose: false,
      type: 'entity.parse.failed',
    }),
  ])('treats %o as an internal error', (exception) => {
    expect(classifyException(exception)).toEqual({ status: 500, code: 'INTERNAL_ERROR' });
  });
});

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes the documented error body with the request id', () => {
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { host, status, json } = hostFor('2f4b7a9e-6c1d-4e8f-9a0b-1c2d3e4f5a6b');
    filter.catch(new NotFoundException('Cannot GET /x'), host);
    expect(logged).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(404);
    const body: unknown = json.mock.calls[0]?.[0];
    expect(apiErrorBodySchema.parse(body)).toEqual({
      code: 'NOT_FOUND',
      message: 'errors.NOT_FOUND',
      requestId: '2f4b7a9e-6c1d-4e8f-9a0b-1c2d3e4f5a6b',
    });
  });

  it('logs an unexpected error but never returns its message', () => {
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { host, status, json } = hostFor('2f4b7a9e-6c1d-4e8f-9a0b-1c2d3e4f5a6b');
    filter.catch(new Error('connect ECONNREFUSED postgres://yazesim:secret@db'), host);
    expect(logged).toHaveBeenCalledTimes(1);
    expect(status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(json.mock.calls[0]?.[0])).not.toContain('secret');
    expect(json.mock.calls[0]?.[0]).toMatchObject({
      code: 'INTERNAL_ERROR',
      message: 'errors.INTERNAL_ERROR',
    });
  });

  it('includes details from an ApiException and omits a missing request id', () => {
    const { host, json } = hostFor();
    filter.catch(new ApiException(ErrorCode.VALIDATION_FAILED, [{ path: ['amount'] }]), host);
    expect(json.mock.calls[0]?.[0]).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'errors.VALIDATION_FAILED',
      details: [{ path: ['amount'] }],
    });
  });

  it('sends Retry-After with a RATE_LIMITED error that says how long to wait', () => {
    const { host, status, setHeader } = hostFor();
    filter.catch(new ApiException(ErrorCode.RATE_LIMITED, { retryAfterSeconds: 42 }), host);
    expect(status).toHaveBeenCalledWith(429);
    expect(setHeader).toHaveBeenCalledWith('Retry-After', '42');
  });

  it.each([
    [ErrorCode.RATE_LIMITED, undefined],
    [ErrorCode.RATE_LIMITED, { retryAfterSeconds: 0 }],
    [ErrorCode.RATE_LIMITED, { retryAfterSeconds: '42' }],
    [ErrorCode.CONFLICT, { retryAfterSeconds: 42 }],
  ])('sends no Retry-After for %s with %o', (code, details) => {
    const { host, setHeader } = hostFor();
    filter.catch(new ApiException(code, details), host);
    expect(setHeader).not.toHaveBeenCalled();
  });
});
