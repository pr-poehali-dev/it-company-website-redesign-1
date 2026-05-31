CREATE TABLE IF NOT EXISTS saved_grants (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) NOT NULL,
    source VARCHAR(150) NOT NULL,
    name TEXT NOT NULL,
    fund TEXT DEFAULT '',
    amount NUMERIC DEFAULT 0,
    amount_fmt VARCHAR(100) DEFAULT '',
    category VARCHAR(150) DEFAULT '',
    deadline VARCHAR(50) DEFAULT '',
    region TEXT DEFAULT '',
    url TEXT DEFAULT '',
    description TEXT DEFAULT '',
    matched_product VARCHAR(150) DEFAULT '',
    note TEXT DEFAULT '',
    analysis JSONB,
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_grants_ext ON saved_grants(external_id, source);
