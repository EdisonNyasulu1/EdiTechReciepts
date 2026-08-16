import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const router = express.Router();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 8 * 60 * 60 * 1000, // 8 hours
};

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username.trim(),
    ]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, full_name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.cookie("token", token, COOKIE_OPTS);
    res.json({
      success: true,
      user: { id: user.id, username: user.username, full_name: user.full_name },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during login." });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie("token", COOKIE_OPTS);
  res.json({ success: true });
});

// GET /api/auth/me  -> who am I (used on app load to check session)
router.get("/me", (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ user: payload });
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
});

export default router;
