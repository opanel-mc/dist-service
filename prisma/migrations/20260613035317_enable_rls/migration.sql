-- Defense in depth: download_record lives in the `public` schema, which
-- Supabase can expose through the Data (REST) API. Only this backend touches
-- the table, and it connects as the table owner (`postgres`), which bypasses
-- RLS. Enabling RLS with no policies therefore blocks the `anon` /
-- `authenticated` roles (the Data API) while leaving the backend unaffected.
ALTER TABLE "download_record" ENABLE ROW LEVEL SECURITY;
