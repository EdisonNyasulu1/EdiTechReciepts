import React, { useCallback, useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import TabNav from "../components/TabNav.jsx";
import Generator from "../components/Generator.jsx";
import Financials from "../components/Financials.jsx";
import Expenses from "../components/Expenses.jsx";
import Tools from "../components/Tools.jsx";
import { api } from "../api";

function Dashboard() {
  const [activeTab, setActiveTab] = useState("generator");
  const [darkMode, setDarkMode] = useState(false);
  const [revenueData, setRevenueData] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const data = await api.fetchAll();
      setRevenueData(data.revenueData || []);
      setExpenseData(data.expenseData || []);
    } catch (err) {
      console.error("Error connecting to API:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
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
            {activeTab === "generator" && <Generator onTransactionSaved={loadData} />}
            {activeTab === "financials" && (
              <Financials revenueData={revenueData} expenseData={expenseData} onDataChanged={loadData} />
            )}
            {activeTab === "expenses" && (
              <Expenses expenseData={expenseData} onDataChanged={loadData} />
            )}
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