import React from "react";

const TABS = [
  { key: "generator", label: "Generator" },
  { key: "financials", label: "Financials" },
  { key: "expenses", label: "Expenses" },
  { key: "tools", label: "Backup & Data" },
];

export default function TabNav({ activeTab, onChange }) {
  return (
    <div className="tab-navigation">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          className={`tab-btn ${activeTab === tab.key ? "active" : ""}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
