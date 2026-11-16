/**
 * JSON Canonicalization Scheme (RFC 8785) for the values this project hashes:
 * versioned documents and settings whose hash is recorded. The same value
 * gives the same bytes in the browser, the API and any third party that
 * checks a hash: no whitespace, object members sorted by the UTF-16 code
 * units of their names, strings and numbers serialized as ECMAScript's
 * `JSON.stringify` does (which RFC 8785 adopts).
 *
 * Only I-JSON is accepted: a non-finite number, a lone surrogate, `undefined`
 * or anything that is not plain JSON throws instead of hashing something a
 * verifier would read differently.
 */

export type JsonValue =
  null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export class CanonicalJsonError extends Error {
  override readonly name = 'CanonicalJsonError';
}

function serializeString(value: string): string {
  if (!value.isWellFormed()) throw new CanonicalJsonError('Lone surrogate in a string');
  return JSON.stringify(value);
}

/** The RFC 8785 serialization of `value`. */
export function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new CanonicalJsonError('Number is not finite');
    return JSON.stringify(value);
  }
  if (typeof value === 'string') return serializeString(value);
  if (Array.isArray(value)) {
    return `[${(value as readonly JsonValue[]).map(canonicalJson).join(',')}]`;
  }
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const record = value as Readonly<Record<string, JsonValue>>;
    // The default sort compares UTF-16 code units, as RFC 8785 §3.2.3 asks.
    const members = Object.keys(record)
      .sort()
      .map((key) => {
        const member = record[key];
        if (member === undefined) throw new CanonicalJsonError(`Member ${key} is undefined`);
        return `${serializeString(key)}:${canonicalJson(member)}`;
      });
    return `{${members.join(',')}}`;
  }
  throw new CanonicalJsonError(`Not a JSON value: ${typeof value}`);
}
