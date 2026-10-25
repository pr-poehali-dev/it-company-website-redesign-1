CREATE TABLE IF NOT EXISTS t_p88532089_it_company_website_r.radar_companies (
  inn TEXT PRIMARY KEY,
  ogrn TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT '',
  industry TEXT NOT NULL DEFAULT '',
  activity TEXT NOT NULL DEFAULT '',
  segment TEXT NOT NULL DEFAULT '',
  subsegment TEXT NOT NULL DEFAULT '',
  size TEXT NOT NULL DEFAULT '',
  employees INTEGER,
  msp_year INTEGER,
  source TEXT NOT NULL DEFAULT '',
  source_full TEXT NOT NULL DEFAULT '',
  last_date DATE,
  last_amount BIGINT NOT NULL DEFAULT 0,
  total_amount BIGINT NOT NULL DEFAULT 0,
  payments INTEGER NOT NULL DEFAULT 0,
  support_years INTEGER,
  offer TEXT NOT NULL DEFAULT '',
  score INTEGER NOT NULL DEFAULT 0,
  head TEXT NOT NULL DEFAULT '',
  phones TEXT NOT NULL DEFAULT '',
  emails TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_radar_region ON t_p88532089_it_company_website_r.radar_companies (region);
CREATE INDEX IF NOT EXISTS idx_radar_industry ON t_p88532089_it_company_website_r.radar_companies (industry);
CREATE INDEX IF NOT EXISTS idx_radar_source ON t_p88532089_it_company_website_r.radar_companies (source);
CREATE INDEX IF NOT EXISTS idx_radar_last_date ON t_p88532089_it_company_website_r.radar_companies (last_date DESC);
CREATE INDEX IF NOT EXISTS idx_radar_total ON t_p88532089_it_company_website_r.radar_companies (total_amount DESC);
CREATE INDEX IF NOT EXISTS idx_radar_score ON t_p88532089_it_company_website_r.radar_companies (score DESC);

CREATE TABLE IF NOT EXISTS t_p88532089_it_company_website_r.radar_access_requests (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  interest TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL DEFAULT '',
  company_inn TEXT NOT NULL DEFAULT '',
  filters TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);