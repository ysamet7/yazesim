import { describe, expect, it } from 'vitest';
import { redisConnection } from './connection.js';

describe('redisConnection', () => {
  it('reads host, port and an escaped password', () => {
    expect(redisConnection('redis://:r%23dis@127.0.0.1:6380')).toMatchObject({
      host: '127.0.0.1',
      port: 6380,
      password: 'r#dis',
      maxRetriesPerRequest: null,
    });
  });

  it('supports a user, a database number and TLS', () => {
    const options = redisConnection('rediss://app:secret@redis.example:6390/2');
    expect(options).toMatchObject({
      host: 'redis.example',
      port: 6390,
      username: 'app',
      password: 'secret',
      db: 2,
      tls: {},
    });
  });

  it('defaults the port and omits empty credentials', () => {
    const options = redisConnection('redis://localhost');
    expect(options).toMatchObject({ host: 'localhost', port: 6379 });
    expect(options).not.toHaveProperty('password');
    expect(options).not.toHaveProperty('username');
  });

  it('rejects other schemes', () => {
    expect(() => redisConnection('http://localhost:6379')).toThrow(/redis:\/\//u);
  });
});
