import type { ConnectionOptions } from 'bullmq';

/**
 * BullMQ connection settings from a `redis://` URL. Workers block on Redis
 * while waiting for jobs, so `maxRetriesPerRequest` must be null (BullMQ
 * requirement); reconnects back off up to 5 seconds.
 */
export function redisConnection(url: string): ConnectionOptions {
  const parsed = new URL(url);
  if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') {
    throw new Error('REDIS_URL redis:// veya rediss:// ile başlamalı');
  }
  const db = parsed.pathname.replace(/^\//u, '');
  return {
    host: parsed.hostname,
    port: parsed.port === '' ? 6379 : Number(parsed.port),
    ...(parsed.username === '' ? {} : { username: decodeURIComponent(parsed.username) }),
    ...(parsed.password === '' ? {} : { password: decodeURIComponent(parsed.password) }),
    ...(db === '' ? {} : { db: Number(db) }),
    ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
    maxRetriesPerRequest: null,
    retryStrategy: (attempt: number) => Math.min(attempt * 250, 5_000),
  };
}
