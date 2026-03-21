import app from "./app";
import { runStartupMigrations } from "./migrate";

function validateEnvironment() {
  const nodeEnv = process.env["NODE_ENV"];
  const required = ["DATABASE_URL", "JWT_SECRET", "NODE_ENV"];

  if (nodeEnv === "production") {
    required.push("FRONTEND_URL");
  }

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`[startup] Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
}

// PORT is injected by Railway/Heroku automatically; fallback to 3001 for local dev
const rawPort = process.env["PORT"] ?? "3001";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  console.error(`[startup] Invalid PORT value: "${rawPort}" — defaulting to 3001`);
  process.exit(1);
}

async function main() {
  validateEnvironment();
  await runStartupMigrations();
  app.listen(port, "0.0.0.0", () => {
    console.log(`[server] Listening on 0.0.0.0:${port} (${process.env["NODE_ENV"] ?? "development"})`);
  });
}

main().catch((err) => {
  console.error("[startup] Failed to start server:", err);
  process.exit(1);
});
