import { ErrorCode } from '@yazesim/shared/errors';
import { describe, expect, it } from 'vitest';
import tr from '../../messages/tr.json';

function entries(value: unknown, prefix = ''): [string, unknown][] {
  if (typeof value !== 'object' || value === null) return [[prefix, value]];
  return Object.entries(value).flatMap(([key, child]) =>
    entries(child, prefix === '' ? key : `${prefix}.${key}`),
  );
}

describe('message catalogue', () => {
  it('has no empty messages', () => {
    const empty = entries(tr).filter(
      ([, value]) => typeof value !== 'string' || value.trim() === '',
    );
    expect(empty).toEqual([]);
  });

  it('translates every API error code, and nothing else under errors', () => {
    expect(Object.keys(tr.errors).sort()).toEqual(Object.values(ErrorCode).sort());
  });

  it('never shows technical words to users (product principle)', () => {
    const technical = /\b(token|model|api|prompt|llm|gemini)\b/iu;
    const offending = entries(tr).filter(
      ([, value]) => typeof value === 'string' && technical.test(value),
    );
    expect(offending).toEqual([]);
  });
});
