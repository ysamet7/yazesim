/**
 * Removes personal data, chat content and secrets from anything that is
 * logged (CLAUDE.md golden rules 1 and 7). Key matching is case-insensitive and
 * ignores separators, so `phone_number`, `phoneNumber` and `PHONE-NUMBER` are
 * the same key, and it applies at any nesting depth.
 */

export const REDACTED = '[REDACTED]';

/** Objects nested deeper than this are replaced instead of walked. */
const MAX_DEPTH = 12;

/**
 * Sensitive keys after lower-casing and removing `_`, `-`, `.` and spaces.
 * Fragments match anywhere in the key; anchored entries are too short or too
 * generic to match as fragments (`tc`, `pin`, `seed`, `token`).
 */
const SENSITIVE_KEY = new RegExp(
  [
    // Credentials and key material
    'password',
    'passwd',
    'secret',
    'privatekey',
    'apikey',
    'accesskey',
    'encryptionkey',
    'signingkey',
    'pepper',
    'mnemonic',
    'seedphrase',
    'signature',
    'authorization',
    'cookie',
    'token$',
    // Connection strings and endpoints (RPC URLs often embed a provider key)
    '(url|uri|dsn)$',
    // Personal data (KVKK)
    'kimlik',
    'identitynumber',
    'nationalid',
    'iban',
    'phone',
    'gsm',
    'email',
    'eposta',
    'smscode',
    'totp',
    'birth',
    'dogum',
    'fullname',
    'adsoyad',
    'postaladdress',
    'homeaddress',
    'streetaddress',
    // Chat content: messages, prompts, answers, summaries and memory (golden rule 7)
    // Anchored at the end: `messageContent` and `systemPrompt` are content,
    // `promptTokenCount` and `contentType` are not.
    '(content|prompt|completion)$',
    'transcript',
    'messagetext',
    'messagebody',
    'chathistory',
    'usermemory',
    'systeminstruction',
    '^(text|body|messages|history|question|answer|reply|summary|memory|title)$',
    '^(tc|tcno|tckn|tel|dob|seed|otp|otpcode|pin|token)$',
  ].join('|'),
  'u',
);

/** True when a value stored under `key` must not be logged. */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key.toLowerCase().replace(/[\s._-]/gu, ''));
}

const URL_PATTERN = /[a-z][a-z0-9+.-]*:\/\/[^\s'"`<>]+/giu;

/** Replaces every URL in free text (error messages, stacks) with `[url]`. */
export function scrubUrls(text: string): string {
  return text.replace(URL_PATTERN, '[url]');
}

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/gu;
/** A Turkish mobile number on its own: 5xx xxx xx xx, with or without 0, 90 or +90. */
const TURKISH_MOBILE_PATTERN = /(?<![\p{L}\p{N}])(?:\+?90|0)?5[0-9]{9}(?![\p{L}\p{N}])/gu;

/**
 * Masks e-mail addresses and Turkish mobile numbers in free text. Keys name
 * most personal data, but error messages carry it too: an SMTP server's reply
 * repeats the recipient.
 */
export function scrubContactDetails(text: string): string {
  return text.replace(EMAIL_PATTERN, '[email]').replace(TURKISH_MOBILE_PATTERN, '[phone]');
}

/** Masks credentials embedded in URLs (`scheme://user:pass@host`) inside a string value. */
function maskUrlCredentials(text: string): string {
  return text.replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@'"`<>]+@/giu, `$1${REDACTED}@`);
}

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * A log-safe copy of an error: type, message and stack with URLs and contact
 * details removed, a primitive `code`, and the (scrubbed) cause chain. Other
 * enumerable fields are dropped because client libraries put request URLs and
 * bodies there.
 */
export function scrubError(error: Error, depth = 0): Record<string, unknown> {
  const { code } = error as { code?: unknown };
  const result: Record<string, unknown> = {
    type: error.name,
    message: scrubContactDetails(scrubUrls(error.message)),
  };
  if (typeof code === 'string' || typeof code === 'number') result.code = code;
  if (error.stack !== undefined) result.stack = scrubContactDetails(scrubUrls(error.stack));
  if (error.cause !== undefined)
    result.cause = scrubLogValue(error.cause, depth + 1, new WeakSet());
  return result;
}

/**
 * Returns a copy of `value` that is safe to log. Plain objects and arrays are
 * walked; errors become `scrubError` output; other class instances (such as the
 * raw request and response, which have their own serializers) are kept as they are.
 */
export function scrubLogValue(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') return scrubContactDetails(maskUrlCredentials(value));
  if (typeof value !== 'object' || value === null) return value;
  if (seen.has(value)) return '[Circular]';
  if (depth > MAX_DEPTH) return '[Truncated]';
  if (value instanceof Error) return scrubError(value, depth);
  if (!Array.isArray(value) && !isPlainObject(value)) return value;
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => scrubLogValue(item, depth + 1, seen));
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] =
      isSensitiveKey(key) && item !== null && typeof item !== 'boolean' && item !== undefined
        ? REDACTED
        : scrubLogValue(item, depth + 1, seen);
  }
  return result;
}
