import React, { useState } from "react";
import { api } from "../api";

const EMPTY_EXPENSE = {
  date: "",
  category: "Internet / Bundles",
  desc: "",
  amount: "",
};

export default function Expenses({ expenseData, onDataChanged }) {
  const [form, setForm] = useState(EMPTY_EXPENSE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!(amount > 0)) {
      setError("Please enter an amount above zero.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.addExpense({ date: form.date, category: form.category, desc: form.desc.trim(), amount });
      setForm(EMPTY_EXPENSE);
      await onDataChanged();
    } catch (err) {
      setError(`Expense was not saved: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this expense record?")) return;
    setError("");
    try {
      await api.deleteExpense(id);
      await onDataChanged();
    } catch (err) {
      setError(`Could not delete the expense: ${err.message}`);
    }
  }

  return (
    <div className="card tab-content active">
      <h2>Business Expenses</h2>
      <p>Record tools, internet bundles, and design software costs.</p>

      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="expenseDate">Date:</label>
          <input type="date" id="expenseDate" value={form.date} onChange={handleChange("date")} required />
        </div>
        <div className="form-group">
          <label htmlFor="expenseCategory">Category:</label>
          <select id="expenseCategory" value={form.category} onChange={handleChange("category")}>
            <option value="Internet / Bundles">Internet / Bundles</option>
            <option value="Software / Subscriptions">Software / Subscriptions</option>
            <option value="Hardware / Equipment">Hardware / Equipment</option>
            <option value="Marketing / Ads">Marketing / Ads</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="form-group full-width">
          <label htmlFor="expenseDesc">Description:</label>
          <input
            id="expenseDesc"
            value={form.desc}
            onChange={handleChange("desc")}
            placeholder="e.g. Data Bundles / Adobe Creative Cloud"
            required
          />
        </div>
        <div className="form-group full-width">
          <label htmlFor="expenseAmount">Amount (MWK):</label>
          <input
            type="number"
            min="0"
            step="any"
            id="expenseAmount"
            value={form.amount}
            onChange={handleChange("amount")}
            placeholder="e.g. 15000"
            required
          />
        </div>
        {error && <div className="alert-error full-width">{error}</div>}
        <div className="form-group full-width">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Add Expense"}
          </button>
        </div>
      </form>

      <div className="table-card" style={{ marginTop: "1.5rem" }}>
        <h3>Expenses Log</h3>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {expenseData.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", color: "#888" }}>
                    No expenses recorded yet.
                  </td>
                </tr>
              ) : (
                expenseData.map((item) => (
                  <tr key={item.id}>
                    <td>{item.date}</td>
                    <td>
                      <strong>{item.category}</strong>
                    </td>
                    <td>{item.description}</td>
                    <td>MWK {Number(item.amount).toLocaleString()}</td>
                    <td>
                      <button className="btn-delete" onClick={() => handleDelete(item.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
