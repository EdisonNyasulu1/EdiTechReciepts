import React, { useRef, useState } from "react";
import { api } from "../api";

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Wrap in quotes and escape quotes, so names with commas, quotes or # don't break the file
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

const expenseKey = (e) => [e.date, e.category, e.description ?? e.desc, Number(e.amount)].join("|");

export default function Tools({ revenueData, expenseData, onDataChanged }) {
  const fileInputRef = useRef(null);
  const [restoring, setRestoring] = useState(false);
  const [result, setResult] = useState(null); // { ok: boolean, text: string }

  function handleExportCsv() {
    const header = ["Date", "DocType", "Number", "Customer", "Discount", "Amount"].join(",");
    const rows = revenueData.map((r) =>
      [r.date, r.docType, r.receiptNo, r.customerName, r.discount, r.amount].map(csvCell).join(",")
    );
    // \uFEFF makes Excel read the file as UTF-8
    download(new Blob(["\uFEFF" + [header, ...rows].join("\r\n")], { type: "text/csv;charset=utf-8" }), "EdiTech_Financial_Report.csv");
  }

  function handleBackupJson() {
    const blob = new Blob([JSON.stringify({ revenueData, expenseData }, null, 2)], { type: "application/json" });
    download(blob, `EdiTech_Backup_${new Date().toISOString().slice(0, 10)}.json`);
  }

  async function handleRestoreFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoring(true);
    setResult(null);
    const counts = { added: 0, skipped: 0, failed: 0 };

    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed.revenueData) && !Array.isArray(parsed.expenseData)) {
        throw new Error("not a backup");
      }

      for (const r of parsed.revenueData || []) {
        try {
          await api.addTransaction({
            receiptNo: r.receiptNo,
            docType: r.docType,
            date: r.date,
            customerName: r.customerName,
            discount: r.discount,
            amount: r.amount,
            rawAmount: r.rawAmount,
            details: r.details || undefined,
          });
          counts.added++;
        } catch (err) {
          if (err.status === 409) counts.skipped++; // already in the system
          else if (err.status === 401) throw err;
          else counts.failed++;
        }
      }

      // expenses have no unique number, so compare the contents to avoid adding them twice
      const have = new Set(expenseData.map(expenseKey));
      for (const exp of parsed.expenseData || []) {
        if (have.has(expenseKey(exp))) {
          counts.skipped++;
          continue;
        }
        try {
          await api.addExpense({ date: exp.date, category: exp.category, desc: exp.description, amount: exp.amount });
          have.add(expenseKey(exp));
          counts.added++;
        } catch (err) {
          if (err.status === 401) throw err;
          counts.failed++;
        }
      }

      await onDataChanged();
      setResult({
        ok: counts.failed === 0,
        text: `Restore finished: ${counts.added} added, ${counts.skipped} already existed${
          counts.failed ? `, ${counts.failed} could not be restored` : ""
        }.`,
      });
    } catch (err) {
      console.error(err);
      setResult({ ok: false, text: "Could not restore that file. Make sure it is a valid EdiTech backup (.json)." });
    } finally {
      setRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="card tab-content active">
      <h2>Data Backup & Export</h2>
      <p>Export financial data or transfer records across devices.</p>

      <div className="tools-grid">
        <div className="tool-box">
          <h3>Export to Excel (CSV)</h3>
          <p>Download transaction records in spreadsheet format.</p>
          <button className="btn-action" onClick={handleExportCsv}>
            Export CSV
          </button>
        </div>

        <div className="tool-box">
          <h3>Backup System Data</h3>
          <p>Download a JSON backup of all receipts, invoices, quotations and expenses.</p>
          <button className="btn-action" onClick={handleBackupJson}>
            Download Backup
          </button>
        </div>

        <div className="tool-box">
          <h3>Restore System Data</h3>
          <p>Upload a previously saved JSON backup. Records that already exist are skipped.</p>
          <input type="file" accept=".json" ref={fileInputRef} style={{ display: "none" }} onChange={handleRestoreFile} />
          <button className="btn-secondary-dark" disabled={restoring} onClick={() => fileInputRef.current?.click()}>
            {restoring ? "Restoring..." : "Restore Backup"}
          </button>
        </div>
      </div>

      {result && <div className={`doc-banner ${result.ok ? "ok" : "err"}`}>{result.text}</div>}
    </div>
  );
}
