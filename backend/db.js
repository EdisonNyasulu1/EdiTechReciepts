import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error(
    "Missing DATABASE_URL. Copy .env.example to .env and set your Neon connection string."
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle Postgres client", err);
});
