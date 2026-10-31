CREATE TABLE IF NOT EXISTS t_p88532089_it_company_website_r.orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_name VARCHAR(255),
    user_email VARCHAR(255) NOT NULL,
    user_phone VARCHAR(50),
    amount DECIMAL(10,2) NOT NULL,
    yookassa_payment_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    payment_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS t_p88532089_it_company_website_r.order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES t_p88532089_it_company_website_r.orders(id),
    product_id VARCHAR(100),
    product_name VARCHAR(255),
    product_price DECIMAL(10,2),
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON t_p88532089_it_company_website_r.orders(yookassa_payment_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON t_p88532089_it_company_website_r.orders(status);

CREATE TABLE IF NOT EXISTS t_p88532089_it_company_website_r.mag_custom_issues (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL DEFAULT 'Мой «Масштаб»',
    cover_name VARCHAR(200),
    cover_company VARCHAR(200),
    modules JSONB NOT NULL DEFAULT '[]'::jsonb,
    price INTEGER NOT NULL DEFAULT 990,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    order_id INTEGER,
    pdf_url TEXT,
    pages INTEGER,
    error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP,
    built_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mag_custom_user ON t_p88532089_it_company_website_r.mag_custom_issues(user_id);
CREATE INDEX IF NOT EXISTS idx_mag_custom_order ON t_p88532089_it_company_website_r.mag_custom_issues(order_id);