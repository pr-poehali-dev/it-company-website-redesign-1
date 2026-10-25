UPDATE t_p88532089_it_company_website_r.radar_companies
SET enrich_status = 'new', enrich_attempts = 0, enrich_note = ''
WHERE enrich_status = 'error' AND enrich_note LIKE 'DaData: HTTP 403%';