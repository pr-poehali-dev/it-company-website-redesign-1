ALTER TABLE pipe_users ADD COLUMN IF NOT EXISTS biz_plan VARCHAR(20) NOT NULL DEFAULT 'free';
ALTER TABLE pipe_users ADD COLUMN IF NOT EXISTS biz_plan_until TIMESTAMPTZ;
ALTER TABLE pipe_users ADD COLUMN IF NOT EXISTS phone VARCHAR(60);
ALTER TABLE pipe_users ADD COLUMN IF NOT EXISTS source VARCHAR(30);

CREATE TABLE IF NOT EXISTS biz_unlocks (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES pipe_users(id),
  kind VARCHAR(20) NOT NULL,
  key VARCHAR(40) NOT NULL,
  title VARCHAR(300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, kind, key)
);
CREATE INDEX IF NOT EXISTS biz_unlocks_user_idx ON biz_unlocks (user_id, kind, created_at DESC);

CREATE TABLE IF NOT EXISTS biz_watch (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES pipe_users(id),
  inn VARCHAR(12) NOT NULL,
  name VARCHAR(500),
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_checked_at TIMESTAMPTZ,
  last_change_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, inn)
);
CREATE INDEX IF NOT EXISTS biz_watch_check_idx ON biz_watch (last_checked_at NULLS FIRST) WHERE active;
