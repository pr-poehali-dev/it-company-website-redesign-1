UPDATE t_p88532089_it_company_website_r.radar_companies
SET enrich_status = 'verify', site_candidates = website, website = '', website_confidence = '', emails = '', phones = '', enriched_at = NULL,
    contacts_source = CASE WHEN head <> '' THEN 'ЕГРЮЛ' ELSE '' END
WHERE website_confidence = 'medium';