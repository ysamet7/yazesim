import { defineConfig } from 'eslint/config';
import { node } from '@yazesim/config/eslint/node';

export default defineConfig([
  node,
  {
    // Command-line tools report progress on the console by design.
    files: ['src/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
]);
