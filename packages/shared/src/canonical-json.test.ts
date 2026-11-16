import { describe, expect, it } from 'vitest';
import { canonicalJson, CanonicalJsonError, type JsonValue } from './canonical-json.js';

const BS = String.fromCharCode(92);
const chars = (...codes: number[]): string => String.fromCodePoint(...codes);

describe('canonicalJson (RFC 8785)', () => {
  it('serializes the example of RFC 8785 §3.2.4', () => {
    const input: JsonValue = {
      // The RFC's own literal: it rounds to 333333333.3333333, as the expected output says.
      // eslint-disable-next-line no-loss-of-precision
      numbers: [333333333.33333329, 1e30, 4.5, 2e-3, 0.000000000000000000000000001],
      string: chars(0x20ac, 0x24, 0x0f, 0x0a, 0x41, 0x27, 0x42, 0x22, 0x5c, 0x5c, 0x22, 0x2f),
      literals: [null, true, false],
    };
    expect(canonicalJson(input)).toBe(
      `{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],` +
        `"string":"€$${BS}u000f${BS}nA'B${BS}"${BS}${BS}${BS}${BS}${BS}"/"}`,
    );
  });

  it('sorts members by UTF-16 code units (RFC 8785 §3.2.3)', () => {
    const keys = [
      chars(0x20ac),
      chars(0x0d),
      chars(0xfb33),
      '1',
      chars(0x1f600),
      chars(0x80),
      chars(0xf6),
    ];
    const input = Object.fromEntries(keys.map((key, index) => [key, index]));
    // Read back through JSON.parse, "1" would come first (an integer-like key).
    expect(canonicalJson(input)).toBe(
      `{"${BS}r":1,"1":3,"${chars(0x80)}":5,"${chars(0xf6)}":6,"${chars(0x20ac)}":0,` +
        `"${chars(0x1f600)}":4,"${chars(0xfb33)}":2}`,
    );
  });

  it('nests objects and arrays without whitespace', () => {
    expect(canonicalJson({ b: [1, { d: 'x', c: null }], a: {} })).toBe(
      '{"a":{},"b":[1,{"c":null,"d":"x"}]}',
    );
    expect(canonicalJson([])).toBe('[]');
    expect(canonicalJson('çiçek')).toBe('"çiçek"');
    expect(canonicalJson(-0)).toBe('0');
  });

  it('refuses what is not I-JSON', () => {
    expect(() => canonicalJson(Number.NaN)).toThrow(CanonicalJsonError);
    expect(() => canonicalJson(Number.POSITIVE_INFINITY)).toThrow(CanonicalJsonError);
    expect(() => canonicalJson(chars(0xd800))).toThrow(CanonicalJsonError);
    expect(() => canonicalJson({ [chars(0xdc00)]: 1 })).toThrow(CanonicalJsonError);
    expect(() => canonicalJson({ a: undefined } as unknown as JsonValue)).toThrow(
      CanonicalJsonError,
    );
    expect(() => canonicalJson(new Date(0) as unknown as JsonValue)).toThrow(CanonicalJsonError);
    expect(() => canonicalJson(10n as unknown as JsonValue)).toThrow(CanonicalJsonError);
    // eslint-disable-next-line no-sparse-arrays -- the hole is what is tested
    expect(() => canonicalJson([1, , 3] as unknown as JsonValue)).toThrow(/hole at index 1/u);
    expect(() => canonicalJson(new Array<JsonValue>(2))).toThrow(CanonicalJsonError);
  });
});
