CREATE TABLE IF NOT EXISTS t_p88532089_it_company_website_r.biz_databases (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'industry',
  icon TEXT NOT NULL DEFAULT 'Database',
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  price INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  stats JSONB,
  stats_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_biz_okved2_rev ON t_p88532089_it_company_website_r.biz_companies (okved2, revenue DESC NULLS LAST);