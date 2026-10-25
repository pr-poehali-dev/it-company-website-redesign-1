UPDATE t_p88532089_it_company_website_r.radar_companies
SET enrich_status = 'new', enrich_note = '', enriched_at = NULL, site_candidates = ''
WHERE enrich_status = 'empty' AND enrich_note = 'сайт не подтвердился';