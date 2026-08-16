import React from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar({ darkMode, onToggleDark }) {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="logo">
        <span className="logo-edi">Edi</span>
        <span className="logo-tech">Tech</span> <span className="logo-graphix">graphix</span>
      </div>
      <div className="nav-right">
        <span className="user-badge">
          User: <strong>{user?.full_name}</strong>
        </span>
        <button id="themeToggleBtn" className="btn-secondary" onClick={onToggleDark}>
          {darkMode ? "Light Mode" : "Dark Mode"}
        </button>
        <button className="btn-logout" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}
