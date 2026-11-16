/**
 * HTTP hardening and conventions shared by `main.ts` and the end-to-end tests,
 * so tests exercise exactly what production runs.
 */
import type { NestExpressApplication } from '@nestjs/platform-express';
import { REQUEST_ID_HEADER } from '@yazesim/server';
import type { ApiEnv } from '@yazesim/shared/env';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

export const API_PREFIX = 'api/v1';

/** JSON API: nothing may be framed, scripted or loaded from a response. */
const apiHeaders = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"] },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
});

export function configureApp(app: NestExpressApplication, env: ApiEnv): void {
  app.useLogger(app.get(Logger));
  app.flushLogs();
  app.disable('x-powered-by');
  if (env.TRUST_PROXY) app.set('trust proxy', 1);

  app.use((req: Request, res: Response, next: NextFunction) => {
    // Nothing is cached unless a route says so: responses carry sessions and personal data.
    res.setHeader('Cache-Control', 'no-store');
    apiHeaders(req, res, next);
  });

  app.enableCors({
    origin: [...env.CORS_ORIGINS],
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['content-type', 'x-csrf-token', REQUEST_ID_HEADER],
    // Retry-After tells the web app how long a rate-limited action must wait.
    exposedHeaders: [REQUEST_ID_HEADER, 'retry-after'],
    maxAge: 600,
  });

  app.setGlobalPrefix(API_PREFIX);
}
