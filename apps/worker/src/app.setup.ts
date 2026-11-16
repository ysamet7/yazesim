/** HTTP settings shared by `main.ts` and the end-to-end tests. */
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

export function configureApp(app: NestExpressApplication): void {
  app.useLogger(app.get(Logger));
  app.flushLogs();
  app.disable('x-powered-by');
  // Health endpoints only: nothing may be framed, scripted or loaded from a response.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"] },
      },
    }),
  );
}
