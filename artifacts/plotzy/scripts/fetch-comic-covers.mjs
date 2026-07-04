// Downloads every catalogue cover into public/images/comics/{id}.jpg
// so covers are served from Plotzy itself (instant, cached by the
// service worker, never re-fetched from the archive on each visit).
// Interior reading pages still stream from the archive.
//
// Resumable: existing non-empty files are skipped, so re-running only
// fills the gaps. Width 300px keeps a whole 600-issue library in the
// tens of megabytes while staying crisp on 108-190px cards.
//
// Run after the builder: node scripts/fetch-comic-covers.mjs

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CATALOG = new URL("./comics-catalog.json", import.meta.url);
const OUT_DIR = fileURLToPath(new URL("../public/images/comics/", import.meta.url));
const UA = "PlotzyComicsCovers/1.0 (contact: plotzy.co)";
const WIDTH = 300;

mkdirSync(OUT_DIR, { recursive: true });
const items = JSON.parse(readFileSync(CATALOG, "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ok = 0, skipped = 0, failed = [];
let i = 0;

async function fetchCover(id) {
  const path = `${OUT_DIR}${id}.jpg`;
  if (existsSync(path) && statSync(path).size > 4000) { skipped++; return; }
  // Primary: the real first-page scan; fallback: the item thumbnail.
  for (const url of [
    `https://archive.org/download/${id}/page/n0_w${WIDTH}.jpg`,
    `https://archive.org/services/img/${id}`,
  ]) {
    try {
      const r = await fetch(url, { headers: { "user-agent": UA } });
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      // JPEG magic + sane size = a real image, not an error page.
      if (buf.length > 4000 && buf[0] === 0xff && buf[1] === 0xd8) {
        writeFileSync(path, buf);
        ok++;
        return;
      }
    } catch { /* try fallback */ }
  }
  failed.push(id);
}

await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (i < items.length) {
      const it = items[i++];
      await fetchCover(it.id);
      if ((ok + skipped + failed.length) % 50 === 0) {
        console.log(`covers: ${ok} new, ${skipped} existing, ${failed.length} failed / ${items.length}`);
      }
      await sleep(60);
    }
  }),
);

console.log(`\nDONE: ${ok} downloaded, ${skipped} already present, ${failed.length} failed`);
if (failed.length) {
  writeFileSync(new URL("./comics-cover-failures.json", import.meta.url), JSON.stringify(failed, null, 1));
  console.log("failures written to comics-cover-failures.json (re-run to retry)");
}
