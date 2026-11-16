import { styleText } from 'node:util';

/** Developer-facing progress output. Never pass secret values to these functions. */
export const log = {
  title(text: string): void {
    console.log(`\n${styleText(['bold', 'cyan'], text)}`);
  },
  step(index: number, total: number, text: string): void {
    console.log(
      `\n${styleText('bold', `[${String(index)}/${String(total)}]`)} ${styleText('bold', text)}`,
    );
  },
  ok(text: string): void {
    console.log(`  ${styleText('green', '✓')} ${text}`);
  },
  info(text: string): void {
    console.log(`  ${styleText('dim', text)}`);
  },
  skip(text: string): void {
    console.log(`  ${styleText('gray', '↷')} ${styleText('gray', text)}`);
  },
  warn(text: string): void {
    console.warn(`  ${styleText('yellow', '!')} ${text}`);
  },
  fail(text: string): void {
    console.error(`  ${styleText('red', '✗')} ${text}`);
  },
};
