/**
 * Application-layer encryption of personal data (CLAUDE.md golden rule 7):
 * chat messages, conversation titles and summaries, personal memory and TOTP
 * secrets. From phase 4 each user's data key is wrapped with these keys, so
 * deleting that one key makes the user's content unreadable everywhere.
 *
 * AES-256-GCM with a random 96-bit IV per value. The envelope names its key so
 * keys can be rotated: new values use the active key, old values stay readable
 * while their key is configured. The associated data binds a ciphertext to its
 * field and owner (`context`), so a value copied into another row or column
 * fails to decrypt instead of being read as someone else's data.
 *
 * Envelope: `v1.<keyId>.<iv>.<ciphertext>.<tag>` (base64url parts).
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_ID = /^[a-z0-9][a-z0-9-]{0,15}$/u;

export interface FieldKey {
  readonly id: string;
  readonly key: Uint8Array;
}

/** A value that cannot be decrypted; the message never contains key or data. */
export class FieldDecryptionError extends Error {
  constructor(reason: string) {
    super(`Şifreli alan çözülemedi: ${reason}`);
    this.name = 'FieldDecryptionError';
  }
}

/**
 * Parses `DATA_ENCRYPTION_KEYS`: comma-separated `<keyId>:<base64 or base64url
 * 32-byte key>` entries. Throws on a malformed entry without echoing it.
 */
export function parseFieldKeys(spec: string): FieldKey[] {
  const keys = spec
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '')
    .map((entry, index) => {
      const separator = entry.indexOf(':');
      const id = separator === -1 ? '' : entry.slice(0, separator);
      const encoded = separator === -1 ? '' : entry.slice(separator + 1);
      if (!KEY_ID.test(id))
        throw new Error(`Anahtar ${String(index + 1)}: geçersiz anahtar kimliği`);
      const key = Buffer.from(encoded, 'base64url');
      if (key.length !== KEY_BYTES || !/^[A-Za-z0-9+/_-]+={0,2}$/u.test(encoded)) {
        throw new Error(`Anahtar ${id}: 32 baytlık base64 bir anahtar olmalı`);
      }
      return { id, key: new Uint8Array(key) };
    });
  if (keys.length === 0) throw new Error('En az bir şifreleme anahtarı gerekli');
  if (new Set(keys.map((k) => k.id)).size !== keys.length) {
    throw new Error('Aynı anahtar kimliği iki kez yazılmış');
  }
  return keys;
}

function associatedData(keyId: string, context: string): Buffer {
  return Buffer.from(`yazesim.field.${VERSION}.${keyId}.${context}`, 'utf8');
}

export class FieldCipher {
  private readonly keys: ReadonlyMap<string, Uint8Array>;
  private readonly activeKey: Uint8Array;

  constructor(
    keys: readonly FieldKey[],
    private readonly activeKeyId: string,
  ) {
    this.keys = new Map(keys.map((k) => [k.id, k.key]));
    const activeKey = this.keys.get(activeKeyId);
    if (!activeKey) throw new Error(`Etkin şifreleme anahtarı (${activeKeyId}) tanımlı değil`);
    this.activeKey = activeKey;
  }

  /** Encrypts `plaintext` for `context`, e.g. `contact.phone:<userId>`. */
  encrypt(plaintext: string, context: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.activeKey, iv, { authTagLength: TAG_BYTES });
    cipher.setAAD(associatedData(this.activeKeyId, context));
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return [
      VERSION,
      this.activeKeyId,
      iv.toString('base64url'),
      ciphertext.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
    ].join('.');
  }

  /** Decrypts an envelope written for the same `context`. */
  decrypt(envelope: string, context: string): string {
    const parts = envelope.split('.');
    if (parts.length !== 5 || parts[0] !== VERSION) {
      throw new FieldDecryptionError('biçim tanınmıyor');
    }
    const [, keyId = '', ivPart = '', dataPart = '', tagPart = ''] = parts;
    const key = this.keys.get(keyId);
    if (!key) throw new FieldDecryptionError(`anahtar ${keyId} tanımlı değil`);
    const iv = Buffer.from(ivPart, 'base64url');
    const tag = Buffer.from(tagPart, 'base64url');
    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
      throw new FieldDecryptionError('biçim tanınmıyor');
    }
    try {
      const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
      decipher.setAAD(associatedData(keyId, context));
      decipher.setAuthTag(tag);
      return Buffer.concat([
        decipher.update(Buffer.from(dataPart, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new FieldDecryptionError(
        'doğrulama başarısız (yanlış anahtar, bağlam veya bozuk veri)',
      );
    }
  }

  /** Whether the value was written with an older key and should be re-encrypted. */
  needsReencryption(envelope: string): boolean {
    return envelope.split('.')[1] !== this.activeKeyId;
  }
}
