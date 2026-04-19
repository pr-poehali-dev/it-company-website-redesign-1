CREATE TABLE IF NOT EXISTS admin_sessions (
    token VARCHAR(64) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    username VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);