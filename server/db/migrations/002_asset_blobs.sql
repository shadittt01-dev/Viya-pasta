-- Uploaded images are stored in the database so the site also works on
-- serverless hosting (no persistent disk). One row per file in `assets`.
CREATE TABLE IF NOT EXISTS asset_blobs (
  path TEXT PRIMARY KEY,
  data BLOB NOT NULL
) STRICT;

-- Throttle for request-driven maintenance jobs (serverless has no timers).
CREATE TABLE IF NOT EXISTS job_runs (
  name TEXT PRIMARY KEY,
  last_run_at TEXT NOT NULL
) STRICT;
