-- Least privilege for the application. The API and the worker connect as a
-- login role that is a member of yazesim_app_rw, never as the owner that runs
-- these migrations. The owner keeps DDL; yazesim_app_rw gets only what each
-- table needs. Append-only tables (this audit log, the credit ledger in
-- phase 3) get SELECT and INSERT only: no UPDATE, DELETE or TRUNCATE
-- privilege, and as a non-owner the application cannot disable or drop their
-- triggers either.
--
-- Every later migration that creates a table grants it to yazesim_app_rw
-- explicitly; packages/database/test/privileges.db-spec.ts fails otherwise.
-- The login role itself (name and password) is environment configuration:
-- `pnpm bootstrap` creates it locally.

-- Roles are cluster-wide: another database on the same server may have
-- created it already, possibly at the same moment.
DO $$
BEGIN
  CREATE ROLE yazesim_app_rw NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
EXCEPTION
  WHEN duplicate_object OR unique_violation THEN NULL;
END
$$;

GRANT USAGE ON SCHEMA public TO yazesim_app_rw;

GRANT SELECT, INSERT ON TABLE "audit_log" TO yazesim_app_rw;
GRANT USAGE ON SEQUENCE "audit_log_id_seq" TO yazesim_app_rw;
