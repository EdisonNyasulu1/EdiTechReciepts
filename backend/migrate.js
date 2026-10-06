// Applies any new .sql files from ./migrations, in order, each inside a transaction.
// Safe to run any number of times:  npm run migrate
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db.js";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

async function run() {
  const client = await pool.connect();
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         name TEXT PRIMARY KEY,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`
    );
    const { rows } = await client.query("SELECT name FROM schema_migrations");
    const done = new Set(rows.map((r) => r.name));

    const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
    let applied = 0;

    for (const file of files) {
      if (done.has(file)) continue;
      console.log(`Applying ${file} ...`);
      const sql = await fs.readFile(path.join(dir, file), "utf8");
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        applied++;
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`${file} failed and was rolled back: ${err.message}`);
      }
    }

    console.log(applied ? `Done - ${applied} migration(s) applied.` : "Database is already up to date.");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
