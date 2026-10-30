ALTER TABLE t_p88532089_it_company_website_r.prospects ADD COLUMN IF NOT EXISTS contact_name text DEFAULT '';
ALTER TABLE t_p88532089_it_company_website_r.prospects ADD COLUMN IF NOT EXISTS contact_post text DEFAULT '';
ALTER TABLE t_p88532089_it_company_website_r.prospects ADD COLUMN IF NOT EXISTS enrich_status text DEFAULT '';
ALTER TABLE t_p88532089_it_company_website_r.prospects ADD COLUMN IF NOT EXISTS enrich_note text DEFAULT '';
ALTER TABLE t_p88532089_it_company_website_r.prospects ADD COLUMN IF NOT EXISTS revenue bigint;
ALTER TABLE t_p88532089_it_company_website_r.email_templates ADD COLUMN IF NOT EXISTS campaign text DEFAULT 'wave1';
CREATE INDEX IF NOT EXISTS idx_prospects_campaign_enrich ON t_p88532089_it_company_website_r.prospects (campaign, enrich_status);
CREATE INDEX IF NOT EXISTS idx_prospects_inn ON t_p88532089_it_company_website_r.prospects (inn);