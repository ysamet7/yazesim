import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  AmountParseError,
  MAX_AMOUNT_INPUT_LENGTH,
  NBSP,
  NOR_DECIMALS,
  NOR_SYMBOL,
  WEI_PER_NOR,
  formatNoR,
  parseNoR,
} from './amount.js';

const nor = (whole: bigint): bigint => whole * WEI_PER_NOR;
const withUnit = (text: string): string => `${text}${NBSP}${NOR_SYMBOL}`;

describe('constants', () => {
  it('describe an 18-decimal token named NoR', () => {
    expect(NOR_DECIMALS).toBe(18);
    expect(NOR_SYMBOL).toBe('NoR');
    expect(WEI_PER_NOR).toBe(10n ** 18n);
  });
});

describe('formatNoR', () => {
  it.each([
    [0n, '0'],
    [nor(1n), '1'],
    [nor(999n), '999'],
    [nor(1_000n), '1.000'],
    [nor(50_000n), '50.000'],
    [nor(1_234_567n), '1.234.567'],
    [nor(3_300_000_000_000n), '3.300.000.000.000'],
  ])('formats %s wei as "%s NoR" with Turkish grouping', (wei, expected) => {
    expect(formatNoR(wei)).toBe(withUnit(expected));
  });

  it('uses a comma as the decimal separator and keeps at most 2 fraction digits by default', () => {
    expect(formatNoR(nor(1_234_567n) + 891n * 10n ** 15n)).toBe(withUnit('1.234.567,89'));
  });

  it('truncates instead of rounding so a balance is never overstated', () => {
    expect(formatNoR(999n * 10n ** 15n)).toBe(withUnit('0,99'));
    expect(formatNoR(nor(1n) - 1n)).toBe(withUnit('0,99'));
  });

  it('drops trailing zeros beyond the minimum fraction digits', () => {
    expect(formatNoR(nor(1n) + 5n * 10n ** 17n)).toBe(withUnit('1,5'));
    expect(formatNoR(nor(5n), { minimumFractionDigits: 2 })).toBe(withUnit('5,00'));
    expect(formatNoR(nor(5n) + 10n ** 17n, { minimumFractionDigits: 2 })).toBe(withUnit('5,10'));
  });

  it('marks a non-zero amount that would display as zero', () => {
    expect(formatNoR(1n)).toBe(withUnit('<0,01'));
    expect(formatNoR(1n, { maximumFractionDigits: 0 })).toBe(withUnit('<1'));
    expect(formatNoR(-1n)).toBe(withUnit('-<0,01'));
  });

  it('shows every digit when asked for full precision', () => {
    expect(formatNoR(1n, { maximumFractionDigits: 18 })).toBe(withUnit('0,000000000000000001'));
  });

  it('formats negative amounts with a leading minus sign', () => {
    expect(formatNoR(-nor(5_000n))).toBe(withUnit('-5.000'));
    expect(formatNoR(-(nor(1n) + 25n * 10n ** 16n))).toBe(withUnit('-1,25'));
  });

  it('formats for English pages with "," groups and "." decimals', () => {
    expect(formatNoR(nor(1_234_567n) + 891n * 10n ** 15n, { locale: 'en' })).toBe(
      withUnit('1,234,567.89'),
    );
    expect(formatNoR(nor(50_000n), { locale: 'en' })).toBe(withUnit('50,000'));
    expect(formatNoR(1n, { locale: 'en' })).toBe(withUnit('<0.01'));
    expect(formatNoR(-nor(5n), { locale: 'en', minimumFractionDigits: 2 })).toBe(withUnit('-5.00'));
    expect(formatNoR(nor(50_000n), { locale: 'tr' })).toBe(withUnit('50.000'));
  });

  it('can omit the unit', () => {
    expect(formatNoR(nor(50_000n), { withSymbol: false })).toBe('50.000');
  });

  it('keeps the number and the unit together with a non-breaking space', () => {
    expect(formatNoR(nor(1n))).toContain('\u00A0');
    expect(formatNoR(nor(1n))).not.toContain(' ');
  });

  it.each([
    [{ maximumFractionDigits: 19 }],
    [{ maximumFractionDigits: -1 }],
    [{ maximumFractionDigits: 1.5 }],
    [{ minimumFractionDigits: 3, maximumFractionDigits: 2 }],
    [{ minimumFractionDigits: -1 }],
  ])('rejects invalid options %o', (options) => {
    expect(() => formatNoR(1n, options)).toThrow(RangeError);
  });
});

describe('parseNoR', () => {
  it.each([
    ['0', 0n],
    ['50000', nor(50_000n)],
    ['50.000', nor(50_000n)],
    ['3.300.000.000.000', nor(3_300_000_000_000n)],
    ['1.234,56', nor(1_234n) + 56n * 10n ** 16n],
    ['0,5', 5n * 10n ** 17n],
    ['0,000000000000000001', 1n],
    ['007', nor(7n)],
    ['  12,5  ', nor(12n) + 5n * 10n ** 17n],
    [`50.000${NBSP}NoR`, nor(50_000n)],
    ['50.000 NoR', nor(50_000n)],
    ['50.000 nor', nor(50_000n)],
    ['50.000NoR', nor(50_000n)],
  ])('parses "%s"', (input, expected) => {
    expect(parseNoR(input)).toBe(expected);
  });

  it.each(['', '   ', 'NoR'])('rejects empty input %j', (input) => {
    expect(() => parseNoR(input)).toThrow(expect.objectContaining({ code: 'AMOUNT_EMPTY' }));
  });

  it.each([
    'abc',
    '1e5',
    '1.5',
    '1.50',
    '1.5000',
    '1,2,3',
    ',5',
    '5,',
    '0.000',
    '.500',
    '5 000',
    '5.000.00',
    '1.000,5.0',
    '+5',
    '--5',
    '٥',
    'Infinity',
    'NaN',
  ])('rejects malformed input %j', (input) => {
    expect(() => parseNoR(input)).toThrow(
      expect.objectContaining({ code: 'AMOUNT_INVALID_FORMAT' }),
    );
  });

  it('rejects overlong input before any pattern matching', () => {
    const invalid = expect.objectContaining({ code: 'AMOUNT_INVALID_FORMAT' });
    const started = performance.now();
    expect(() => parseNoR(`1${' '.repeat(40_000)}x`)).toThrow(invalid);
    expect(() => parseNoR(`1${' '.repeat(40_000)}NoR`)).toThrow(invalid);
    expect(performance.now() - started).toBeLessThan(100);
    expect(() => parseNoR('1'.repeat(MAX_AMOUNT_INPUT_LENGTH + 1))).toThrow(invalid);
    const longest = '1'.repeat(MAX_AMOUNT_INPUT_LENGTH);
    expect(parseNoR(`  ${longest}  `)).toBe(nor(BigInt(longest)));
  });

  it.each([
    ['50,000', nor(50_000n)],
    ['1,234.56', nor(1_234n) + 56n * 10n ** 16n],
    ['0.5 NoR', 5n * 10n ** 17n],
    ['50000', nor(50_000n)],
    // Fifty with three decimals, as an English reader means it; the send form repeats the
    // amount in the page's format before anything is signed.
    ['50.000', nor(50n)],
  ])('reads "%s" on an English page', (input, expected) => {
    expect(parseNoR(input, { locale: 'en' })).toBe(expected);
  });

  it.each(['1,5', '1.234,56', '1,50'])(
    'refuses the Turkish format %j on an English page',
    (input) => {
      expect(() => parseNoR(input, { locale: 'en' })).toThrow(
        expect.objectContaining({ code: 'AMOUNT_INVALID_FORMAT' }),
      );
    },
  );

  it('rejects more than 18 fraction digits', () => {
    expect(() => parseNoR('0,0000000000000000001')).toThrow(
      expect.objectContaining({ code: 'AMOUNT_TOO_PRECISE' }),
    );
  });

  it('rejects negative amounts unless explicitly allowed', () => {
    expect(() => parseNoR('-5')).toThrow(expect.objectContaining({ code: 'AMOUNT_NEGATIVE' }));
    expect(parseNoR('-5.000', { allowNegative: true })).toBe(-nor(5_000n));
  });

  it('throws AmountParseError with a translatable message key', () => {
    try {
      parseNoR('abc');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AmountParseError);
      expect((error as AmountParseError).messageKey).toBe('errors.AMOUNT_INVALID_FORMAT');
    }
  });
});

describe('formatNoR ↔ parseNoR', () => {
  const wei = fc.bigInt({ min: 0n, max: 10n ** 48n });

  it('round-trips every amount at full precision', () => {
    fc.assert(
      fc.property(wei, (value) => {
        expect(parseNoR(formatNoR(value, { maximumFractionDigits: 18 }))).toBe(value);
      }),
      { numRuns: 2_000 },
    );
  });

  it('round-trips negative amounts when allowed', () => {
    fc.assert(
      fc.property(wei, (value) => {
        const negative = -value;
        const text = formatNoR(negative, { maximumFractionDigits: 18, withSymbol: false });
        expect(parseNoR(text, { allowNegative: true })).toBe(negative);
      }),
      { numRuns: 500 },
    );
  });

  it('never displays more than the actual amount', () => {
    fc.assert(
      fc.property(wei, fc.integer({ min: 0, max: 18 }), (value, digits) => {
        const shown = formatNoR(value, { maximumFractionDigits: digits, withSymbol: false });
        if (shown.startsWith('<')) return;
        expect(parseNoR(shown)).toBeLessThanOrEqual(value);
      }),
      { numRuns: 2_000 },
    );
  });

  it('always produces Turkish-formatted output', () => {
    const turkish = /^-?(<)?(0|[1-9]\d{0,2}(\.\d{3})*)(,\d+)?\u00A0NoR$/u;
    fc.assert(
      fc.property(fc.bigInt({ min: -(10n ** 40n), max: 10n ** 40n }), (value) => {
        expect(formatNoR(value)).toMatch(turkish);
      }),
      { numRuns: 2_000 },
    );
  });
});
