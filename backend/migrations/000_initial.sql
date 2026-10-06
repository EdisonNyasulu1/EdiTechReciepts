-- 000_initial.sql
-- Creates the original tables. On a database that already has them (like yours) this does nothing.

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,          -- bcrypt hash (created by `npm run seed`)
    full_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    receipt_no VARCHAR(50) NOT NULL,
    doc_type VARCHAR(20) NOT NULL,           -- Receipt | Invoice | Quotation
    date_formatted VARCHAR(50) NOT NULL,     -- e.g. "12 August 2026"
    customer_name VARCHAR(150) NOT NULL,
    discount VARCHAR(50) DEFAULT 'None',
    amount NUMERIC(12,2) NOT NULL,
    raw_amount VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    expense_date DATE NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
