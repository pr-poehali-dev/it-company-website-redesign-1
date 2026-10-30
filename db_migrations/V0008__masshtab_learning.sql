ALTER TABLE mag_posts ADD COLUMN IF NOT EXISTS track VARCHAR(40);
ALTER TABLE mag_posts ADD COLUMN IF NOT EXISTS origin VARCHAR(20) NOT NULL DEFAULT 'editorial';
ALTER TABLE mag_posts ADD COLUMN IF NOT EXISTS source_slug VARCHAR(200);
CREATE UNIQUE INDEX IF NOT EXISTS mag_posts_origin_src_uq ON mag_posts (origin, source_slug) WHERE source_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS mag_posts_track_idx ON mag_posts (rubric, track, published_at DESC);

CREATE TABLE IF NOT EXISTS mag_learn_log (
  id SERIAL PRIMARY KEY,
  kind VARCHAR(20) NOT NULL,
  ok BOOLEAN NOT NULL DEFAULT TRUE,
  info JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS mag_learn_log_kind_idx ON mag_learn_log (kind, created_at DESC);