/**
 * The application's database role (yazesim_app_rw) can read and insert, but
 * cannot rewrite append-only tables or switch their protection off. The audit
 * log's triggers stop UPDATE, DELETE and TRUNCATE for everyone; privileges
 * stop the application from dropping or disabling those triggers.
 */
import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient, prismaClientOptions } from '../src/index.js';
import { createTestDatabase, type TestDatabase } from './support/test-database.js';

const APP_GROUP = 'yazesim_app_rw';

describe('application database role', () => {
  let db: TestDatabase;
  let app: PrismaClient;
  let role: string;

  beforeAll(async () => {
    db = await createTestDatabase();
    role = `yazesim_test_app_${randomBytes(6).toString('hex')}`;
    const password = randomBytes(24).toString('hex');
    // Both values are generated hex above; no user input reaches this SQL.
    await db.prisma.$executeRawUnsafe(
      `CREATE ROLE "${role}" LOGIN PASSWORD '${password}' IN ROLE ${APP_GROUP}`,
    );
    const url = new URL(db.url);
    url.username = role;
    url.password = password;
    app = new PrismaClient(prismaClientOptions(url.href));
  });

  afterAll(async () => {
    await app.$disconnect();
    await db.drop();
    await db.dropRole(role);
  });

  it('reads and inserts audit events', async () => {
    await app.auditLog.create({ data: { actor: 'system:test', action: 'privileges.checked' } });
    expect(await app.auditLog.count()).toBeGreaterThanOrEqual(1);
  });

  it.each([
    ['UPDATE audit_log SET action = $$x$$'],
    ['DELETE FROM audit_log'],
    ['TRUNCATE audit_log'],
  ])('has no privilege for %s', async (statement) => {
    await expect(app.$executeRawUnsafe(statement)).rejects.toThrow(/permission denied/u);
  });

  it.each([
    ['ALTER TABLE audit_log DISABLE TRIGGER USER'],
    ['DROP TRIGGER audit_log_append_only_rows ON audit_log'],
    ['DROP TABLE audit_log'],
  ])('cannot switch the protection off: %s', async (statement) => {
    await expect(app.$executeRawUnsafe(statement)).rejects.toThrow(/must be owner/u);
  });

  it('cannot skip triggers or create objects', async () => {
    await expect(app.$executeRawUnsafe('SET session_replication_role = replica')).rejects.toThrow(
      /permission denied/u,
    );
    await expect(app.$executeRawUnsafe('CREATE TABLE side_door (id int)')).rejects.toThrow(
      /permission denied/u,
    );
  });

  it('every table is granted to the application role, append-only ones without changes', async () => {
    const tables = await db.prisma.$queryRaw<{ table: string; privileges: string[] }[]>`
      SELECT c.relname AS "table",
             ARRAY(SELECT p FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE']) AS p
                   WHERE has_table_privilege(${APP_GROUP}, c.oid, p)) AS privileges
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname <> '_prisma_migrations'`;
    const appendOnly = await db.prisma.$queryRaw<{ table: string }[]>`
      SELECT DISTINCT c.relname AS "table"
      FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_proc p ON p.oid = t.tgfoid
      WHERE p.proname = 'forbid_append_only_change'`;
    const appendOnlyNames = new Set(appendOnly.map((row) => row.table));

    expect(tables.length).toBeGreaterThan(0);
    expect(appendOnlyNames.has('audit_log')).toBe(true);
    for (const { table, privileges } of tables) {
      expect({ table, canSelect: privileges.includes('SELECT') }).toEqual({
        table,
        canSelect: true,
      });
      if (appendOnlyNames.has(table)) {
        expect({ table, privileges }).toEqual({ table, privileges: ['SELECT', 'INSERT'] });
      }
    }
    const migrations = await db.prisma.$queryRaw<{ allowed: boolean }[]>`
      SELECT has_table_privilege(${APP_GROUP}, '_prisma_migrations', 'SELECT') AS allowed`;
    expect(migrations[0]?.allowed).toBe(false);
  });
});
