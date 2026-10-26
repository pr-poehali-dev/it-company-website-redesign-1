CREATE TABLE IF NOT EXISTS t_p88532089_it_company_website_r.bi_shares (
  id TEXT PRIMARY KEY,
  edit_key TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  data_url TEXT NOT NULL,
  rows_count INTEGER NOT NULL DEFAULT 0,
  cols_count INTEGER NOT NULL DEFAULT 0,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  owner_name TEXT NOT NULL DEFAULT '',
  owner_email TEXT NOT NULL DEFAULT '',
  owner_phone TEXT NOT NULL DEFAULT '',
  owner_company TEXT NOT NULL DEFAULT '',
  views INTEGER NOT NULL DEFAULT 0,
  last_view_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '90 days',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bi_shares_created ON t_p88532089_it_company_website_r.bi_shares (created_at DESC);