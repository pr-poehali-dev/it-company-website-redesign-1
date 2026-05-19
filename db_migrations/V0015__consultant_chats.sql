CREATE TABLE IF NOT EXISTS consultant_chats (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    client_name VARCHAR(255),
    client_email VARCHAR(255),
    client_phone VARCHAR(64),
    client_company VARCHAR(255),
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    brief TEXT,
    is_sent BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,
    ip VARCHAR(64),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consultant_chats_session ON consultant_chats(session_id);
CREATE INDEX IF NOT EXISTS idx_consultant_chats_created ON consultant_chats(created_at DESC);
