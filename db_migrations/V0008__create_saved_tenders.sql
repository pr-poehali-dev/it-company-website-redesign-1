CREATE TABLE IF NOT EXISTS saved_tenders (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) NOT NULL,
    source VARCHAR(100) NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC DEFAULT 0,
    price_fmt VARCHAR(100) DEFAULT '',
    customer TEXT DEFAULT '',
    end_date VARCHAR(50) DEFAULT '',
    law VARCHAR(50) DEFAULT '',
    status VARCHAR(100) DEFAULT '',
    region TEXT DEFAULT '',
    url TEXT DEFAULT '',
    note TEXT DEFAULT '',
    analysis JSONB DEFAULT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(external_id, source)
);