-- Operational counters are separate from the read-only analytics tables.
CREATE TABLE opslens_private.copilot_quota (
  day date NOT NULL,
  visitor text NOT NULL,
  requests integer NOT NULL CHECK (requests BETWEEN 1 AND 50),
  PRIMARY KEY (day, visitor)
);
ALTER TABLE opslens_private.copilot_quota ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON opslens_private.copilot_quota FROM PUBLIC, opslens_app;

CREATE FUNCTION opslens_private.reserve_copilot_request(visitor_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  utc_day date := (pg_catalog.statement_timestamp() AT TIME ZONE 'UTC')::date;
BEGIN
  IF visitor_key IS NULL OR visitor_key !~ '^[0-9a-f]{64}$' THEN
    RETURN false;
  END IF;

  -- Serialize the two counters, including first use of a new day across instances.
  PERFORM pg_catalog.pg_advisory_xact_lock(730011);
  IF EXISTS (
    SELECT FROM opslens_private.copilot_quota
    WHERE day = utc_day AND
      ((visitor = '' AND requests >= 50) OR (visitor = visitor_key AND requests >= 5))
  ) THEN
    RETURN false;
  END IF;

  DELETE FROM opslens_private.copilot_quota WHERE day < utc_day - 1;
  INSERT INTO opslens_private.copilot_quota AS quota (day, visitor, requests)
  VALUES (utc_day, '' , 1), (utc_day, visitor_key, 1)
  ON CONFLICT (day, visitor) DO UPDATE SET requests = quota.requests + 1;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION opslens_private.reserve_copilot_request(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION opslens_private.reserve_copilot_request(text) TO opslens_app;

DO $$ DECLARE role_name text; BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON opslens_private.copilot_quota FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON FUNCTION opslens_private.reserve_copilot_request(text) FROM %I', role_name);
    END IF;
  END LOOP;
END $$;
