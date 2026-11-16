import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { FieldCipher, FieldDecryptionError, parseFieldKeys } from './field-cipher.js';
import { KeyedHasher, parsePepper, randomToken, safeEqual, sha256Hex } from './keyed-hash.js';

const keyA = randomBytes(32);
const keyB = randomBytes(32);
const spec = (id: string, key: Buffer): string => `${id}:${key.toString('base64url')}`;

describe('parseFieldKeys', () => {
  it('reads base64 and base64url keys with their ids', () => {
    const keys = parseFieldKeys(` ${spec('k1', keyA)}, k2:${keyB.toString('base64')} ,`);
    expect(keys.map((k) => k.id)).toEqual(['k1', 'k2']);
    expect(Buffer.from(keys[1]!.key).equals(keyB)).toBe(true);
  });

  it.each([
    ['', 'En az bir'],
    ['k1', 'geçersiz anahtar kimliği'],
    [`K1:${keyA.toString('base64url')}`, 'geçersiz anahtar kimliği'],
    ['k1:c2hvcnQ', '32 baytlık'],
    [`k1:${keyA.toString('base64url')}!!`, '32 baytlık'],
    [`${spec('k1', keyA)},${spec('k1', keyB)}`, 'iki kez'],
  ])('refuses %j without echoing the key', (value, message) => {
    expect(() => parseFieldKeys(value)).toThrow(message);
    try {
      parseFieldKeys(value);
    } catch (error) {
      expect(String(error)).not.toContain(keyA.toString('base64url'));
    }
  });
});

describe('FieldCipher', () => {
  const cipher = new FieldCipher(parseFieldKeys(spec('k1', keyA)), 'k1');

  it('round-trips and never repeats a ciphertext', () => {
    const one = cipher.encrypt('+905321234567', 'contact.phone:u1');
    const two = cipher.encrypt('+905321234567', 'contact.phone:u1');
    expect(one).not.toBe(two);
    expect(one).toMatch(/^v1\.k1\.[\w-]{16}\.[\w-]+\.[\w-]{22}$/u);
    expect(one).not.toContain('5321234567');
    expect(cipher.decrypt(one, 'contact.phone:u1')).toBe('+905321234567');
    expect(cipher.decrypt(cipher.encrypt('', 'x'), 'x')).toBe('');
    expect(cipher.decrypt(cipher.encrypt('Ayşe Işık', 'x'), 'x')).toBe('Ayşe Işık');
  });

  it('refuses a value moved to another owner or field', () => {
    const envelope = cipher.encrypt('+905321234567', 'contact.phone:u1');
    expect(() => cipher.decrypt(envelope, 'contact.phone:u2')).toThrow(FieldDecryptionError);
    expect(() => cipher.decrypt(envelope, 'message.content:u2')).toThrow(FieldDecryptionError);
  });

  it('refuses tampered or malformed envelopes', () => {
    const envelope = cipher.encrypt('secret', 'c');
    const parts = envelope.split('.');
    const flipped = Buffer.from(parts[3]!, 'base64url');
    flipped[0] = flipped[0]! ^ 1;
    const tampered = [...parts.slice(0, 3), flipped.toString('base64url'), parts[4]].join('.');
    expect(() => cipher.decrypt(tampered, 'c')).toThrow('doğrulama başarısız');
    expect(() => cipher.decrypt('v2.k1.a.b.c', 'c')).toThrow('biçim tanınmıyor');
    expect(() => cipher.decrypt('v1.k1.a.b', 'c')).toThrow('biçim tanınmıyor');
    expect(() => cipher.decrypt(`v1.k1.AAAA.${parts[3]}.${parts[4]}`, 'c')).toThrow(
      'biçim tanınmıyor',
    );
    expect(() => cipher.decrypt(envelope.replace('v1.k1.', 'v1.k9.'), 'c')).toThrow(
      'anahtar k9 tanımlı değil',
    );
  });

  it('rotates: new values use the active key, old ones stay readable', () => {
    const oldEnvelope = cipher.encrypt('eski', 'c');
    const rotated = new FieldCipher(
      parseFieldKeys(`${spec('k1', keyA)},${spec('k2', keyB)}`),
      'k2',
    );
    expect(rotated.decrypt(oldEnvelope, 'c')).toBe('eski');
    expect(rotated.needsReencryption(oldEnvelope)).toBe(true);
    const fresh = rotated.encrypt('yeni', 'c');
    expect(fresh.startsWith('v1.k2.')).toBe(true);
    expect(rotated.needsReencryption(fresh)).toBe(false);
    // A key that is no longer configured cannot be read.
    expect(() =>
      new FieldCipher(parseFieldKeys(spec('k2', keyB)), 'k2').decrypt(oldEnvelope, 'c'),
    ).toThrow(FieldDecryptionError);
  });

  it('requires the active key to be configured', () => {
    expect(() => new FieldCipher(parseFieldKeys(spec('k1', keyA)), 'k2')).toThrow('k2');
  });
});

describe('KeyedHasher', () => {
  const pepper = randomBytes(32);
  const hasher = new KeyedHasher(pepper);

  it('is deterministic per domain and separates domains', () => {
    const a = hasher.hash('email', 'ayse@example.com');
    expect(a).toMatch(/^[0-9a-f]{64}$/u);
    expect(hasher.hash('email', 'ayse@example.com')).toBe(a);
    expect(hasher.hash('device', 'ayse@example.com')).not.toBe(a);
    expect(hasher.hash('email', 'ayse@example.org')).not.toBe(a);
    // The separator keeps "ab"+"c" and "a"+"bc" apart.
    expect(hasher.hash('ip', 'c')).not.toBe(hasher.hash('email', 'ipc'));
  });

  it('depends on the pepper', () => {
    expect(new KeyedHasher(randomBytes(32)).hash('email', 'ayse@example.com')).not.toBe(
      hasher.hash('email', 'ayse@example.com'),
    );
  });

  it('requires a pepper of at least 32 bytes', () => {
    expect(() => new KeyedHasher(randomBytes(31))).toThrow('32');
    expect(() => parsePepper(randomBytes(16).toString('base64'))).toThrow('32');
    expect(Buffer.from(parsePepper(` ${pepper.toString('base64')} `)).equals(pepper)).toBe(true);
  });
});

describe('tokens', () => {
  it('are random, url-safe and hashed for storage', () => {
    const token = randomToken();
    expect(token).toMatch(/^[\w-]{43}$/u);
    expect(randomToken()).not.toBe(token);
    expect(randomToken(16)).toMatch(/^[\w-]{22}$/u);
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('compare in constant time', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
