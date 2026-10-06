import jwt from "jsonwebtoken";
import { config } from "../config.js";

/** Returns the logged-in user's token payload, or null if there is no valid login cookie. */
export function readSession(req) {
  const token = req.cookies?.token;
  if (!token) return null;
  try {
    return jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const user = readSession(req);
  if (!user) return res.status(401).json({ error: "Your session has expired. Please sign in again." });
  req.user = user;
  next();
}
