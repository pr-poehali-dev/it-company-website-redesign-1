CREATE TABLE IF NOT EXISTS mag_learn_seen (
  source_slug VARCHAR(200) PRIMARY KEY,
  status VARCHAR(20) NOT NULL,
  post_id INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO mag_learn_seen (source_slug, status, post_id)
SELECT source_slug, 'duplicate', NULL FROM mag_posts WHERE origin = 'uchispro' AND id IN (16, 17, 18)
ON CONFLICT DO NOTHING;
UPDATE mag_posts SET published = FALSE, rubric = 'Скрыто: дубль', origin = 'uchispro_hidden' WHERE id IN (16, 17, 18) AND origin = 'uchispro';