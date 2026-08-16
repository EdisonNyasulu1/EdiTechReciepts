import React, { useRef, useState } from "react";
import { api } from "../api";

export default function Tools({ revenueData, expenseData, onDataChanged }) {
  const fileInputRef = useRef(null);
  const [restoring, setRestoring] = useState(false);

  function handleExportCsv() {
    let csvContent = "data:text/csv;charset=utf-8,Date,DocType,ReceiptNo,Customer,Discount,Amount\n";
    revenueData.forEach((r) => {
      csvContent += `${r.date},${r.docType},${r.receiptNo},"${r.customerName}",${r.discount},${r.amount}\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "EdiTech_Financial_Report.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function handleBackupJson() {
    const fullBackup = { revenueData, expenseData };
    const link = document.createElement("a");
    link.setAttribute(
      "href",
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullBackup))
    );
    link.setAttribute("download", `EdiTech_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    link.click();
  }

  async function handleRestoreFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoring(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      for (const r of parsed.revenueData || []) {
        await api.addTransaction({
          receiptNo: r.receiptNo,
          docType: r.docType,
          date: r.date,
          customerName: r.customerName,
          discount: r.discount,
          amount: r.amount,
          rawAmount: r.rawAmount,
        });
      }

      for (const exp of parsed.expenseData || []) {
        await api.addExpense({
          date: exp.date,
          category: exp.category,
          desc: exp.description,
          amount: exp.amount,
        });
      }

      await onDataChanged();
      alert("Backup restored successfully.");
    } catch (err) {
      console.error(err);
      alert("Could not restore that file. Make sure it's a valid EdiTech backup JSON.");
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
          <p>Download a JSON backup of all receipts and expenses.</p>
          <button className="btn-action" onClick={handleBackupJson}>
            Download Backup
          </button>
        </div>

        <div className="tool-box">
          <h3>Restore System Data</h3>
          <p>Upload a previously saved JSON backup file.</p>
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleRestoreFile}
          />
          <button
            className="btn-secondary-dark"
            disabled={restoring}
            onClick={() => fileInputRef.current?.click()}
          >
            {restoring ? "Restoring..." : "Restore Backup"}
          </button>
        </div>
      </div>
    </div>
  );
}
