import { test } from "node:test";
import assert from "node:assert/strict";
import { buildConfig, ConfigError } from "../buildConfig.js";

const GOOD = {
  DATABASE_URL: "postgresql://user:pw@ep-cool-123.us-east-2.aws.neon.tech/neondb?sslmode=require",
  JWT_SECRET: "a".repeat(40),
};

const problemsOf = (env) => {
  try {
    buildConfig(env);
    return [];
  } catch (e) {
    assert.ok(e instanceof ConfigError);
    return e.problems;
  }
};

test("valid development config gets sensible defaults", () => {
  const c = buildConfig(GOOD);
  assert.equal(c.port, 5000);
  assert.equal(c.isProd, false);
  assert.deepEqual([...c.clientOrigins], ["http://localhost:5173"]);
  assert.equal(c.cookie.sameSite, "lax");
  assert.equal(c.cookie.secure, false);
  assert.equal(c.cookie.maxAge, 8 * 3600 * 1000);
  assert.equal(c.trustProxy, 0);
  assert.equal(c.dbSsl, true); // Neon host => SSL on
});

test("localhost database turns SSL off automatically", () => {
  const c = buildConfig({ ...GOOD, DATABASE_URL: "postgresql://postgres:pw@localhost:5432/editech" });
  assert.equal(c.dbSsl, false);
});

test("DB_SSL overrides the automatic choice", () => {
  assert.equal(buildConfig({ ...GOOD, DB_SSL: "false" }).dbSsl, false);
});

test("missing DATABASE_URL and JWT_SECRET are reported together", () => {
  const p = problemsOf({});
  assert.equal(p.length, 2);
  assert.match(p.join(" "), /DATABASE_URL/);
  assert.match(p.join(" "), /JWT_SECRET/);
});

test("invalid DATABASE_URL is rejected", () => {
  assert.match(problemsOf({ ...GOOD, DATABASE_URL: "not a url" }).join(" "), /not a valid connection string/);
});

test("production needs a 32+ character secret and CLIENT_URL", () => {
  const p = problemsOf({ ...GOOD, NODE_ENV: "production", JWT_SECRET: "short-secret-123456" });
  assert.match(p.join(" "), /at least 32/);
  assert.match(p.join(" "), /CLIENT_URL is required/);
});

test("production defaults: secure cookie, SameSite=None, trust proxy", () => {
  const c = buildConfig({ ...GOOD, NODE_ENV: "production", CLIENT_URL: "https://editech.vercel.app/" });
  assert.equal(c.cookie.secure, true);
  assert.equal(c.cookie.sameSite, "none");
  assert.equal(c.trustProxy, 1);
  assert.deepEqual([...c.clientOrigins], ["https://editech.vercel.app"]); // trailing slash removed
});

test("several allowed origins can be given", () => {
  const c = buildConfig({ ...GOOD, CLIENT_URL: "http://localhost:5173, https://editech.vercel.app" });
  assert.deepEqual([...c.clientOrigins], ["http://localhost:5173", "https://editech.vercel.app"]);
});

test("CLIENT_URL with a path or junk is rejected", () => {
  assert.match(problemsOf({ ...GOOD, CLIENT_URL: "https://site.com/app" }).join(" "), /not a valid website address/);
  assert.match(problemsOf({ ...GOOD, CLIENT_URL: "site.com" }).join(" "), /not a valid website address/);
});

test("placeholder secrets are rejected", () => {
  assert.match(problemsOf({ ...GOOD, JWT_SECRET: "please-change-me-to-something-long" }).join(" "), /placeholder/);
});

test("SameSite=None is refused outside production", () => {
  assert.match(problemsOf({ ...GOOD, COOKIE_SAMESITE: "none" }).join(" "), /HTTPS/);
  assert.match(problemsOf({ ...GOOD, COOKIE_SAMESITE: "sometimes" }).join(" "), /lax/);
});

test("numeric settings are validated", () => {
  assert.match(problemsOf({ ...GOOD, PORT: "abc" }).join(" "), /PORT/);
  assert.match(problemsOf({ ...GOOD, SESSION_HOURS: "0" }).join(" "), /SESSION_HOURS/);
  assert.match(problemsOf({ ...GOOD, LOGIN_MAX_ATTEMPTS: "0" }).join(" "), /LOGIN_MAX_ATTEMPTS/);
});

test("config object cannot be changed after creation", () => {
  const c = buildConfig(GOOD);
  assert.throws(() => {
    "use strict";
    c.port = 1;
  });
});
