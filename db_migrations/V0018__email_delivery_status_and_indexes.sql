ALTER TABLE t_p88532089_it_company_website_r.prospects
  ADD COLUMN IF NOT EXISTS email_delivery_status text NULL,
  ADD COLUMN IF NOT EXISTS email_delivery_provider text NULL;

CREATE INDEX IF NOT EXISTS idx_prospects_auto_email_sent
  ON t_p88532089_it_company_website_r.prospects(auto_email_sent);
CREATE INDEX IF NOT EXISTS idx_prospects_created_at
  ON t_p88532089_it_company_website_r.prospects(created_at);