import express from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { parseId, validateExpense, validateTransaction } from "../validators.js";

const router = express.Router();

// Everything below needs a valid login
router.use(requireAuth);

// Log the real error on the server; send a generic message to the browser
function serverError(res, err) {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server. Please try again." });
}

// GET /api/data -> everything the dashboard needs in one call
router.get("/data", async (req, res) => {
  try {
    const [revenue, expenses] = await Promise.all([
      pool.query(
        `SELECT id,
                receipt_no      AS "receiptNo",
                doc_type        AS "docType",
                date_formatted  AS "date",
                customer_name   AS "customerName",
                discount,
                amount,
                raw_amount      AS "rawAmount",
                details,
                created_at      AS "createdAt"
         FROM transactions
         ORDER BY id DESC`
      ),
      pool.query(
        `SELECT id,
                TO_CHAR(expense_date, 'YYYY-MM-DD') AS "date",
                category,
                description,
                amount
         FROM expenses
         ORDER BY id DESC`
      ),
    ]);

    res.json({
      revenueData: revenue.rows,
      expenseData: expenses.rows,
      user: { full_name: req.user.full_name },
    });
  } catch (err) {
    serverError(res, err);
  }
});

// POST /api/transactions -> save a receipt / invoice / quotation
// `details` (optional object) holds every field of the document so it can be re-opened later.
router.post("/transactions", async (req, res) => {
  const parsed = validateTransaction(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const t = parsed.value;

  try {
    const existing = await pool.query("SELECT id FROM transactions WHERE receipt_no = $1 AND doc_type = $2", [t.receiptNo, t.docType]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: `${t.docType} #${t.receiptNo} already exists.` });
    }

    const inserted = await pool.query(
      `INSERT INTO transactions
         (receipt_no, doc_type, date_formatted, customer_name, discount, amount, raw_amount, details, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
       RETURNING id`,
      [t.receiptNo, t.docType, t.date, t.customerName, t.discount, t.amount, t.rawAmount, t.details ? JSON.stringify(t.details) : null, req.user.id ?? null]
    );

    res.status(201).json({ success: true, id: inserted.rows[0].id });
  } catch (err) {
    // two requests raced past the check above and the unique index caught the second one
    if (err.code === "23505") return res.status(409).json({ error: `${t.docType} #${t.receiptNo} already exists.` });
    serverError(res, err);
  }
});

// DELETE /api/transactions/:id
router.delete("/transactions/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "Invalid record id." });
  try {
    const result = await pool.query("DELETE FROM transactions WHERE id = $1", [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Record not found." });
    res.json({ success: true });
  } catch (err) {
    serverError(res, err);
  }
});

// POST /api/expenses
router.post("/expenses", async (req, res) => {
  const parsed = validateExpense(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const e = parsed.value;

  try {
    await pool.query(
      `INSERT INTO expenses (expense_date, category, description, amount) VALUES ($1, $2, $3, $4)`,
      [e.date, e.category, e.desc, e.amount]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    serverError(res, err);
  }
});

// DELETE /api/expenses/:id
router.delete("/expenses/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "Invalid record id." });
  try {
    const result = await pool.query("DELETE FROM expenses WHERE id = $1", [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Record not found." });
    res.json({ success: true });
  } catch (err) {
    serverError(res, err);
  }
});

export default router;
