-- Infrastructure baseline (phase 0): the append-only guard shared by every
-- table that must never be rewritten (this audit log now, the credit ledger
-- in phase 3, golden rule 9), and the audit log itself.

-- Append-only guard: rows are only ever inserted; a correction is a new row.
-- Fires for UPDATE and DELETE (per row) and TRUNCATE (per statement).
CREATE FUNCTION forbid_append_only_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'append-only table %: % is not allowed', TG_TABLE_NAME, TG_OP
    USING HINT = 'Insert a correcting row instead.';
END;
$$;

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "actor" VARCHAR(120) NOT NULL,
    "action" VARCHAR(120) NOT NULL,
    "target" VARCHAR(200),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- CreateIndex
CREATE INDEX "audit_log_actor_created_at_idx" ON "audit_log"("actor", "created_at");

-- The audit log is append-only.
CREATE TRIGGER audit_log_append_only_rows
  BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION forbid_append_only_change();

CREATE TRIGGER audit_log_append_only_truncate
  BEFORE TRUNCATE ON "audit_log"
  FOR EACH STATEMENT EXECUTE FUNCTION forbid_append_only_change();
