import express from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// All routes below require a valid login
router.use(requireAuth);

// GET /api/data  -> everything the dashboard needs in one call
router.get("/data", async (req, res) => {
  try {
    const revResult = await pool.query(
      `SELECT id,
              receipt_no      AS "receiptNo",
              doc_type        AS "docType",
              date_formatted  AS "date",
              customer_name   AS "customerName",
              discount,
              amount,
              raw_amount      AS "rawAmount"
       FROM transactions
       ORDER BY id DESC`
    );

    const expResult = await pool.query(
      `SELECT id,
              TO_CHAR(expense_date, 'YYYY-MM-DD') AS "date",
              category,
              description,
              amount
       FROM expenses
       ORDER BY id DESC`
    );

    res.json({
      revenueData: revResult.rows,
      expenseData: expResult.rows,
      user: { full_name: req.user.full_name },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transactions -> add a new receipt/invoice/quotation record
router.post("/transactions", async (req, res) => {
  const { receiptNo, docType, date, customerName, discount, amount, rawAmount } = req.body;

  try {
    const existing = await pool.query(
      "SELECT id FROM transactions WHERE receipt_no = $1 AND doc_type = $2",
      [receiptNo, docType]
    );

    if (existing.rows.length > 0) {
      return res.json({ success: false, message: "Record already exists." });
    }

    await pool.query(
      `INSERT INTO transactions
        (receipt_no, doc_type, date_formatted, customer_name, discount, amount, raw_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [receiptNo, docType, date, customerName, discount || "None", amount || 0, rawAmount]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/transactions  (body: { receiptNo, docType })
router.delete("/transactions", async (req, res) => {
  const { receiptNo, docType } = req.body;
  try {
    await pool.query(
      "DELETE FROM transactions WHERE receipt_no = $1 AND doc_type = $2",
      [receiptNo, docType]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/expenses -> add a new expense
router.post("/expenses", async (req, res) => {
  const { date, category, desc, amount } = req.body;
  try {
    await pool.query(
      `INSERT INTO expenses (expense_date, category, description, amount)
       VALUES ($1, $2, $3, $4)`,
      [date, category, desc, amount || 0]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/expenses/:id
router.delete("/expenses/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM expenses WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
