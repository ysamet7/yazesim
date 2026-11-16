import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import globals from 'globals';
import { base } from './base.js';

/**
 * Preset for the Next.js app: Next's core web vitals rules (React, hooks,
 * accessibility, imports) under the strict TypeScript base.
 *
 * @param {{ rootDir: string }} options rootDir of the Next.js app, required in a monorepo.
 */
export function next({ rootDir }) {
  return defineConfig([
    // Next rules first: its config sets its own parser, which the strict
    // TypeScript base must replace so type-aware rules keep working.
    nextVitals,
    base,
    {
      languageOptions: {
        globals: { ...globals.browser, ...globals.node },
      },
      settings: {
        next: { rootDir },
      },
    },
    {
      // Every user-visible text lives in the message catalogue (messages/tr.json):
      // bare text inside JSX is an error. Separator punctuation is allowed.
      files: ['src/**/*.tsx'],
      ignores: ['src/**/*.test.tsx'],
      rules: {
        'react/jsx-no-literals': [
          'error',
          {
            noStrings: false,
            allowedStrings: ['·', '–', '—', '/', '(', ')', ',', ':', '.'],
          },
        ],
      },
    },
    globalIgnores(['next-env.d.ts']),
  ]);
}

export default next;
