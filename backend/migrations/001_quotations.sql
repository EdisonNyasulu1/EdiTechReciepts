-- 001_quotations.sql
-- Nothing is deleted or rewritten; existing receipts, invoices and expenses stay exactly as they are.

-- Store every field of a document (items, phone, due date, purpose, quantity, ...)
-- so old documents can be re-opened, re-downloaded and re-shared from the Financials tab.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS details JSONB;

-- Remember which user created each record
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Room for longer customer names / discount text (widening is always safe)
ALTER TABLE transactions ALTER COLUMN customer_name   TYPE VARCHAR(255);
ALTER TABLE transactions ALTER COLUMN discount        TYPE VARCHAR(100);
ALTER TABLE transactions ALTER COLUMN date_formatted  TYPE VARCHAR(100);
ALTER TABLE transactions ALTER COLUMN raw_amount      TYPE VARCHAR(100);

-- Stop the same document number being saved twice per type (e.g. two "QT-007" quotations).
-- If duplicates already exist the index is skipped and a notice tells you how to find them.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uq_transactions_receipt_doc') THEN
    IF EXISTS (SELECT 1 FROM transactions GROUP BY receipt_no, doc_type HAVING COUNT(*) > 1) THEN
      RAISE NOTICE 'Duplicate (receipt_no, doc_type) rows exist - unique index NOT created. Find them with: SELECT receipt_no, doc_type, COUNT(*) FROM transactions GROUP BY 1,2 HAVING COUNT(*) > 1;';
    ELSE
      CREATE UNIQUE INDEX uq_transactions_receipt_doc ON transactions (receipt_no, doc_type);
    END IF;
  END IF;
END $$;

-- Faster "latest first" listing as the number of records grows
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at DESC);
