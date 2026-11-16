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
    'passphrase',
    'credential',
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
    // `accessTokens`, `refreshTokens`; usage counts such as `outputTokens` stay
    'accesstoken',
    'refreshtoken',
    'idtoken',
    'sessiontoken',
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
    // Network identifiers are personal data under KVKK
    'ipaddress',
    'remoteaddress',
    'clientip',
    'forwardedfor',
    'useragent',
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
    '^(tc|tcno|tckn|tel|dob|seed|otp|otpcode|pin|token|key|ip|ips)$',
  ].join('|'),
  'u',
);

/** True when a value stored under `key` must not be logged. */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key.toLowerCase().replace(/[\s._-]/gu, ''));
}

const URL_PATTERN = /([a-z][a-z0-9+.-]*):\/\/[^\s'"`<>]+/giu;

/**
 * Replaces every URL in free text (log messages, error messages, stacks) with
 * `[url]`. RPC and database URLs carry keys and passwords in their path or user
 * part. `file:` URLs are kept: ESM stack frames are `file:` URLs and carry only
 * the source location.
 */
export function scrubUrls(text: string): string {
  return text.replace(URL_PATTERN, (url, scheme: string) =>
    scheme.toLowerCase() === 'file' ? url : '[url]',
  );
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

/** Free text (a log message, an error message or stack): no URLs, e-mail addresses or phone numbers. */
export function scrubFreeText(text: string): string {
  return scrubContactDetails(scrubUrls(text));
}

/** Masks credentials embedded in URLs (`scheme://user:pass@host`) inside a string value. */
function maskUrlCredentials(text: string): string {
  return text.replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@'"`<>]+@/giu, `$1${REDACTED}@`);
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
    message: scrubFreeText(error.message),
  };
  if (typeof code === 'string' || typeof code === 'number') result.code = code;
  if (error.stack !== undefined) result.stack = scrubFreeText(error.stack);
  if (error.cause !== undefined)
    result.cause = scrubLogValue(error.cause, depth + 1, new WeakSet());
  return result;
}

/**
 * Returns a copy of `value` that is safe to log. Objects and arrays are walked
 * at any depth, class instances (DTOs, database rows) through their own
 * enumerable fields; errors become `scrubError` output; dates are kept; binary
 * data, maps and sets are replaced by a placeholder.
 */
export function scrubLogValue(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') return scrubContactDetails(maskUrlCredentials(value));
  if (typeof value !== 'object' || value === null) return value;
  if (seen.has(value)) return '[Circular]';
  if (depth > MAX_DEPTH) return '[Truncated]';
  if (value instanceof Error) return scrubError(value, depth);
  if (value instanceof Date) return value;
  if (value instanceof URL) return scrubUrls(value.href);
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return '[Binary]';
  if (value instanceof Map || value instanceof Set) return `[${value.constructor.name}]`;
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => scrubLogValue(item, depth + 1, seen));
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = scrubField(key, item, depth + 1, seen);
  }
  return result;
}

/** The log-safe form of `item` stored under `key`: redacted when the key is sensitive. */
export function scrubField(
  key: string,
  item: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (isSensitiveKey(key) && item !== null && typeof item !== 'boolean' && item !== undefined) {
    return REDACTED;
  }
  return scrubLogValue(item, depth, seen);
}
