UPDATE t_p88532089_it_company_website_r.radar_companies
SET enrich_status = 'new', website = '', website_confidence = '', emails = '', phones = '', site_candidates = '', enrich_note = '', enriched_at = NULL,
    contacts_source = CASE WHEN head <> '' THEN 'ЕГРЮЛ' ELSE '' END
WHERE website_confidence = 'medium';