/**
 * Security headers of every page, built from the validated public
 * configuration. Kept apart from next.config.ts so tests can check them.
 */

export interface SecurityHeaderOptions {
  /** The API's origin: the only other place pages may connect to. */
  readonly apiOrigin: string;
  /** `next dev`: hot reload needs eval and a WebSocket. */
  readonly development: boolean;
  /** Local HTTP: no HSTS and no upgrade of insecure requests. */
  readonly local: boolean;
}

/**
 * Baseline Content Security Policy without nonces, so pages stay statically
 * renderable (Next.js CSP guide, "Without Nonces"). Inline scripts are
 * required for the RSC payload in this mode; every other directive is strict.
 * TODO(faz-4): move to nonce- or hash-based script-src before AI output is
 * rendered in the browser.
 */
export function contentSecurityPolicy(options: SecurityHeaderOptions): string {
  const { apiOrigin, development, local } = options;
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self' ${apiOrigin}${development ? ' ws:' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(local ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

export function securityHeaders(
  options: SecurityHeaderOptions,
): { readonly key: string; readonly value: string }[] {
  return [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy(options) },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    // Voice questions (later) will ask for the microphone explicitly; nothing else is used.
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
    ...(options.local
      ? []
      : [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ]),
  ];
}
