import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../../../lib/db/src/schema";

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
export const db = drizzle(pool, { schema });
