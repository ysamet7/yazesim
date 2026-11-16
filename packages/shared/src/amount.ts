/**
 * NoR amount handling. Amounts are always `bigint` in the token's smallest unit
 * (wei, 18 decimals); never `number` (CLAUDE.md golden rule 6). Display strings use
 * Turkish number formatting by default ("." groups thousands, "," separates
 * decimals) and English formatting on English pages. User input is read in
 * the page's format too: "1.250,50" on Turkish pages, "1,250.50" on
 * English ones.
 */

export const NOR_DECIMALS = 18;
export const NOR_SYMBOL = 'NoR';
export const WEI_PER_NOR = 10n ** BigInt(NOR_DECIMALS);

/** Non-breaking space: keeps "50.000" and "NoR" on the same line. */
export const NBSP = '\u00A0';

/** Display locales for amounts. Turkish is the product language; English is kept for later. */
export type AmountLocale = 'tr' | 'en';

const SEPARATORS: Readonly<
  Record<AmountLocale, { readonly group: string; readonly decimal: string }>
> = {
  tr: { group: '.', decimal: ',' },
  en: { group: ',', decimal: '.' },
};

export interface FormatNoROptions {
  /** Maximum fraction digits to show, 0–18. Defaults to 2. */
  readonly maximumFractionDigits?: number;
  /** Minimum fraction digits (padded with zeros). Defaults to 0. */
  readonly minimumFractionDigits?: number;
  /** Append the "NoR" unit. Defaults to true. */
  readonly withSymbol?: boolean;
  /** Number format of the page the amount is shown on. Defaults to Turkish. */
  readonly locale?: AmountLocale;
}

function assertDigitOption(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > NOR_DECIMALS) {
    throw new RangeError(`${name} must be an integer between 0 and ${NOR_DECIMALS}`);
  }
}

function groupThousands(digits: string, separator: string): string {
  let grouped = '';
  for (let end = digits.length; end > 0; end -= 3) {
    const chunk = digits.slice(Math.max(0, end - 3), end);
    grouped = grouped === '' ? chunk : `${chunk}${separator}${grouped}`;
  }
  return grouped;
}

/**
 * Formats a wei amount for display, e.g. `50000n * 10n ** 18n` → "50.000 NoR"
 * (or "50,000 NoR" with `locale: 'en'`).
 *
 * Extra fraction digits are truncated toward zero, never rounded, so a balance
 * is never shown larger than it is. A non-zero amount that would display as
 * zero is shown as "<0,01 NoR" (or "<1 NoR" with no fraction digits); a negative
 * one keeps its sign in front ("-<0,01 NoR": a debit smaller than 0,01).
 */
export function formatNoR(wei: bigint, options: FormatNoROptions = {}): string {
  const maximumFractionDigits = options.maximumFractionDigits ?? 2;
  const minimumFractionDigits = options.minimumFractionDigits ?? 0;
  assertDigitOption('maximumFractionDigits', maximumFractionDigits);
  assertDigitOption('minimumFractionDigits', minimumFractionDigits);
  if (minimumFractionDigits > maximumFractionDigits) {
    throw new RangeError('minimumFractionDigits cannot exceed maximumFractionDigits');
  }

  const { group, decimal } = SEPARATORS[options.locale ?? 'tr'];
  const negative = wei < 0n;
  const magnitude = negative ? -wei : wei;
  const whole = magnitude / WEI_PER_NOR;
  const fraction = magnitude % WEI_PER_NOR;

  const fractionDigits = fraction
    .toString()
    .padStart(NOR_DECIMALS, '0')
    .slice(0, maximumFractionDigits)
    .replace(/0+$/u, '')
    .padEnd(minimumFractionDigits, '0');

  let text: string;
  if (magnitude !== 0n && whole === 0n && /^0*$/u.test(fractionDigits)) {
    const smallest =
      maximumFractionDigits === 0 ? '1' : `0${decimal}${'0'.repeat(maximumFractionDigits - 1)}1`;
    text = `<${smallest}`;
  } else {
    const wholeText = groupThousands(whole.toString(), group);
    text = fractionDigits === '' ? wholeText : `${wholeText}${decimal}${fractionDigits}`;
  }

  const signed = negative ? `-${text}` : text;
  return options.withSymbol === false ? signed : `${signed}${NBSP}${NOR_SYMBOL}`;
}

export type AmountParseErrorCode =
  'AMOUNT_EMPTY' | 'AMOUNT_INVALID_FORMAT' | 'AMOUNT_TOO_PRECISE' | 'AMOUNT_NEGATIVE';

/** Raised when user input cannot be read as a NoR amount. */
export class AmountParseError extends Error {
  readonly code: AmountParseErrorCode;

  constructor(code: AmountParseErrorCode) {
    super(code);
    this.name = 'AmountParseError';
    this.code = code;
  }

  /** next-intl message key for this error. */
  get messageKey(): `errors.${AmountParseErrorCode}` {
    return `errors.${this.code}`;
  }
}

export interface ParseNoROptions {
  /** Accept a leading minus sign. Defaults to false. */
  readonly allowNegative?: boolean;
  /** Number format of the page the amount is typed on. Defaults to Turkish. */
  readonly locale?: AmountLocale;
}

// Integer part: plain digits ("50000") or correctly grouped digits ("50.000").
// A group separator that is not followed by exactly three digits is rejected
// rather than guessed, so Turkish "1.5" can never silently become 15 or 1,5
// (nor English "1,5" become 15 or 1.5).
const AMOUNT_PATTERNS: Readonly<Record<AmountLocale, RegExp>> = {
  tr: /^(-)?([0-9]+|[1-9][0-9]{0,2}(?:\.[0-9]{3})+)(?:,([0-9]+))?$/u,
  en: /^(-)?([0-9]+|[1-9][0-9]{0,2}(?:,[0-9]{3})+)(?:\.([0-9]+))?$/u,
};

/**
 * Longest input read as an amount. The total supply with all 18 decimals and
 * the unit fits in about 45 characters; anything longer is rejected before any
 * pattern matching.
 */
export const MAX_AMOUNT_INPUT_LENGTH = 64;

/**
 * Parses an amount typed or pasted by a user into wei: Turkish "50.000",
 * "1.234,56" or "50.000 NoR" by default, English "50,000" or "1,234.56" with
 * `locale: 'en'`.
 *
 * @throws {AmountParseError} on empty, malformed, too precise or (unless
 *   allowed) negative input.
 */
export function parseNoR(input: string, options: ParseNoROptions = {}): bigint {
  let text = input.trim();
  if (text.length > MAX_AMOUNT_INPUT_LENGTH) throw new AmountParseError('AMOUNT_INVALID_FORMAT');
  // String.prototype.trim also removes the non-breaking space formatNoR uses.
  if (text.toLowerCase().endsWith(NOR_SYMBOL.toLowerCase())) {
    text = text.slice(0, -NOR_SYMBOL.length).trim();
  }
  if (text === '') throw new AmountParseError('AMOUNT_EMPTY');

  const locale = options.locale ?? 'tr';
  const match = AMOUNT_PATTERNS[locale].exec(text);
  const integerPart = match?.[2];
  if (integerPart === undefined) throw new AmountParseError('AMOUNT_INVALID_FORMAT');

  const negative = match?.[1] !== undefined;
  const fractionPart = match?.[3] ?? '';
  if (fractionPart.length > NOR_DECIMALS) throw new AmountParseError('AMOUNT_TOO_PRECISE');
  if (negative && options.allowNegative !== true) throw new AmountParseError('AMOUNT_NEGATIVE');

  const whole = BigInt(integerPart.replaceAll(SEPARATORS[locale].group, ''));
  const fraction = BigInt(fractionPart.padEnd(NOR_DECIMALS, '0'));
  const wei = whole * WEI_PER_NOR + fraction;
  return negative ? -wei : wei;
}
