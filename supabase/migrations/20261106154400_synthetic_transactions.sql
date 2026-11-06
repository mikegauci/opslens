-- Private server-only analytics. This migration is applied transactionally by db:migrate.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'opslens_app') THEN
    CREATE ROLE opslens_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'opslens_app' AND
    (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls))
    OR EXISTS (SELECT FROM pg_auth_members WHERE member = 'opslens_app'::regrole) THEN
    RAISE EXCEPTION 'opslens_app must be a dedicated unprivileged role';
  END IF;
END $$;
ALTER ROLE opslens_app SET default_transaction_read_only = on;
ALTER ROLE opslens_app SET search_path = pg_catalog, opslens_private;
ALTER ROLE opslens_app SET statement_timeout = '3s';
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA opslens_private;
REVOKE ALL ON SCHEMA opslens_private FROM PUBLIC;
GRANT USAGE ON SCHEMA opslens_private TO opslens_app;
-- No broad default SELECT grants: future tables require deliberate review.
ALTER DEFAULT PRIVILEGES IN SCHEMA opslens_private REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA opslens_private REVOKE ALL ON SEQUENCES FROM PUBLIC;

CREATE TABLE opslens_private.transactions (
  id text PRIMARY KEY,
  player_id text NOT NULL CHECK (player_id <> ''),
  brand_id text NOT NULL CHECK (brand_id IN ('harbor', 'summit')),
  provider_id text NOT NULL CHECK (provider_id IN ('nova', 'orbit', 'pulse')),
  game_category text NOT NULL CHECK (game_category IN ('slots', 'table')),
  placed_at timestamptz NOT NULL,
  settled_at timestamptz,
  status text NOT NULL CHECK (status IN ('settled', 'void', 'pending')),
  currency text NOT NULL CHECK (currency = 'EUR'),
  stake_minor bigint NOT NULL CHECK (stake_minor BETWEEN 0 AND 9007199254740991),
  payout_minor bigint CHECK (payout_minor BETWEEN 0 AND 9007199254740991),
  CHECK ((status = 'settled' AND settled_at IS NOT NULL AND payout_minor IS NOT NULL)
    OR (status IN ('void', 'pending') AND settled_at IS NULL AND payout_minor IS NULL)),
  CHECK (settled_at IS NULL OR settled_at >= placed_at)
);
CREATE TABLE opslens_private.dataset (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  manifest jsonb NOT NULL
);
REVOKE ALL ON ALL TABLES IN SCHEMA opslens_private FROM PUBLIC;
GRANT SELECT ON opslens_private.transactions, opslens_private.dataset TO opslens_app;
ALTER TABLE opslens_private.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE opslens_private.dataset ENABLE ROW LEVEL SECURITY;
-- All rows are fictional and readable by the server. No write policies or public API grants.
CREATE POLICY app_read ON opslens_private.transactions FOR SELECT TO opslens_app USING (true);
CREATE POLICY app_read ON opslens_private.dataset FOR SELECT TO opslens_app USING (true);
-- If run in a Supabase-compatible database, explicitly keep Data API roles out.
DO $$ DECLARE role_name text; BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA opslens_private FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA opslens_private FROM %I', role_name);
    END IF;
  END LOOP;
END $$;
