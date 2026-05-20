// One-time migration: extract base64 book covers from the DB and write
// them out as static files served by Vercel.
//
//   data:image/png;base64,iVBORw0KGgo...   ->   /uploads/covers/<id>.png
//
// Why this matters: every Discover / Library visit was transferring the
// full base64 cover bytes for every listed book out of Neon (~500KB per
// row), which is the single largest source of free-tier egress
// consumption. Storing the cover once as a static file collapses each
// row's coverImage to a ~30 byte URL and lets Vercel's CDN serve the
// image instead of the DB.
//
// SAFETY
//   - Reads + writes are batched (5 books at a time) so the script is
//     gentle on Neon's transfer cap. Wait for the monthly cap reset
//     before running.
//   - `--dry-run` prints what would happen without touching the DB or
//     writing files.
//   - Books whose coverImage is already a URL (not a data: URI) are
//     skipped — the script is idempotent.
//   - Only published books are migrated by default (PUBLISHED_ONLY=true).
//     Private books stay as base64 in the DB until a proper cloud-blob
//     store (Vercel Blob / Supabase Storage / Cloudflare R2) is wired
//     for new uploads.
//
// USAGE  (from repo root, with Neon back under its cap)
//   node scripts/migrate-covers-to-files.mjs --dry-run
//   node scripts/migrate-covers-to-files.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const require = createRequire(resolve(repoRoot, "artifacts/api-server/") + "/");
const { Pool } = require("pg");

const DRY_RUN = process.argv.includes("--dry-run");
const PUBLISHED_ONLY = process.env.PUBLISHED_ONLY !== "false"; // default true
const BATCH_SIZE = Number(process.env.BATCH_SIZE) || 5;
const COVERS_DIR = resolve(repoRoot, "artifacts/plotzy/public/uploads/covers");

const env = readFileSync(resolve(repoRoot, ".env"), "utf8");
const DB = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="))
  .slice(13).replace(/^["']|["']$/g, "");
const pool = new Pool({ connectionString: DB, ssl: { rejectUnauthorized: false } });

mkdirSync(COVERS_DIR, { recursive: true });

// Map mime type -> file extension.
const MIME_TO_EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

function parseDataUri(s) {
  // data:image/png;base64,XXXXX...
  const m = s && s.match(/^data:([\w/+.-]+);base64,(.+)$/i);
  if (!m) return null;
  return { mime: m[1].toLowerCase(), b64: m[2] };
}

async function listCandidates() {
  // Only id + a tiny prefix of coverImage to confirm it is a data: URI.
  // Pulling the full coverImage of every row up front would blow the
  // egress cap again — we fetch each cover one at a time inside the
  // batch loop below.
  const sql = `
    SELECT id, title, length(cover_image) AS sz
      FROM books
     WHERE cover_image IS NOT NULL
       AND cover_image LIKE 'data:image/%'
       ${PUBLISHED_ONLY ? "AND is_published = true" : ""}
     ORDER BY id ASC
  `;
  const { rows } = await pool.query(sql);
  return rows;
}

async function migrateOne(id) {
  const { rows } = await pool.query(
    "SELECT cover_image FROM books WHERE id = $1",
    [id],
  );
  if (rows.length === 0) return { skipped: "not found" };
  const data = parseDataUri(rows[0].cover_image);
  if (!data) return { skipped: "not a data URI (already migrated?)" };
  const ext = MIME_TO_EXT[data.mime] || "bin";
  const buf = Buffer.from(data.b64, "base64");
  const file = `${id}.${ext}`;
  const url = `/uploads/covers/${file}`;
  const path = resolve(COVERS_DIR, file);
  if (DRY_RUN) {
    return { wouldWrite: path, wouldUrl: url, bytes: buf.length };
  }
  writeFileSync(path, buf);
  await pool.query(
    "UPDATE books SET cover_image = $1 WHERE id = $2",
    [url, id],
  );
  return { wrote: path, url, bytes: buf.length };
}

async function main() {
  console.log("migrate-covers-to-files");
  console.log("  mode           =", DRY_RUN ? "DRY RUN" : "LIVE");
  console.log("  published only =", PUBLISHED_ONLY);
  console.log("  batch size     =", BATCH_SIZE);
  console.log("  covers dir     =", COVERS_DIR);
  console.log("");

  const candidates = await listCandidates();
  console.log("candidates:", candidates.length);
  for (const c of candidates.slice(0, 10)) {
    console.log("  id=" + c.id, "size=" + c.sz, JSON.stringify(c.title).slice(0, 40));
  }
  if (candidates.length > 10) console.log("  ...");

  let ok = 0, skipped = 0, failed = 0;
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const slice = candidates.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(slice.map((c) => migrateOne(c.id)));
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      const id = slice[j].id;
      if (r.status === "rejected") {
        failed++;
        console.log("  FAIL id=" + id, r.reason.message);
      } else if (r.value?.skipped) {
        skipped++;
        console.log("  skip id=" + id, r.value.skipped);
      } else {
        ok++;
        console.log("  ok   id=" + id, r.value.bytes + "B ->", r.value.wroteUrl || r.value.url || r.value.wouldUrl);
      }
    }
  }
  console.log("");
  console.log("done. ok=" + ok, " skipped=" + skipped, " failed=" + failed);
  await pool.end();
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
