UPDATE t_p88532089_it_company_website_r.radar_companies
SET enrich_status = 'new', site_candidates = '', enrich_note = ''
WHERE enrich_status IN ('verify', 'verifying', 'processing', 'searching')
   OR (enrich_status = 'empty' AND website = '');