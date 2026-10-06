import { config } from "./config.js";
import { pool, checkDb } from "./db.js";
import { createApp } from "./app.js";

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`EdiTech Graphix API listening on port ${config.port} (${config.nodeEnv})`);
  console.log(`Allowed website origins: ${config.clientOrigins.join(", ")}`);

  // Check the database in the background so a sleeping Neon database doesn't delay startup
  checkDb()
    .then(() => console.log("Database connection OK"))
    .catch((err) =>
      console.error(`Cannot reach the database: ${err.message}\nCheck DATABASE_URL in backend/.env and that your Neon project is active.`)
    );
});

// Keep connections open slightly longer than typical load balancers (avoids random 502s)
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

function shutdown(signal) {
  console.log(`${signal} received - shutting down...`);
  server.close(async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref(); // force exit if something hangs
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (err) => console.error("Unhandled promise rejection:", err));
