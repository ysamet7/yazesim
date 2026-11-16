import { fileURLToPath } from 'node:url';
import { next } from '@yazesim/config/eslint/next';

export default next({ rootDir: fileURLToPath(new URL('.', import.meta.url)) });
