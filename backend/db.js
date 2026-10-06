import pg from "pg";
import { config } from "./config.js";

// Return NUMERIC columns (amounts) as real numbers instead of strings
pg.types.setTypeParser(1700, (value) => parseFloat(value));

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.dbSsl ? { rejectUnauthorized: config.dbSslRejectUnauthorized } : false,
  max: config.dbPoolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000, // Neon can take a few seconds to wake up
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle Postgres client:", err.message);
});

export async function checkDb() {
  await pool.query("SELECT 1");
}
