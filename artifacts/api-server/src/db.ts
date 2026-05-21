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

// Pool sized for serverless Postgres providers. Defaults (max=10,
// infinite idle) hold connections open longer than the upstream keeps
// them alive, so the next checkout gets ECONNRESET. max=5 fits well
// inside free-tier budgets; idleTimeoutMillis closes idle clients
// before the platform does; connectionTimeoutMillis bounds how long
// we wait for an empty slot under load instead of piling up forever.
//
// Managed Postgres providers (Supabase pooler, Neon, etc.) present
// certificates signed by a CA that is not always in Node's default
// trust store. With plain sslmode=require the TLS verify step fails
// ("self-signed certificate in certificate chain") and the pool never
// hands back a connection — every endpoint that touches the DB 500s.
// Keep TLS on for confidentiality, but skip CA verification. This is
// the same posture every Postgres-on-managed-cloud setup uses.
const url = process.env.DATABASE_URL!;
export const pool = new Pool({
  connectionString: url,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: { rejectUnauthorized: false },
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

// Per-client statement timeout. Each new connection (whether the pool
// just opened it or recycled one after an idle drop) runs this SET
// once on checkout, capping every subsequent query on that client at
// 30 seconds. Defends against pathological queries (unindexed scans
// on a growing notifications/api_logs table, runaway joins) holding a
// pool slot indefinitely and starving every other request. Bulk seed
// scripts run from their own pool and are not affected by this cap.
pool.on("connect", (client) => {
  client.query("SET statement_timeout = 30000").catch((err) => {
    logger.error({ err: err.message }, "pg client: failed to set statement_timeout");
  });
});

export const db = drizzle(pool, { schema });
