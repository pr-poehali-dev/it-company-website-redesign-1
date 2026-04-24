
ALTER TABLE t_p88532089_it_company_website_r.prospects
  ADD COLUMN IF NOT EXISTS auto_email_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_email_sent_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS site_analysis text NULL,
  ADD COLUMN IF NOT EXISTS site_pain_points text NULL;

CREATE TABLE IF NOT EXISTS t_p88532089_it_company_website_r.followup_tasks (
  id serial PRIMARY KEY,
  prospect_id integer NOT NULL REFERENCES t_p88532089_it_company_website_r.prospects(id),
  task_type text NOT NULL DEFAULT 'followup',
  scheduled_at timestamptz NOT NULL,
  executed_at timestamptz NULL,
  status text NOT NULL DEFAULT 'pending',
  ai_subject text NULL,
  ai_body text NULL,
  error_msg text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS t_p88532089_it_company_website_r.funnel_events (
  id serial PRIMARY KEY,
  event_type text NOT NULL,
  prospect_id integer NULL REFERENCES t_p88532089_it_company_website_r.prospects(id),
  source text NULL,
  meta jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS t_p88532089_it_company_website_r.radar_runs (
  id serial PRIMARY KEY,
  region text NOT NULL,
  industry text NULL,
  found integer NOT NULL DEFAULT 0,
  inserted integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  trigger_type text NOT NULL DEFAULT 'manual',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NULL,
  error_msg text NULL
);
