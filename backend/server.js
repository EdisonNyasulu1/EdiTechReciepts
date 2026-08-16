import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import apiRoutes from "./routes/api.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api", apiRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`EdiTech Graphix API running on http://localhost:${PORT}`);
});
