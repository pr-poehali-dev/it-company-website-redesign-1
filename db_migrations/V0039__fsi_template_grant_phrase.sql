UPDATE t_p88532089_it_company_website_r.email_templates
SET body = REPLACE(body, '{company} получила грант фонда в {grant_year} году, поэтому решил поделиться.', '{grant_phrase}, поэтому решил поделиться.')
WHERE code = 'fsi';

INSERT INTO t_p88532089_it_company_website_r.campaign_settings (key, value) VALUES ('reply_to', '')
ON CONFLICT (key) DO NOTHING;