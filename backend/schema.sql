-- Run this once against your Neon database (Neon SQL Editor, or `psql $DATABASE_URL -f schema.sql`)

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,   -- bcrypt hash, NOT plain text / sha256
    full_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    receipt_no VARCHAR(50) NOT NULL,
    doc_type VARCHAR(20) NOT NULL,          -- Receipt | Invoice | Quotation
    date_formatted VARCHAR(100),            -- kept as free text, matches original "12 August 2026" style
    customer_name VARCHAR(255),
    discount VARCHAR(100) DEFAULT 'None',
    amount NUMERIC(12, 2) DEFAULT 0,
    raw_amount VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (receipt_no, doc_type)
);

CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    expense_date DATE,
    category VARCHAR(100),
    description TEXT,
    amount NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_receipt ON transactions (receipt_no, doc_type);
