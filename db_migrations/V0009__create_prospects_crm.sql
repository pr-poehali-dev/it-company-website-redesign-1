CREATE TABLE IF NOT EXISTS prospect_projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#7c3aed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prospects (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES prospect_projects(id),
    company_name TEXT NOT NULL,
    inn TEXT,
    ogrn TEXT,
    industry TEXT,
    description TEXT,
    website TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    region TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    source_url TEXT,
    revenue_range TEXT,
    employee_count TEXT,
    founded_year INTEGER,
    status TEXT NOT NULL DEFAULT 'new',
    priority TEXT NOT NULL DEFAULT 'medium',
    note TEXT,
    next_action TEXT,
    next_action_date DATE,
    ai_score INTEGER,
    ai_summary TEXT,
    ai_reasons TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prospect_activities (
    id SERIAL PRIMARY KEY,
    prospect_id INTEGER NOT NULL REFERENCES prospects(id),
    activity_type TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospects_project ON prospects(project_id);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospect_activities_prospect ON prospect_activities(prospect_id);
