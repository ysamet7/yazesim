import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { appRoleSql } from './db-roles.ts';

// Generated like `randomSecret()`, so no credential-shaped literal is committed.
const PASSWORD = randomBytes(18).toString('base64url');

describe('appRoleSql', () => {
  it('creates a login role without extra rights and adds it to the application group', () => {
    const sql = appRoleSql('yazesim_app', PASSWORD);
    expect(sql).toContain('CREATE ROLE yazesim_app LOGIN;');
    expect(sql).toContain('NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS');
    expect(sql).toContain(`PASSWORD '${PASSWORD}'`);
    expect(sql).toContain('GRANT yazesim_app_rw TO yazesim_app;');
  });

  it.each(['Yazesim', 'app; DROP ROLE x', 'a"b', '', `a${'b'.repeat(63)}`])(
    'refuses the user name %j',
    (user) => {
      expect(() => appRoleSql(user, PASSWORD)).toThrow(/POSTGRES_APP_USER/u);
    },
  );

  it.each(["x'; DROP ROLE yazesim; --", 'short', 'with space and more chars'])(
    'refuses a password that is not generated base64url',
    (password) => {
      expect(() => appRoleSql('yazesim_app', password)).toThrow(/POSTGRES_APP_PASSWORD/u);
    },
  );

  it('does not echo the password in its errors', () => {
    expect(() => appRoleSql('Bad', PASSWORD)).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining(PASSWORD) as unknown }),
    );
  });
});
