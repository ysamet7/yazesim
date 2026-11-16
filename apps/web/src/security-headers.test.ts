import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy, securityHeaders } from './security-headers';

const production = { apiOrigin: 'https://api.yazesim.example', development: false, local: false };

function directives(policy: string): Map<string, string> {
  return new Map(
    policy.split('; ').map((directive) => {
      const [name = '', ...values] = directive.split(' ');
      return [name, values.join(' ')];
    }),
  );
}

describe('contentSecurityPolicy', () => {
  it('locks down a production build', () => {
    const policy = directives(contentSecurityPolicy(production));
    expect(policy.get('default-src')).toBe("'self'");
    expect(policy.get('script-src')).not.toContain('unsafe-eval');
    expect(policy.get('connect-src')).toBe("'self' https://api.yazesim.example");
    expect(policy.get('object-src')).toBe("'none'");
    expect(policy.get('frame-ancestors')).toBe("'none'");
    expect(policy.has('upgrade-insecure-requests')).toBe(true);
  });

  it('allows hot reload only in development', () => {
    const policy = directives(
      contentSecurityPolicy({ apiOrigin: 'http://localhost:4200', development: true, local: true }),
    );
    expect(policy.get('script-src')).toContain("'unsafe-eval'");
    expect(policy.get('connect-src')).toContain('ws:');
    expect(policy.has('upgrade-insecure-requests')).toBe(false);
  });
});

describe('securityHeaders', () => {
  it('sends HSTS only outside local development', () => {
    const names = (local: boolean) =>
      securityHeaders({ ...production, local }).map((header) => header.key);
    expect(names(false)).toContain('Strict-Transport-Security');
    expect(names(true)).not.toContain('Strict-Transport-Security');
  });

  it('forbids framing and sniffing', () => {
    const headers = new Map(securityHeaders(production).map((h) => [h.key, h.value]));
    expect(headers.get('X-Frame-Options')).toBe('DENY');
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
  });
});
