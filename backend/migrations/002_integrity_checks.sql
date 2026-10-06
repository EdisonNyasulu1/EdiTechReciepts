-- 002_integrity_checks.sql
-- Database-level safety nets. NOT VALID = applies to new/changed rows only, so existing data can never block this.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_doc_type') THEN
    ALTER TABLE transactions
      ADD CONSTRAINT chk_transactions_doc_type CHECK (doc_type IN ('Receipt', 'Invoice', 'Quotation')) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_amount') THEN
    ALTER TABLE transactions
      ADD CONSTRAINT chk_transactions_amount CHECK (amount >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_expenses_amount') THEN
    ALTER TABLE expenses
      ADD CONSTRAINT chk_expenses_amount CHECK (amount > 0) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (expense_date DESC);
