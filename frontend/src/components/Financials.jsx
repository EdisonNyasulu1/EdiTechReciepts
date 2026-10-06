import React, { useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";
import { api } from "../api";
import PreviewModal from "./PreviewModal.jsx";
import { recordToDoc } from "../utils/documents.js";
import { MONTHS, formatMoney, parseLongDate } from "../utils/format.js";
import "../styles/documents.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const isRevenue = (r) => r.docType === "Receipt" || r.docType === "Invoice";

export default function Financials({ revenueData, expenseData, onDataChanged }) {
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState("");

  const totalRevenue = useMemo(
    () => revenueData.filter(isRevenue).reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0),
    [revenueData]
  );
  const totalExpenses = useMemo(() => expenseData.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0), [expenseData]);
  const netProfit = totalRevenue - totalExpenses;

  const quotes = useMemo(() => revenueData.filter((r) => r.docType === "Quotation"), [revenueData]);
  const quotedValue = useMemo(() => quotes.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0), [quotes]);

  const filteredRows = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return revenueData.filter((item) => {
      if (typeFilter !== "All" && item.docType !== typeFilter) return false;
      if (!f) return true;
      return (
        item.customerName?.toLowerCase().includes(f) ||
        item.receiptNo?.toLowerCase().includes(f) ||
        item.docType?.toLowerCase().includes(f)
      );
    });
  }, [revenueData, filter, typeFilter]);

  // Monthly revenue in calendar order (dates that can't be read go to "Unspecified" at the end)
  const chartData = useMemo(() => {
    const buckets = new Map();
    revenueData.filter(isRevenue).forEach((d) => {
      const p = parseLongDate(d.date);
      const key = p ? `${p.year}-${String(p.month + 1).padStart(2, "0")}` : "zz-unspecified";
      const label = p ? `${MONTHS[p.month]} ${p.year}` : "Unspecified";
      const b = buckets.get(key) || { label, total: 0 };
      b.total += parseFloat(d.amount) || 0;
      buckets.set(key, b);
    });
    const ordered = [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
    return {
      labels: ordered.length ? ordered.map((b) => b.label) : ["No Data"],
      datasets: [
        {
          label: "Monthly Revenue (MWK)",
          data: ordered.length ? ordered.map((b) => b.total) : [0],
          backgroundColor: "#fd991d",
          borderColor: "#270540",
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    };
  }, [revenueData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, labels: { color: "#270540", font: { family: "Poppins", weight: "bold" } } } },
    scales: { y: { beginAtZero: true, ticks: { callback: (v) => `MWK ${Number(v).toLocaleString()}` } } },
  };

  async function handleDelete(item) {
    if (!window.confirm(`Are you sure you want to delete ${item.docType} #${item.receiptNo}?`)) return;
    setError("");
    try {
      await api.deleteTransaction(item.id);
      await onDataChanged();
    } catch (err) {
      setError(`Could not delete ${item.docType} #${item.receiptNo}: ${err.message}`);
    }
  }

  return (
    <div className="card tab-content active">
      <h2>Financial Overview</h2>
      <p>Monitor earnings, expenses, and net profits.</p>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Revenue</h3>
          <div className="stat-amount">MWK {totalRevenue.toLocaleString()}</div>
        </div>
        <div className="stat-card expense-card">
          <h3>Total Expenses</h3>
          <div className="stat-amount">MWK {totalExpenses.toLocaleString()}</div>
        </div>
        <div className="stat-card profit-card">
          <h3>Net Profit</h3>
          <div className="stat-amount">MWK {netProfit.toLocaleString()}</div>
        </div>
      </div>

      {quotes.length > 0 && (
        <p className="fin-note">
          {quotes.length} quotation{quotes.length === 1 ? "" : "s"} issued, worth MWK {formatMoney(quotedValue)} (not counted as revenue).
        </p>
      )}

      <div className="chart-container">
        <h3>Monthly Breakdown Graph</h3>
        <Bar data={chartData} options={chartOptions} />
      </div>

      <div className="filter-box fin-filters">
        <input
          type="text"
          placeholder="Search by customer, number, or doc type..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <select aria-label="Filter by document type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="All">All types</option>
          <option value="Receipt">Receipts</option>
          <option value="Invoice">Invoices</option>
          <option value="Quotation">Quotations</option>
        </select>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="table-card">
        <h3>Transaction Records</h3>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>No.</th>
                <th>Customer</th>
                <th>Discount</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", color: "#888" }}>
                    No records found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((item) => {
                  const doc = recordToDoc(item);
                  return (
                    <tr key={item.id}>
                      <td>{item.date}</td>
                      <td>
                        <strong>{item.docType}</strong>
                      </td>
                      <td>#{item.receiptNo}</td>
                      <td>{item.customerName}</td>
                      <td>{item.discount}</td>
                      <td>MWK {Number(item.amount).toLocaleString()}</td>
                      <td className="row-actions">
                        {doc ? (
                          <button className="btn-view" onClick={() => setViewing(doc)}>
                            View
                          </button>
                        ) : (
                          <span className="row-note" title="Saved before full details were stored">
                            –
                          </span>
                        )}
                        <button className="btn-delete" onClick={() => handleDelete(item)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && <PreviewModal doc={viewing} saved onClose={() => setViewing(null)} />}
    </div>
  );
}
