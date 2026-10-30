INSERT INTO mag_learn_seen (source_slug, status, post_id)
SELECT source_slug, 'duplicate', 5 FROM mag_posts WHERE id = 19 AND origin = 'uchispro'
ON CONFLICT (source_slug) DO UPDATE SET status = 'duplicate', post_id = 5;
UPDATE mag_posts SET published = FALSE, rubric = 'Скрыто: дубль', origin = 'uchispro_hidden' WHERE id = 19 AND origin = 'uchispro';