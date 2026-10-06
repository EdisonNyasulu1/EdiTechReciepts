import React, { useCallback, useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import TabNav from "../components/TabNav.jsx";
import Generator from "../components/Generator.jsx";
import Financials from "../components/Financials.jsx";
import Expenses from "../components/Expenses.jsx";
import Tools from "../components/Tools.jsx";
import { api } from "../api";

function readTheme() {
  try {
    return localStorage.getItem("editech-theme") === "dark";
  } catch {
    return false;
  }
}

function Dashboard() {
  const [activeTab, setActiveTab] = useState("generator");
  const [darkMode, setDarkMode] = useState(readTheme);
  const [revenueData, setRevenueData] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const data = await api.fetchAll();
      setRevenueData(data.revenueData || []);
      setExpenseData(data.expenseData || []);
      setLoadError("");
    } catch (err) {
      console.error("Error connecting to API:", err);
      setLoadError(err.message || "Could not load your data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
    try {
      localStorage.setItem("editech-theme", darkMode ? "dark" : "light");
    } catch {
      /* private browsing - ignore */
    }
  }, [darkMode]);

  return (
    <>
      <Navbar darkMode={darkMode} onToggleDark={() => setDarkMode((d) => !d)} />

      <TabNav activeTab={activeTab} onChange={setActiveTab} />

      <main className="container">
        {loading ? (
          <div className="card">
            <p>Loading your data...</p>
          </div>
        ) : (
          <>
            {loadError && (
              <div className="alert-error" style={{ marginTop: "1rem" }}>
                {loadError} The numbers below may be out of date.{" "}
                <button type="button" className="doc-banner-btn" onClick={loadData}>
                  Try again
                </button>
              </div>
            )}
            {activeTab === "generator" && <Generator revenueData={revenueData} onTransactionSaved={loadData} />}
            {activeTab === "financials" && (
              <Financials revenueData={revenueData} expenseData={expenseData} onDataChanged={loadData} />
            )}
            {activeTab === "expenses" && <Expenses expenseData={expenseData} onDataChanged={loadData} />}
            {activeTab === "tools" && (
              <Tools revenueData={revenueData} expenseData={expenseData} onDataChanged={loadData} />
            )}
          </>
        )}
      </main>
    </>
  );
}

export default Dashboard;
