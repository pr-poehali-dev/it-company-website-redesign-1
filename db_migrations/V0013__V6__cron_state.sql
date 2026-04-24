
CREATE TABLE IF NOT EXISTS t_p88532089_it_company_website_r.cron_state (
  key text PRIMARY KEY,
  last_run timestamptz NULL,
  last_result jsonb NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO t_p88532089_it_company_website_r.cron_state (key) VALUES ('nightly_run')
ON CONFLICT (key) DO NOTHING;
