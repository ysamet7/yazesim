import { describe, expect, it } from 'vitest';
import {
  REDACTED,
  isSensitiveKey,
  scrubContactDetails,
  scrubError,
  scrubLogValue,
  scrubUrls,
} from './scrub.js';

describe('isSensitiveKey', () => {
  it.each([
    'password',
    'newPassword',
    'S3_SECRET_ACCESS_KEY',
    'apiKey',
    'HASH_PEPPER',
    'GEMINI_API_KEY',
    'privateKey',
    'accessToken',
    'refresh_token',
    'token',
    'Authorization',
    'set-cookie',
    'DATABASE_URL',
    'rpcUrl',
    'tc',
    'TCKN',
    'tcKimlikNo',
    'identityNumber',
    'iban',
    'phone_number',
    'gsm',
    'e-posta',
    'email',
    'otp',
    'smsCode',
    'content',
    'messageContent',
    'prompt',
    'systemInstruction',
    'text',
    'messages',
    'summary',
    'title',
    'birthDate',
    'dogumTarihi',
    'fullName',
    'homeAddress',
    'pin',
  ])('treats %s as sensitive', (key) => {
    expect(isSensitiveKey(key)).toBe(true);
  });

  it.each([
    'amount',
    'orderKey',
    'orderRef',
    'tokenAddress',
    'tokenId',
    'chainId',
    'txHash',
    'address',
    'requestId',
    'statusCode',
    'path',
    'footprint',
    'option',
    'promptTokenCount',
    'cachedContentTokenCount',
    'contentType',
    'titleLength',
  ])('keeps %s', (key) => {
    expect(isSensitiveKey(key)).toBe(false);
  });
});

describe('scrubUrls', () => {
  it('replaces every URL in free text', () => {
    expect(scrubUrls('GET https://rpc.example/v2/key failed; see wss://x.y/z')).toBe(
      'GET [url] failed; see [url]',
    );
  });
});

describe('scrubContactDetails', () => {
  it('masks e-mail addresses and Turkish mobile numbers in free text', () => {
    expect(
      scrubContactDetails(
        "Can't send mail - all recipients were rejected: 550 5.1.1 " +
          '<sms+905591234567@sms.yazesim.local>: Recipient address rejected',
      ),
    ).toBe(
      "Can't send mail - all recipients were rejected: 550 5.1.1 <[email]>: Recipient address rejected",
    );
    expect(scrubContactDetails('from uye-1@example.com and A.B_c%d+e@mail.example.org')).toBe(
      'from [email] and [email]',
    );
    for (const phone of ['+905321234567', '905321234567', '05321234567', '5321234567']) {
      expect(scrubContactDetails(`call ${phone}.`)).toBe('call [phone].');
    }
  });

  it('leaves other numbers alone', () => {
    const text =
      'block 5321234 nonce 15321234567 tx 0xa5321234567b id 01a17212-dfd1-76af-a792-d4702ee12c2c ' +
      'reply 550 5.1.1 at 2026-10-25';
    expect(scrubContactDetails(text)).toBe(text);
  });
});

describe('scrubLogValue', () => {
  it('masks contact details in string values', () => {
    expect(scrubLogValue({ note: 'call 05321234567 or a@b.co' })).toEqual({
      note: 'call [phone] or [email]',
    });
  });

  it('walks plain objects and arrays without changing the input', () => {
    const input = { a: [{ password: 'x' }], b: { c: 1 } };
    expect(scrubLogValue(input)).toEqual({ a: [{ password: REDACTED }], b: { c: 1 } });
    expect(input.a[0]?.password).toBe('x');
  });

  it('redacts whole objects stored under a sensitive key', () => {
    expect(scrubLogValue({ phone: { country: '+90', number: '5550000000' } })).toEqual({
      phone: REDACTED,
    });
  });

  it('keeps class instances for their own serializers', () => {
    class Request {
      readonly password = 'kept for the req serializer';
    }
    const req = new Request();
    expect((scrubLogValue({ req }) as { req: unknown }).req).toBe(req);
  });

  it('handles cycles and very deep nesting', () => {
    const cyclic: Record<string, unknown> = { name: 'a' };
    cyclic.self = cyclic;
    expect(scrubLogValue(cyclic)).toEqual({ name: 'a', self: '[Circular]' });

    let deep: Record<string, unknown> = { password: 'bottom' };
    for (let i = 0; i < 20; i += 1) deep = { next: deep };
    const text = JSON.stringify(scrubLogValue(deep));
    expect(text).toContain('[Truncated]');
    expect(text).not.toContain('bottom');
  });

  it('turns nested errors into scrubbed objects', () => {
    const value = scrubLogValue({ details: { failure: new Error('at https://x.y/key') } });
    expect(value).toMatchObject({ details: { failure: { type: 'Error', message: 'at [url]' } } });
  });
});

describe('scrubError', () => {
  it('keeps type, message, code, stack and cause without URLs', () => {
    const cause = new Error('socket to https://rpc.example/v2/key closed');
    const error = Object.assign(new Error('call failed', { cause }), {
      code: 42,
      url: 'https://rpc.example/v2/key',
      body: { method: 'eth_call' },
    });
    const result = scrubError(error);
    expect(result).toMatchObject({
      type: 'Error',
      message: 'call failed',
      code: 42,
      cause: { type: 'Error', message: 'socket to [url] closed' },
    });
    expect(result).not.toHaveProperty('url');
    expect(result).not.toHaveProperty('body');
    expect(JSON.stringify(result)).not.toContain('rpc.example');
  });

  it('masks contact details in the message and stack', () => {
    const result = scrubError(new Error('550 <uye@example.com> and +905321234567 rejected'));
    expect(result.message).toBe('550 <[email]> and [phone] rejected');
    expect(String(result.stack)).not.toMatch(/example\.com|905321234567/u);
  });

  it('omits non-primitive codes and missing stacks', () => {
    const error = Object.assign(new Error('x'), { code: { nested: true } });
    Reflect.deleteProperty(error, 'stack');
    expect(scrubError(error)).toEqual({ type: 'Error', message: 'x' });
  });
});
