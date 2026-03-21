import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env["DATABASE_URL"]) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}

// Railway PostgreSQL requires SSL in production
const isProduction = process.env["NODE_ENV"] === "production";

export const pool = new Pool({
  connectionString: process.env["DATABASE_URL"],
  // Conservative pool size: Railway free tier has limited connections
  max: isProduction ? 10 : 5,
  min: 1,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  // Allow Railway/Supabase SSL without self-signed cert errors
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

// Log pool errors to prevent unhandled rejections crashing the process
pool.on("error", (err) => {
  console.error("[db] Unexpected pool error:", err.message);
});

export const db = drizzle(pool, { schema });

// Graceful shutdown — drain pool before process exits
process.on("SIGTERM", () => {
  pool.end().catch((err) => console.error("[db] Pool drain error:", err));
});

export * from "./schema";
