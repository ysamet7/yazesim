import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ApiException } from '../errors/api-exception.js';
import { ZodValidationPipe } from './zod-validation.pipe.js';

const schema = z.strictObject({
  displayName: z.string().trim().min(2),
  location: z.strictObject({ districtId: z.coerce.number().int().positive() }),
});

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(schema);

  it('returns the parsed, transformed value', () => {
    expect(pipe.transform({ displayName: '  Ayşe ', location: { districtId: '42' } })).toEqual({
      displayName: 'Ayşe',
      location: { districtId: 42 },
    });
  });

  it('answers VALIDATION_FAILED with paths and rule codes, never the values', () => {
    let thrown: unknown;
    try {
      pipe.transform({ displayName: 'A', location: { districtId: -1 }, tc: '10000000146' });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ApiException);
    const exception = thrown as ApiException;
    expect(exception.code).toBe('VALIDATION_FAILED');
    expect(exception.getStatus()).toBe(400);
    expect(exception.details).toEqual({
      issues: [
        { path: 'displayName', code: 'too_small' },
        { path: 'location.districtId', code: 'too_small' },
        { path: '', code: 'unrecognized_keys' },
      ],
    });
    expect(JSON.stringify(exception.details)).not.toContain('10000000146');
  });

  it('rejects a missing body', () => {
    expect(() => pipe.transform(undefined)).toThrow(ApiException);
  });
});
