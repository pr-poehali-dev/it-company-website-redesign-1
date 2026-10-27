CREATE TABLE IF NOT EXISTS pipe_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  company VARCHAR(255),
  plan VARCHAR(20) NOT NULL DEFAULT 'free',
  plan_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pipe_codes (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code_hash VARCHAR(64) NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pipe_codes_email_idx ON pipe_codes (email, created_at DESC);

CREATE TABLE IF NOT EXISTS pipe_sources (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES pipe_users(id),
  name VARCHAR(200) NOT NULL,
  kind VARCHAR(30) NOT NULL,
  config_enc TEXT NOT NULL,
  config_public JSONB NOT NULL DEFAULT '{}'::jsonb,
  clean JSONB NOT NULL DEFAULT '{}'::jsonb,
  schedule VARCHAR(20) NOT NULL DEFAULT 'daily',
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  data_key VARCHAR(64) NOT NULL UNIQUE,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_rows INT,
  last_error TEXT,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  fail_count INT NOT NULL DEFAULT 0,
  notify_email BOOLEAN NOT NULL DEFAULT TRUE,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pipe_sources_user_idx ON pipe_sources (user_id);
CREATE INDEX IF NOT EXISTS pipe_sources_due_idx ON pipe_sources (next_run_at) WHERE archived = FALSE;

CREATE TABLE IF NOT EXISTS pipe_runs (
  id SERIAL PRIMARY KEY,
  source_id INT NOT NULL REFERENCES pipe_sources(id),
  trigger VARCHAR(20) NOT NULL DEFAULT 'manual',
  status VARCHAR(20) NOT NULL DEFAULT 'running',
  rows_in INT,
  rows_out INT,
  dupes INT,
  empty_rows INT,
  fixed_values INT,
  ms INT,
  message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS pipe_runs_source_idx ON pipe_runs (source_id, started_at DESC);
