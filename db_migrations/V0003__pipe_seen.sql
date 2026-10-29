CREATE TABLE IF NOT EXISTS pipe_seen (
  source_id INT NOT NULL REFERENCES pipe_sources(id),
  item_key VARCHAR(64) NOT NULL,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (source_id, item_key)
);