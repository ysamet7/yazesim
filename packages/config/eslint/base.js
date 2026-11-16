import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

/**
 * Base preset for every TypeScript package in the monorepo. Type-aware rules
 * run through the TypeScript project service, so each package lints against
 * its own tsconfig without extra configuration.
 */
export const base = defineConfig([
  globalIgnores([
    '**/dist/**',
    '**/coverage/**',
    '**/.turbo/**',
    '**/.next/**',
    '**/out/**',
    '**/generated/**',
    '**/playwright-report/**',
    '**/test-results/**',
  ]),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      eqeqeq: ['error', 'always'],
      // Golden rule 7: chat content must never reach a log by accident; services
      // log through pino, whose formatter scrubs sensitive fields.
      'no-console': 'error',
      // Golden rule 6: NoR and credit amounts are bigint end to end. Parsing a
      // float is the usual way one sneaks into amount handling.
      'no-restricted-globals': [
        'error',
        {
          name: 'parseFloat',
          message: 'Use the bigint helpers from @yazesim/shared for amounts (CLAUDE.md rule 6).',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Number',
          property: 'parseFloat',
          message: 'Use the bigint helpers from @yazesim/shared for amounts (CLAUDE.md rule 6).',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
    },
  },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: [
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/*.e2e-spec.ts',
      '**/*.db-spec.ts',
      '**/test/**/*.ts',
    ],
    rules: {
      // Test doubles and assertions on partially typed fixtures.
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
  prettier,
]);

export default base;
