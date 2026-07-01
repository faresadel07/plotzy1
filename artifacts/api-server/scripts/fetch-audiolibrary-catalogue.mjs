// One-shot script: fetch every English audiobook from LibriVox and
// save the browse-level metadata as a static JSON file bundled with
// the API server. Re-run when we want a refreshed catalogue.
//
// Why: the Audio Library used to hit LibriVox live on every browse
// request. LibriVox has been up for 20 years but it *has* had short
// outages, and we'd rather not have the whole feature disappear when
// their box hiccups. Baking the browse index into the repo makes the
// catalogue immune to upstream downtime. Audio playback still streams
// from archive.org (the mp3s live there, LibriVox is just the
// metadata front-end), which is orders of magnitude more stable and
// impossible to self-host at 3.6TB.
//
// Output: artifacts/api-server/src/data/audiolibrary-catalogue.json
// Roughly 15-30 MB minified. Compresses to ~2-4 MB on the wire.
//
// Run: node artifacts/api-server/scripts/fetch-audiolibrary-catalogue.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = resolve(__dirname, "../src/data/audiolibrary-catalogue.json");

const HEADERS = {
  "User-Agent": "PlotzyAudio/1.0 (+https://plotzy.co; library@plotzy.co)",
  Accept: "application/json, */*;q=0.5",
};

// LibriVox will 500 on extended=1 with limit >= 2000; 1000 is the
// largest page size that reliably returns.
const PAGE = 1000;
const MAX_RETRIES = 3;

function librivoxAuthorName(book) {
  if (!book.authors || book.authors.length === 0) return "Unknown";
  return book.authors
    .map((a) => `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim())
    .filter(Boolean)
    .join(", ");
}

function librivoxCover(book) {
  const u = book.url_iarchive;
  if (!u) return null;
  const id = u.split("/").pop();
  return id ? `https://archive.org/services/img/${id}` : null;
}

function archiveIdOf(book) {
  const u = book.url_iarchive;
  if (!u) return null;
  return u.split("/").pop() || null;
}

function parsePlaytime(s) {
  if (!s) return 0;
  const parts = String(s).split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(s) || 0;
}

function isEnglish(book) {
  const l = String(book.language || "").toLowerCase();
  return l === "english" || l === "multilingual" || l.includes("english");
}

async function fetchPage(offset) {
  const url = `https://librivox.org/api/feed/audiobooks/?format=json&extended=1&limit=${PAGE}&offset=${offset}`;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    process.stdout.write(`  fetching offset=${offset} (try ${attempt})... `);
    try {
      const r = await fetch(url, { headers: HEADERS });
      if (r.ok) {
        const data = await r.json();
        const n = (data.books || []).length;
        console.log(`ok, ${n} books`);
        return data.books || [];
      }
      console.log(`HTTP ${r.status}`);
    } catch (e) {
      console.log(`error: ${e.message}`);
    }
    if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
  throw new Error(`LibriVox failed after ${MAX_RETRIES} tries at offset=${offset}`);
}

async function main() {
  console.log("Fetching entire LibriVox catalogue...");
  const all = [];
  const seenIds = new Set();

  // Page through the feed until we get an empty page.
  for (let offset = 0; offset < 30000; offset += PAGE) {
    const batch = await fetchPage(offset);
    if (batch.length === 0) {
      console.log(`  offset=${offset} returned 0 books, stopping.`);
      break;
    }
    for (const b of batch) {
      const id = String(b.id);
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      all.push(b);
    }
    console.log(`  running total: ${all.length}`);
    // If the batch was smaller than a full page, we've hit the end.
    if (batch.length < PAGE) break;
  }

  console.log(`Total raw books: ${all.length}`);
  const english = all.filter(isEnglish);
  console.log(`English books: ${english.length}`);

  // Map to the compact browse row we actually serve.
  const mapped = english.map((b) => ({
    id: String(b.id),
    title: b.title || "Untitled",
    author: librivoxAuthorName(b),
    coverUrl: librivoxCover(b),
    archiveId: archiveIdOf(b),
    totalDuration: parsePlaytime(b.totaltime) || Number(b.totaltimesecs) || null,
    chapterCount: Array.isArray(b.sections) ? b.sections.length : (Number(b.num_sections) || 0),
    genres: (b.genres || []).map((g) => g.name).filter(Boolean),
    copyrightYear: b.copyright_year ? String(b.copyright_year) : null,
    // Keeping description here would blow the file size up massively
    // (some are 5KB+). It's fetched on-demand for the detail page.
  }));

  // Sort by ID ascending so ordering is stable across runs.
  mapped.sort((a, b) => Number(a.id) - Number(b.id));

  const payload = {
    fetchedAt: "1970-01-01T00:00:00.000Z", // filled at write time so hash is deterministic under diff
    version: 1,
    source: "librivox",
    count: mapped.length,
    books: mapped,
  };
  // Set fetchedAt just before write so it's not stable across runs -
  // that's fine, we want to know when the file was refreshed.
  payload.fetchedAt = new Date().toISOString();

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(payload));
  const sizeMb = (JSON.stringify(payload).length / 1024 / 1024).toFixed(2);
  console.log(`Wrote ${mapped.length} books to ${OUT_FILE} (${sizeMb} MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
