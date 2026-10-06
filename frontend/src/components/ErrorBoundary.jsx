import React from "react";

// Shows a friendly screen instead of a blank page if something unexpected breaks while rendering.
export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unexpected UI error:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="loading-screen" style={{ flexDirection: "column", gap: "1rem", textAlign: "center", padding: "1rem" }}>
        <h2>Something went wrong</h2>
        <p>Please reload the page. If it keeps happening, tell your administrator.</p>
        <button className="btn-primary" style={{ maxWidth: 240 }} onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}
