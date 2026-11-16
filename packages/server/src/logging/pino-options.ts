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
import { pino, type LoggerOptions } from 'pino';
import type { Options } from 'pino-http';
import { REDACTED, scrubError, scrubField, scrubFreeText, scrubLogValue } from './scrub.js';

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

/** `err` and other non-Error values logged under `err` are scrubbed alike. */
function serializeError(error: unknown): unknown {
  return error instanceof Error ? scrubError(error) : scrubLogValue(error);
}

/** Scrubs every logged object except top-level keys that a serializer of our own reduces. */
function scrubMergeObject(
  object: Record<string, unknown>,
  serializedKeys: ReadonlySet<string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(object)) {
    result[key] = serializedKeys.has(key) ? value : scrubField(key, value);
  }
  return result;
}

/**
 * pino serializes `logger.child({ … })` bindings once, into a JSON fragment,
 * without calling `formatters.bindings`. This re-scrubs that fragment.
 */
function scrubChildBindings(child: pino.Logger): void {
  const holder = child as unknown as Record<symbol, unknown>;
  const fragment = holder[pino.symbols.chindingsSym];
  if (typeof fragment !== 'string' || fragment === '') return;
  const bindings = JSON.parse(`{${fragment.slice(1)}}`) as Record<string, unknown>;
  const scrubbed = JSON.stringify(scrubLogValue(bindings));
  holder[pino.symbols.chindingsSym] = `,${scrubbed.slice(1, -1)}`;
}

function loggerOptions(level: string, serializedKeys: ReadonlySet<string>): LoggerOptions {
  return {
    level,
    redact: { paths: [...REDACT_PATHS], censor: REDACTED },
    formatters: {
      log: (object) => scrubMergeObject(object, serializedKeys),
      // Root bindings (`base`); child bindings are scrubbed in `onChild`.
      bindings: (bindings) => scrubLogValue(bindings) as Record<string, unknown>,
    },
    hooks: {
      // The message and its interpolation values never pass through
      // `formatters.log`: `logger.info(`sent to ${email}`)` is scrubbed here.
      logMethod(args, method) {
        const scrubbed = args.map((arg, index) => {
          if (typeof arg === 'string') return scrubFreeText(arg);
          // The first object is the merge object, scrubbed by `formatters.log`.
          return index === 0 ? arg : scrubLogValue(arg);
        }) as Parameters<typeof method>;
        method.apply(this, scrubbed);
      },
    },
    onChild: scrubChildBindings,
    serializers: { err: serializeError },
  };
}

/**
 * Logger-level options shared by every YazeSim logger: header redaction, key
 * pattern scrubbing of every logged object, of child bindings and of the
 * message text, and URL-free error serialization.
 */
export function buildLoggerOptions(level: string): LoggerOptions {
  return loggerOptions(level, new Set(['err']));
}

export function buildPinoHttpOptions(options: HttpLoggingOptions): Options {
  const quietPaths = new Set(options.quietPaths ?? []);
  // `req` and `res` are raw Node objects, reduced by the serializers below.
  const base = loggerOptions(options.level, new Set(['err', 'req', 'res']));
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
