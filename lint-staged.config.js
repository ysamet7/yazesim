/** @type {import('lint-staged').Configuration} */
export default {
  '*.{ts,tsx,js,mjs,cjs,jsx}': ['prettier --write'],
  '*.{json,jsonc,yml,yaml,css,html}': ['prettier --write'],
  '*.md': ['prettier --write'],
  'contracts/**/*.sol': () => 'forge fmt --root contracts',
};
