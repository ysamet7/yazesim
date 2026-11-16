import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from './support/test-database.js';

describe('audit_log (append-only)', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await db.drop();
  });

  it('records an event with its defaults', async () => {
    const row = await db.prisma.auditLog.create({
      data: { actor: 'system:test', action: 'infra.baseline.checked' },
    });
    expect(row).toMatchObject({ actor: 'system:test', target: null, metadata: {} });
    expect(row.id).toBeTypeOf('bigint');
    expect(row.createdAt).toBeInstanceOf(Date);
  });

  it('refuses to change a recorded event', async () => {
    const row = await db.prisma.auditLog.create({
      data: { actor: 'system:test', action: 'infra.update.attempt' },
    });
    await expect(
      db.prisma.auditLog.update({ where: { id: row.id }, data: { action: 'rewritten' } }),
    ).rejects.toThrow(/append-only table audit_log: UPDATE is not allowed/u);
  });

  it('refuses to delete a recorded event', async () => {
    const row = await db.prisma.auditLog.create({
      data: { actor: 'system:test', action: 'infra.delete.attempt' },
    });
    await expect(db.prisma.auditLog.delete({ where: { id: row.id } })).rejects.toThrow(
      /append-only table audit_log: DELETE is not allowed/u,
    );
    await expect(db.prisma.auditLog.deleteMany({})).rejects.toThrow(/DELETE is not allowed/u);
  });

  it('refuses to truncate the table', async () => {
    await expect(db.prisma.$executeRawUnsafe('TRUNCATE audit_log')).rejects.toThrow(
      /append-only table audit_log: TRUNCATE is not allowed/u,
    );
    expect(await db.prisma.auditLog.count()).toBeGreaterThanOrEqual(3);
  });
});
