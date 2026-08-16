// One-off script to create your first login user.
// Usage:  node seed.js "admin" "yourPassword123" "Yamikani Nyasulu"

import bcrypt from "bcryptjs";
import { pool } from "./db.js";

async function seed() {
  const [, , username, password, fullName] = process.argv;

  if (!username || !password || !fullName) {
    console.log('Usage: node seed.js "<username>" "<password>" "<Full Name>"');
    process.exit(1);
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const existing = await pool.query("SELECT id FROM users WHERE username = $1", [username]);

    if (existing.rows.length > 0) {
      await pool.query(
        "UPDATE users SET password = $1, full_name = $2 WHERE username = $3",
        [hash, fullName, username]
      );
      console.log(`Updated existing user "${username}".`);
    } else {
      await pool.query(
        "INSERT INTO users (username, password, full_name) VALUES ($1, $2, $3)",
        [username, hash, fullName]
      );
      console.log(`Created user "${username}".`);
    }
  } catch (err) {
    console.error("Seed failed:", err.message);
  } finally {
    await pool.end();
  }
}

seed();
