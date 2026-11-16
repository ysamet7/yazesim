/**
 * Keyed hashes for values that must be unique or comparable but never stored
 * in clear (golden rule 7): the e-mail address, the IP address and device id
 * behind abuse limits, and one-time codes (bound to their row, so a database
 * copy cannot be matched to codes).
 *
 * `HMAC-SHA256(pepper, domain ‖ 0x00 ‖ value)`. The pepper lives only in the
 * environment (`HASH_PEPPER`), so a database copy alone cannot be brute
 * forced; the domain separates fields so equal strings in different fields
 * never share a hash.
 */
import { createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const KEYED_HASH_DOMAINS = ['email', 'ip', 'device', 'otp'] as const;
export type KeyedHashDomain = (typeof KEYED_HASH_DOMAINS)[number];

const MIN_PEPPER_BYTES = 32;

/** Decodes a base64 or base64url pepper of at least 32 bytes. */
export function parsePepper(encoded: string): Uint8Array {
  const pepper = Buffer.from(encoded.trim(), 'base64url');
  if (pepper.length < MIN_PEPPER_BYTES) {
    throw new Error(`Pepper en az ${String(MIN_PEPPER_BYTES)} bayt olmalı`);
  }
  return new Uint8Array(pepper);
}

export class KeyedHasher {
  constructor(private readonly pepper: Uint8Array) {
    if (pepper.length < MIN_PEPPER_BYTES) {
      throw new Error(`Pepper en az ${String(MIN_PEPPER_BYTES)} bayt olmalı`);
    }
  }

  /** Lower-case hex HMAC of `value` in `domain`; normalize `value` first. */
  hash(domain: KeyedHashDomain, value: string): string {
    return createHmac('sha256', this.pepper)
      .update(domain, 'utf8')
      .update(Buffer.from([0]))
      .update(value, 'utf8')
      .digest('hex');
  }
}

/** A random secret token, base64url (256 bits by default). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** SHA-256 of a token, hex: what the database stores instead of the token. */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** Constant-time comparison of two strings. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}
