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
// Supabase's shared pooler presents a Supabase-issued certificate that
// is not in Node's default CA bundle, so a plain `sslmode=require` URL
// fails the TLS verify step and the connection just hangs forever (no
// rows ever returned to the API server, every endpoint 500s). We keep
// TLS on but skip CA verification when we detect a Supabase host. The
// link is still encrypted in transit — we just trust the host.
const url = process.env.DATABASE_URL!;
const isSupabase = /\.supabase\.(com|co)/i.test(url);
export const pool = new Pool({
  connectionString: url,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ...(isSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
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
