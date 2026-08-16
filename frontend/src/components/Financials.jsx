import React, { useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { api } from "../api";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function Financials({ revenueData, expenseData, onDataChanged }) {
  const [filter, setFilter] = useState("");

  const totalRevenue = useMemo(
    () =>
      revenueData
        .filter((r) => r.docType === "Receipt" || r.docType === "Invoice")
        .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0),
    [revenueData]
  );

  const totalExpenses = useMemo(
    () => expenseData.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0),
    [expenseData]
  );

  const netProfit = totalRevenue - totalExpenses;

  const filteredRows = useMemo(() => {
    const f = filter.toLowerCase();
    if (!f) return revenueData;
    return revenueData.filter(
      (item) =>
        item.customerName?.toLowerCase().includes(f) ||
        item.receiptNo?.toLowerCase().includes(f) ||
        item.docType?.toLowerCase().includes(f)
    );
  }, [revenueData, filter]);

  const chartData = useMemo(() => {
    const monthlyTotals = {};
    revenueData
      .filter((d) => d.docType === "Receipt" || d.docType === "Invoice")
      .forEach((d) => {
        let monthKey = "Unspecified";
        if (d.date) {
          const parts = d.date.split(" ");
          monthKey = parts.length >= 3 ? `${parts[1]} ${parts[2]}` : d.date.substring(0, 7);
        }
        monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + parseFloat(d.amount || 0);
      });

    const labels = Object.keys(monthlyTotals).length > 0 ? Object.keys(monthlyTotals) : ["No Data"];
    const data = Object.values(monthlyTotals).length > 0 ? Object.values(monthlyTotals) : [0];

    return {
      labels,
      datasets: [
        {
          label: "Monthly Revenue (MWK)",
          data,
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
    plugins: {
      legend: {
        display: true,
        labels: { color: "#270540", font: { family: "Poppins", weight: "bold" } },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (v) => "MWK " + Number(v).toLocaleString() },
      },
    },
  };

  async function handleDelete(receiptNo, docType) {
    if (!window.confirm(`Are you sure you want to delete ${docType} #${receiptNo}?`)) return;
    await api.deleteTransaction(receiptNo, docType);
    await onDataChanged();
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

      <div className="chart-container">
        <h3>Monthly Breakdown Graph</h3>
        <Bar data={chartData} options={chartOptions} />
      </div>

      <div className="filter-box">
        <input
          type="text"
          placeholder="Search by customer, receipt #, or doc type..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="table-card">
        <h3>Transaction Records</h3>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Receipt #</th>
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
                filteredRows.map((item) => (
                  <tr key={`${item.docType}-${item.receiptNo}-${item.id}`}>
                    <td>{item.date}</td>
                    <td>
                      <strong>{item.docType}</strong>
                    </td>
                    <td>#{item.receiptNo}</td>
                    <td>{item.customerName}</td>
                    <td>{item.discount}</td>
                    <td>MWK {Number(item.amount).toLocaleString()}</td>
                    <td>
                      <button className="btn-delete" onClick={() => handleDelete(item.receiptNo, item.docType)}>
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
