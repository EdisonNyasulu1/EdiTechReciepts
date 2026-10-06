// Creates (or updates) a login user.
//
//   npm run seed -- admin 'Your-Strong-Password' 'Edison Nyasulu'
//
// Tip (Windows PowerShell): use SINGLE quotes around the password so characters like $ or # are kept as typed.
// You can also set SEED_USERNAME, SEED_PASSWORD and SEED_FULL_NAME in the environment instead of arguments.
import bcrypt from "bcryptjs";
import { pool } from "./db.js";

const [, , argUser, argPass, argName] = process.argv;
const username = (argUser ?? process.env.SEED_USERNAME ?? "").trim();
const password = argPass ?? process.env.SEED_PASSWORD ?? "";
const fullName = (argName ?? process.env.SEED_FULL_NAME ?? "").trim();

function problem(msg) {
  console.error(`\n${msg}\n`);
  console.error("Usage: npm run seed -- <username> '<password>' '<Full Name>'\n");
  process.exit(1);
}

if (!/^[A-Za-z0-9._-]{3,50}$/.test(username)) problem("Username must be 3-50 characters: letters, numbers, dot, dash or underscore.");
if (password.length < 10) problem("Password must be at least 10 characters.");
if (password.length > 72) problem("Password must be at most 72 characters.");
if (!fullName || fullName.length > 100) problem("Full name is required (max 100 characters).");

try {
  const hash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (username, password, full_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, full_name = EXCLUDED.full_name
     RETURNING (xmax = 0) AS inserted`,
    [username, hash, fullName]
  );
  console.log(result.rows[0].inserted ? `Created user "${username}".` : `Updated existing user "${username}" (new password and name saved).`);
} catch (err) {
  console.error("Seed failed:", err.message);
  console.error('Did you run "npm run migrate" first?');
  process.exitCode = 1;
} finally {
  await pool.end();
}
