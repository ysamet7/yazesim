import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Upper bounds so that a stalled network or a runaway query never holds a
 * pooled connection (and the request waiting on it) forever.
 */
export const DATABASE_CONNECT_TIMEOUT_MS = 5_000;
export const DATABASE_STATEMENT_TIMEOUT_MS = 15_000;

export interface DatabaseClientTimeouts {
  /** Time allowed to open a connection. */
  readonly connectTimeoutMs?: number;
  /** Server-side `statement_timeout`; the client gives up one second later. */
  readonly statementTimeoutMs?: number;
}

/**
 * Options for constructing a `PrismaClient` over the node-postgres driver
 * adapter (Prisma 7). Every service connects the same way.
 */
export function prismaClientOptions(
  databaseUrl: string,
  timeouts: DatabaseClientTimeouts = {},
): { adapter: PrismaPg } {
  const statementTimeout = timeouts.statementTimeoutMs ?? DATABASE_STATEMENT_TIMEOUT_MS;
  return {
    adapter: new PrismaPg({
      connectionString: databaseUrl,
      connectionTimeoutMillis: timeouts.connectTimeoutMs ?? DATABASE_CONNECT_TIMEOUT_MS,
      statement_timeout: statementTimeout,
      query_timeout: statementTimeout + 1_000,
    }),
  };
}
