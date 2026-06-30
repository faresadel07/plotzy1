// One-shot migration for the Audiolibrary tables. Idempotent.
// Run from the repo root after exporting DATABASE_URL.

import { Client } from "pg";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, "../../../audiolibrary-migration.sql"), "utf8");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try { await client.query(sql); console.log("Audiolibrary migration applied"); }
catch (err) { console.error("Migration failed:", err.message); process.exit(1); }
finally { await client.end(); }
