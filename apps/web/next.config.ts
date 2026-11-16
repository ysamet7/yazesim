import { findPublicSecretNames, parseEnv, webEnvSchema } from '@yazesim/shared/env';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { securityHeaders } from './src/security-headers';

// Golden rule 2: Next.js inlines every NEXT_PUBLIC_* variable into the browser
// bundle, which anyone can download. A public variable named like a secret
// stops `next dev` and `next build` before anything is bundled.
const leaked = findPublicSecretNames(process.env);
if (leaked.length > 0) {
  throw new Error(
    `Tarayıcıya gidecek değişkenler gizli bilgi adı taşıyor: ${leaked.join(', ')}. ` +
      'Gizli bilgiler yalnız sunucuda durur (CLAUDE.md altın kural 2).',
  );
}

// Fail early on an invalid public configuration.
const env = parseEnv(webEnvSchema, process.env);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  headers() {
    const headers = securityHeaders({
      apiOrigin: new URL(env.NEXT_PUBLIC_API_URL).origin,
      development: process.env.NODE_ENV === 'development',
      local: env.NEXT_PUBLIC_APP_ENV === 'local',
    });
    return Promise.resolve([{ source: '/(.*)', headers }]);
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
