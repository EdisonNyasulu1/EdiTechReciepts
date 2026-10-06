import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { config } from "../config.js";
import { readSession } from "../middleware/auth.js";
import { validateLogin } from "../validators.js";

const router = express.Router();

const { maxAge, ...CLEAR_OPTS } = config.cookie;

// Compared against when the username doesn't exist, so response time doesn't reveal which usernames are real
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const parsed = validateLogin(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const { username, password } = parsed.value;

  try {
    const result = await pool.query("SELECT id, username, password, full_name FROM users WHERE username = $1", [username]);
    const user = result.rows[0];

    const match = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
    if (!user || !match) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, full_name: user.full_name },
      config.jwtSecret,
      { algorithm: "HS256", expiresIn: `${config.sessionHours}h` }
    );

    res.cookie("token", token, config.cookie);
    res.json({ success: true, user: { id: user.id, username: user.username, full_name: user.full_name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during login. Please try again." });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie("token", CLEAR_OPTS);
  res.json({ success: true });
});

// GET /api/auth/me  -> who am I (the app calls this on load to restore the session)
router.get("/me", async (req, res) => {
  const session = readSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    const result = await pool.query("SELECT id, username, full_name FROM users WHERE id = $1", [session.id]);
    if (!result.rows[0]) return res.status(401).json({ error: "Unauthorized" }); // account was removed
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

export default router;
