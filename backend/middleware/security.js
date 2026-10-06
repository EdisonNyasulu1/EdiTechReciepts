import rateLimit from "express-rate-limit";
import { config } from "../config.js";

const WINDOW_MS = 15 * 60 * 1000;

// Slows down password guessing: only FAILED logins count toward the limit.
export const loginLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: config.loginMaxAttempts,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many failed sign-in attempts. Please wait 15 minutes and try again." },
});

// General safety net for every API call
export const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down and try again shortly." },
});

/**
 * Extra protection against other websites making requests on the user's behalf:
 * for anything that changes data, a browser-supplied Origin must be one of our own sites.
 */
export function originGuard(allowedOrigins) {
  const allowed = new Set(allowedOrigins);
  return (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const origin = req.headers.origin;
    if (origin && !allowed.has(origin)) {
      return res.status(403).json({ error: "This request was blocked for security reasons." });
    }
    next();
  };
}
