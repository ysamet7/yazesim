/**
 * The local login role the API and the worker connect as. It is a member of
 * yazesim_app_rw, the group the migrations grant table privileges to
 * (packages/database/prisma/migrations/*_app_role), and has no other right.
 * Staging and production provision their own role the same way.
 */

export const APP_GROUP_ROLE = 'yazesim_app_rw';

const IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/u;
/** `randomSecret()` output: base64url. */
const PASSWORD = /^[A-Za-z0-9_-]{16,}$/u;

/**
 * Idempotent SQL that creates or updates the login role and its password.
 * Sent to psql on standard input, never on the command line, and never printed.
 */
export function appRoleSql(user: string, password: string): string {
  if (!IDENTIFIER.test(user)) {
    throw new Error('POSTGRES_APP_USER yalnız küçük harf, rakam ve alt çizgi içerebilir.');
  }
  if (!PASSWORD.test(password)) {
    throw new Error('POSTGRES_APP_PASSWORD beklenen biçimde değil; pnpm bootstrap ile üretin.');
  }
  return [
    'DO $$ BEGIN',
    `  CREATE ROLE ${user} LOGIN;`,
    'EXCEPTION WHEN duplicate_object OR unique_violation THEN NULL;',
    'END $$;',
    `ALTER ROLE ${user} WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${password}';`,
    `GRANT ${APP_GROUP_ROLE} TO ${user};`,
    '',
  ].join('\n');
}
