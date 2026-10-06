// "/api" works in both places:
//   - local development: Vite forwards /api to http://localhost:5000 (see vite.config.js)
//   - production: Vercel forwards /api to your backend (see vercel.json)
// Both make the login cookie "first-party", which is the most reliable setup on phones/Safari.
// Set VITE_API_URL only if you want the browser to talk to the backend directly.
const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status; // 0 = could not reach the server
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      credentials: "include", // send/receive the httpOnly login cookie
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your internet connection and try again.", 0);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    // The login ran out (8 hours by default): tell the app so it can send the person back to the login page.
    if (res.status === 401 && !path.startsWith("/auth/")) {
      window.dispatchEvent(new Event("auth:expired"));
    }
    const fallback = res.status >= 500 ? "The server had a problem. Please try again in a moment." : `Request failed (${res.status})`;
    throw new ApiError(data?.error || fallback, res.status);
  }

  return data;
}

export const api = {
  login: (username, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),

  fetchAll: () => request("/data"),

  addTransaction: (payload) => request("/transactions", { method: "POST", body: JSON.stringify(payload) }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: "DELETE" }),

  addExpense: (payload) => request("/expenses", { method: "POST", body: JSON.stringify(payload) }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: "DELETE" }),
};
