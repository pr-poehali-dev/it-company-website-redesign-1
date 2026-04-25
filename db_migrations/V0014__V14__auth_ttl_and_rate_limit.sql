ALTER TABLE t_p88532089_it_company_website_r.admin_sessions
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '72 hours');

UPDATE t_p88532089_it_company_website_r.admin_sessions
  SET expires_at = created_at + interval '72 hours'
  WHERE expires_at = (now() + interval '72 hours') AND created_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS t_p88532089_it_company_website_r.login_attempts (
  id          serial PRIMARY KEY,
  username    text NOT NULL,
  ip          text NOT NULL DEFAULT '',
  success     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup
  ON t_p88532089_it_company_website_r.login_attempts (username, ip, created_at);
