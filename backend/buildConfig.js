// Validates environment variables and returns the settings the server uses.
// Pure function (no side effects) so it can be unit-tested. See config.js for the real instance.

export class ConfigError extends Error {
  constructor(problems) {
    super(`Invalid configuration:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    this.name = "ConfigError";
    this.problems = problems;
  }
}

const truthy = (v) => /^(1|true|yes|on)$/i.test(String(v ?? "").trim());
const blank = (v) => v === undefined || v === null || String(v).trim() === "";
const LOCAL_HOSTS = new Set(["", "localhost", "127.0.0.1", "[::1]", "::1"]);

export function buildConfig(env = {}) {
  const problems = [];

  const nodeEnv = (env.NODE_ENV || "development").trim();
  const isProd = nodeEnv === "production";

  // ---- port ----
  const port = blank(env.PORT) ? 5000 : Number(env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) problems.push("PORT must be a whole number between 1 and 65535.");

  // ---- database ----
  const databaseUrl = (env.DATABASE_URL || "").trim();
  let dbHost = "";
  if (!databaseUrl) {
    problems.push("DATABASE_URL is missing. Copy .env.example to .env and paste your Neon connection string.");
  } else {
    try {
      dbHost = new URL(databaseUrl).hostname;
    } catch {
      problems.push("DATABASE_URL is not a valid connection string (expected postgresql://user:password@host/dbname).");
    }
  }
  const dbSsl = blank(env.DB_SSL) ? !LOCAL_HOSTS.has(dbHost) : truthy(env.DB_SSL);
  const dbSslRejectUnauthorized = blank(env.DB_SSL_REJECT_UNAUTHORIZED) ? true : truthy(env.DB_SSL_REJECT_UNAUTHORIZED);

  // ---- login signing secret ----
  const jwtSecret = env.JWT_SECRET || "";
  const minSecret = isProd ? 32 : 16;
  if (jwtSecret.length < minSecret) {
    problems.push(`JWT_SECRET must be at least ${minSecret} characters. Generate one with: npm run gen-secret`);
  } else if (/change[-_ ]?me|your[-_ ]?secret|replace[-_ ]?me|example/i.test(jwtSecret)) {
    problems.push("JWT_SECRET still looks like a placeholder. Generate a real one with: npm run gen-secret");
  }

  // ---- allowed website addresses (CORS) ----
  if (isProd && blank(env.CLIENT_URL)) {
    problems.push("CLIENT_URL is required in production. Set it to your website address, e.g. https://editech-graphix.vercel.app");
  }
  const clientOrigins = [];
  for (const raw of (blank(env.CLIENT_URL) ? "http://localhost:5173" : env.CLIENT_URL).split(",")) {
    const entry = raw.trim().replace(/\/+$/, "");
    if (!entry) continue;
    try {
      const u = new URL(entry);
      if (!/^https?:$/.test(u.protocol) || u.pathname !== "/" || u.search || u.hash) throw new Error("bad");
      clientOrigins.push(u.origin);
    } catch {
      problems.push(`CLIENT_URL entry "${entry}" is not a valid website address (example: https://my-site.vercel.app, no path).`);
    }
  }

  // ---- login cookie ----
  const sameSite = (blank(env.COOKIE_SAMESITE) ? (isProd ? "none" : "lax") : env.COOKIE_SAMESITE).trim().toLowerCase();
  if (!["lax", "strict", "none"].includes(sameSite)) problems.push('COOKIE_SAMESITE must be "lax", "strict" or "none".');
  if (sameSite === "none" && !isProd) problems.push('COOKIE_SAMESITE=none only works over HTTPS. Use "lax" for local development.');

  const sessionHours = blank(env.SESSION_HOURS) ? 8 : Number(env.SESSION_HOURS);
  if (!Number.isFinite(sessionHours) || sessionHours < 1 || sessionHours > 168) problems.push("SESSION_HOURS must be between 1 and 168.");

  const loginMaxAttempts = blank(env.LOGIN_MAX_ATTEMPTS) ? 10 : Number(env.LOGIN_MAX_ATTEMPTS);
  if (!Number.isInteger(loginMaxAttempts) || loginMaxAttempts < 1) problems.push("LOGIN_MAX_ATTEMPTS must be a whole number of 1 or more.");

  // ---- reverse proxy (Render, Railway, ...): needed to see the real visitor IP ----
  const trustProxy = blank(env.TRUST_PROXY) ? (isProd ? 1 : 0) : Number(env.TRUST_PROXY);
  if (!Number.isInteger(trustProxy) || trustProxy < 0) problems.push("TRUST_PROXY must be 0 or a positive whole number.");

  if (problems.length) throw new ConfigError(problems);

  return Object.freeze({
    nodeEnv,
    isProd,
    port,
    databaseUrl,
    dbSsl,
    dbSslRejectUnauthorized,
    dbPoolMax: 10,
    jwtSecret,
    clientOrigins: Object.freeze(clientOrigins),
    cookie: Object.freeze({
      httpOnly: true,
      secure: isProd,
      sameSite,
      path: "/",
      maxAge: sessionHours * 60 * 60 * 1000,
    }),
    sessionHours,
    loginMaxAttempts,
    trustProxy,
  });
}
