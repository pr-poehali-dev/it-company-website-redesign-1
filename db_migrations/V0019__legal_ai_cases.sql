CREATE TABLE IF NOT EXISTS t_p88532089_it_company_website_r.legal_cases (
  id serial PRIMARY KEY,
  title text NOT NULL,
  case_type text NOT NULL DEFAULT 'debt',
  opponent text DEFAULT '',
  opponent_inn text DEFAULT '',
  amount numeric DEFAULT 0,
  currency text DEFAULT 'RUB',
  status text NOT NULL DEFAULT 'new',
  description text DEFAULT '',
  contract_text text DEFAULT '',
  strategy jsonb,
  next_step text DEFAULT '',
  deadline_at date NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS t_p88532089_it_company_website_r.legal_messages (
  id serial PRIMARY KEY,
  case_id integer NOT NULL REFERENCES t_p88532089_it_company_website_r.legal_cases(id),
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS t_p88532089_it_company_website_r.legal_documents (
  id serial PRIMARY KEY,
  case_id integer NOT NULL REFERENCES t_p88532089_it_company_website_r.legal_cases(id),
  doc_type text NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_messages_case ON t_p88532089_it_company_website_r.legal_messages(case_id);
CREATE INDEX IF NOT EXISTS idx_legal_documents_case ON t_p88532089_it_company_website_r.legal_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_legal_cases_status ON t_p88532089_it_company_website_r.legal_cases(status);