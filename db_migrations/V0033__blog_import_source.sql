ALTER TABLE t_p88532089_it_company_website_r.blog_posts ADD COLUMN IF NOT EXISTS source VARCHAR(50) NULL;
ALTER TABLE t_p88532089_it_company_website_r.blog_posts ADD COLUMN IF NOT EXISTS source_slug VARCHAR(300) NULL;
ALTER TABLE t_p88532089_it_company_website_r.blog_posts ADD COLUMN IF NOT EXISTS source_url TEXT NULL;
ALTER TABLE t_p88532089_it_company_website_r.blog_posts ADD COLUMN IF NOT EXISTS summary TEXT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_source_slug_uq ON t_p88532089_it_company_website_r.blog_posts (source, source_slug);
INSERT INTO t_p88532089_it_company_website_r.cron_state (key) VALUES ('uchispro_sync') ON CONFLICT (key) DO NOTHING;