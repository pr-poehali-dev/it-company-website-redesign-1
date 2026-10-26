CREATE TABLE IF NOT EXISTS t_p88532089_it_company_website_r.biz_companies (
  inn TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  okved TEXT NOT NULL DEFAULT '',
  okved2 TEXT NOT NULL DEFAULT '',
  msp_cat SMALLINT NOT NULL DEFAULT 0,
  msp_year SMALLINT NOT NULL DEFAULT 0,
  revenue BIGINT,
  expenses BIGINT,
  staff INTEGER,
  tax_mode TEXT NOT NULL DEFAULT '',
  tax_debt BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_biz_okved2_region ON t_p88532089_it_company_website_r.biz_companies (okved2, region, revenue DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_biz_region_rev ON t_p88532089_it_company_website_r.biz_companies (region, revenue DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_biz_okved ON t_p88532089_it_company_website_r.biz_companies (okved text_pattern_ops);

CREATE TABLE IF NOT EXISTS t_p88532089_it_company_website_r.biz_markets (
  okved2 TEXT NOT NULL,
  region TEXT NOT NULL,
  companies INTEGER NOT NULL DEFAULT 0,
  with_revenue INTEGER NOT NULL DEFAULT 0,
  revenue BIGINT NOT NULL DEFAULT 0,
  expenses BIGINT NOT NULL DEFAULT 0,
  profitable INTEGER NOT NULL DEFAULT 0,
  staff BIGINT NOT NULL DEFAULT 0,
  median_revenue BIGINT NOT NULL DEFAULT 0,
  top10_share NUMERIC(6,2) NOT NULL DEFAULT 0,
  hhi NUMERIC(10,1) NOT NULL DEFAULT 0,
  micro INTEGER NOT NULL DEFAULT 0,
  small INTEGER NOT NULL DEFAULT 0,
  medium INTEGER NOT NULL DEFAULT 0,
  non_msp INTEGER NOT NULL DEFAULT 0,
  new_3y INTEGER NOT NULL DEFAULT 0,
  with_debt INTEGER NOT NULL DEFAULT 0,
  debt_sum BIGINT NOT NULL DEFAULT 0,
  usn INTEGER NOT NULL DEFAULT 0,
  grants_companies INTEGER NOT NULL DEFAULT 0,
  grants_sum BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (okved2, region)
);
CREATE INDEX IF NOT EXISTS idx_biz_markets_region ON t_p88532089_it_company_website_r.biz_markets (region);

CREATE TABLE IF NOT EXISTS t_p88532089_it_company_website_r.biz_okved (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  section TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS t_p88532089_it_company_website_r.biz_report_orders (
  id SERIAL PRIMARY KEY,
  report_type TEXT NOT NULL,
  report_key TEXT NOT NULL DEFAULT '',
  report_title TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  inn TEXT NOT NULL DEFAULT '',
  comment TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);