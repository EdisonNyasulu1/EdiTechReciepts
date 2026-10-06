import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";

import { config } from "./config.js";
import { pool } from "./db.js";
import authRoutes from "./routes/auth.js";
import apiRoutes from "./routes/api.js";
import { apiLimiter, loginLimiter, originGuard } from "./middleware/security.js";
import { errorHandler, notFound } from "./middleware/errors.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", config.trustProxy);

  app.use(helmet());
  app.use(
    cors({
      // no Origin header = same-origin request or a tool like curl; otherwise it must be one of our sites
      origin: (origin, cb) => cb(null, !origin || config.clientOrigins.includes(origin)),
      credentials: true,
      methods: ["GET", "POST", "DELETE", "OPTIONS"],
      maxAge: 600,
    })
  );
  app.use(express.json({ limit: "200kb" }));
  app.use(cookieParser());

  // Health checks (used by Render/Railway/uptime monitors) - no login, no rate limit
  app.get("/", (req, res) => res.json({ name: "EdiTech Graphix API", status: "ok" }));
  app.get("/api/health", (req, res) => res.json({ ok: true, uptime: Math.round(process.uptime()) }));
  app.get("/api/health/db", async (req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ ok: true, database: "up" });
    } catch {
      res.status(503).json({ ok: false, database: "down" });
    }
  });

  app.use("/api", apiLimiter);
  app.use("/api", originGuard(config.clientOrigins));

  app.use("/api/auth/login", loginLimiter);
  app.use("/api/auth", authRoutes);
  app.use("/api", apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
