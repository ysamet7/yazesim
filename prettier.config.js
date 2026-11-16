/** @type {import('prettier').Config} */
export default {
  printWidth: 100,
  singleQuote: true,
  trailingComma: 'all',
  endOfLine: 'lf',
  // Sorts Tailwind classes in the web app.
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: './apps/web/src/app/globals.css',
  overrides: [
    {
      files: ['*.md'],
      options: { proseWrap: 'preserve' },
    },
  ],
};
