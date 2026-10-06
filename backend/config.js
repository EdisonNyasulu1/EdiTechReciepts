// Loads .env, validates it, and exposes `config`. If something is wrong the server stops
// immediately with a readable message instead of failing later at runtime.
import dotenv from "dotenv";
import { buildConfig, ConfigError } from "./buildConfig.js";

dotenv.config();

let config;
try {
  config = buildConfig(process.env);
} catch (err) {
  if (err instanceof ConfigError) {
    console.error(`\n${err.message}\n\nFix backend/.env (see .env.example) and start again.\n`);
  } else {
    console.error(err);
  }
  process.exit(1);
}

export { config };
