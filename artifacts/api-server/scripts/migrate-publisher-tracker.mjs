// One-shot migration: create the publisher_submissions + saved_publishers
// tables. Idempotent (CREATE TABLE IF NOT EXISTS).
//
// Run from the repo root after exporting DATABASE_URL:
//   node artifacts/api-server/scripts/migrate-publisher-tracker.mjs

import { Client } from "pg";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, "../../../publisher-tracker-migration.sql"), "utf8");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  console.log("Migration applied: publisher_submissions + saved_publishers");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
