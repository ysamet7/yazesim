import { describe, expect, it } from 'vitest';
import {
  DATABASE_CONNECT_TIMEOUT_MS,
  DATABASE_STATEMENT_TIMEOUT_MS,
  prismaClientOptions,
} from './client.js';

describe('prismaClientOptions', () => {
  it('connects through the node-postgres adapter with bounded timeouts', () => {
    const { adapter } = prismaClientOptions('postgresql://u:p@127.0.0.1:5433/db');
    expect(adapter.provider).toBe('postgres');
    expect(DATABASE_CONNECT_TIMEOUT_MS).toBeLessThanOrEqual(10_000);
    expect(DATABASE_STATEMENT_TIMEOUT_MS).toBeLessThanOrEqual(30_000);
  });
});
