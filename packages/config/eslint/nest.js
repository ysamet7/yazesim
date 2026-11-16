import { defineConfig } from 'eslint/config';
import { node } from './node.js';

/** Preset for NestJS services (decorators with emitted metadata). */
export const nest = defineConfig([
  node,
  {
    languageOptions: {
      parserOptions: {
        // Lets the type-import rules keep runtime imports that dependency
        // injection reads through emitted decorator metadata.
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
      },
    },
    rules: {
      // Nest modules are empty classes configured by decorators.
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
    },
  },
]);

export default nest;
