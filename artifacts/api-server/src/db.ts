import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../../../lib/db/src/schema";
import { logger } from "./lib/logger";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Pool sized for Neon serverless. Defaults (max=10, infinite idle)
// hold connections open longer than Neon keeps them alive — when the
// proxy quietly drops idle slots, the next checkout gets ECONNRESET.
// max=5 fits well within Neon's free-tier budget; idleTimeoutMillis
// closes idle clients before the platform does; connectionTimeoutMillis
// bounds how long we wait for an empty slot under load instead of
// piling up forever.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Idle-client errors (Neon dropping a connection mid-idle, transient
// network blip during maintenance) bypass the per-query try/catch
// chain. Without this listener, node-postgres's Pool emits an
// unhandled 'error' event and Node crashes the entire process. Logging
// + swallowing keeps the API alive; the pool replaces the bad client
// on the next checkout. Don't pass `client` to the logger — it would
// serialise ~50KB of pool internals into Sentry per event.
pool.on("error", (err) => {
  logger.error({ err: err.message, stack: err.stack }, "pg pool: idle client error");
});

export const db = drizzle(pool, { schema });
