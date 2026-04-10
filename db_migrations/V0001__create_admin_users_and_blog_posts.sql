CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO admin_users (username, password_hash)
VALUES ('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMzLnNGHkqpuXSQqv3bZ8lYGKi')
ON CONFLICT (username) DO NOTHING;

CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  tag VARCHAR(100) NOT NULL DEFAULT 'AI/ML',
  read_time VARCHAR(50) NOT NULL DEFAULT '5 мин',
  color VARCHAR(100) NOT NULL DEFAULT 'from-violet-500 to-purple-600',
  content TEXT NOT NULL DEFAULT '',
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
