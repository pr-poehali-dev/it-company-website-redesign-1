CREATE TABLE IF NOT EXISTS t_p88532089_it_company_website_r.biz_market_cache (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);