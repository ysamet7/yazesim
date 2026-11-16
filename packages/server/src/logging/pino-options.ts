/**
 * Structured logging (CLAUDE.md golden rules 1 and 7: no secret, personal data or
 * chat content in logs).
 *
 * - Sensitive fields are redacted wherever they appear in a logged object,
 *   matched by key pattern at any depth; errors are logged without URLs.
 * - Request URLs are logged without their query string, which can carry
 *   personal data (e-mail, phone) or tokens.
 * - Every request gets an id; a valid incoming `x-request-id` is reused so a
 *   request can be traced across the web app, API and workers.
 */
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { LoggerOptions } from 'pino';
import type { Options } from 'pino-http';
import { REDACTED, scrubError, scrubLogValue } from './scrub.js';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Header paths redacted by pino itself. Everything else is scrubbed by key
 * pattern at any depth (`scrubLogValue`), which also covers these headers if
 * they are ever logged outside a request object.
 */
export const REDACT_PATHS: readonly string[] = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-csrf-token"]',
  'res.headers["set-cookie"]',
];

export { REDACTED };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

/** Reuses a well-formed incoming request id, otherwise generates one. */
export function resolveRequestId(incoming: string | string[] | undefined): string {
  const value = Array.isArray(incoming) ? incoming[0] : incoming;
  return value !== undefined && UUID.test(value) ? value.toLowerCase() : randomUUID();
}

/** Drops the query string; only the path is logged. */
export function pathOnly(url: string | undefined): string {
  if (url === undefined) return '';
  const index = url.indexOf('?');
  return index === -1 ? url : url.slice(0, index);
}

export interface HttpLoggingOptions {
  /** pino level (fatal … trace, silent). */
  readonly level: string;
  /** Human-readable single-line output; only for local development. */
  readonly pretty: boolean;
  /** Paths whose successful access logs are skipped (e.g. liveness probes). */
  readonly quietPaths?: readonly string[];
}

/**
 * Logger-level options shared by every YazeSim logger: header redaction, key
 * pattern scrubbing of every logged object and URL-free error serialization.
 */
export function buildLoggerOptions(level: string): LoggerOptions {
  return {
    level,
    redact: { paths: [...REDACT_PATHS], censor: REDACTED },
    formatters: {
      log: (object) => scrubLogValue(object) as Record<string, unknown>,
    },
    serializers: {
      err: (error: unknown) => (error instanceof Error ? scrubError(error) : error),
    },
  };
}

export function buildPinoHttpOptions(options: HttpLoggingOptions): Options {
  const quietPaths = new Set(options.quietPaths ?? []);
  const base = buildLoggerOptions(options.level);
  return {
    ...base,
    genReqId: (req: IncomingMessage, res: ServerResponse) => {
      const id = resolveRequestId(req.headers[REQUEST_ID_HEADER]);
      res.setHeader(REQUEST_ID_HEADER, id);
      return id;
    },
    autoLogging: {
      ignore: (req) => quietPaths.has(pathOnly(req.url)),
    },
    customLogLevel: (_req, res, error) => {
      if (error !== undefined || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    serializers: {
      ...base.serializers,
      req: (req: { id: string; method: string; url: string }) => ({
        id: req.id,
        method: req.method,
        path: pathOnly(req.url),
      }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
    ...(options.pretty
      ? {
          transport: {
            target: 'pino-pretty',
            options: { singleLine: true, translateTime: 'SYS:HH:MM:ss' },
          },
        }
      : {}),
  };
}
