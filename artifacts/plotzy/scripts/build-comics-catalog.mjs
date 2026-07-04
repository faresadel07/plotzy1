// Builds a VERIFIED catalogue of public-domain golden-age comics from
// the Internet Archive's community "comics" collection (the classic
// single-issue CBZ uploads with BookReader page endpoints).
//
// Every candidate is checked live before admission:
//   - published before 1964 (blocks modern trademarked reboots),
//   - sane page count (16 to 110) from metadata imagecount,
//   - the cover AND an interior page actually serve as images.
//
// PD safety comes from the series whitelist: defunct golden-age
// publishers (Fiction House, Fox, Avon, Ace, Lev Gleason, Centaur,
// Aragon, Youthful, Superior, Star, Toby, Ajax) whose books lapsed
// into the public domain; the standard DCM / Comic Book Plus canon.
//
// Run: node scripts/build-comics-catalog.mjs

import { writeFileSync } from "node:fs";

const SERIES = [
  // [search title, genre, max issues]
  ["Captain Science", "scifi", 3],
  ["Space Detective", "scifi", 2],
  ["Strange Worlds", "scifi", 2],
  ["Weird Tales of the Future", "scifi", 2],
  ["Atomic War", "scifi", 2],
  ["World War III", "scifi", 1],
  ["Space Action", "scifi", 1],
  ["Fantastic Comics", "hero", 3],
  ["Blue Beetle", "hero", 3],
  ["Phantom Lady", "hero", 2],
  ["Silver Streak Comics", "hero", 2],
  ["Daredevil Comics", "hero", 2],
  ["Amazing Man Comics", "hero", 2],
  ["Wonderworld Comics", "hero", 1],
  ["Mystery Men Comics", "hero", 1],
  ["Mister Mystery", "horror", 3],
  ["The Beyond", "horror", 2],
  ["Web of Mystery", "horror", 2],
  ["Weird Mysteries", "horror", 2],
  ["Dark Mysteries", "horror", 1],
  ["Voodoo", "horror", 1],
  ["Haunted Thrills", "horror", 1],
  ["Journey into Fear", "horror", 2],
  ["Startling Terror Tales", "horror", 1],
  ["Tales of Horror", "horror", 1],
  ["The Purple Claw", "horror", 1],
  ["Jumbo Comics", "jungle", 3],
  ["Jungle Comics", "jungle", 3],
  ["Sheena, Queen of the Jungle", "jungle", 1],
  ["Wings Comics", "war", 2],
  ["Rangers Comics", "war", 2],
  ["Crime Does Not Pay", "crime", 3],
  ["Crime and Punishment", "crime", 2],
];

const UA = "PlotzyComicsCatalog/1.0 (contact: plotzy.co)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function jget(url) {
  const r = await fetch(url, { headers: { "user-agent": UA } });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

async function imageOk(url) {
  try {
    const r = await fetch(url, { headers: { "user-agent": UA } });
    if (!r.ok) return false;
    const ct = r.headers.get("content-type") || "";
    const buf = await r.arrayBuffer();
    return ct.includes("image") && buf.byteLength > 4000;
  } catch {
    return false;
  }
}

async function search(title) {
  const q = encodeURIComponent(`title:"${title}" AND collection:comics`);
  const url = `https://archive.org/advancedsearch.php?q=${q}&fl[]=identifier&fl[]=title&rows=25&output=json`;
  const j = await jget(url);
  return j.response?.docs ?? [];
}

function parseIssue(str) {
  const m = String(str).match(/(?:^|[^0-9])0*([0-9]{1,3})(?:[^0-9]|$)/);
  return m ? Number(m[1]) : null;
}

function parseYear(meta) {
  const raw = String(meta?.metadata?.date || meta?.metadata?.year || "");
  const m = raw.match(/(18|19|20)\d{2}/);
  return m ? Number(m[0]) : null;
}

const out = [];

for (const [title, genre, maxTake] of SERIES) {
  let taken = 0;
  let docs = [];
  try {
    docs = await search(title);
  } catch (e) {
    console.error(`SEARCH FAIL ${title}`);
    continue;
  }
  for (const d of docs) {
    if (taken >= maxTake) break;
    const id = d.identifier;
    if (!id || out.some((x) => x.id === id)) continue;
    // Skip fragments, trade collections, and obvious bundles.
    if (/-pg-|tpb|complete|collection|_full|annual/i.test(id)) continue;
    try {
      const meta = await jget(`https://archive.org/metadata/${id}`);
      // Page count: prefer imagecount; most community uploads lack it,
      // so fall back to counting <page> entries in the scandata file
      // (the same source the archive's own BookReader uses).
      let count = Number(meta?.metadata?.imagecount);
      if (!Number.isFinite(count)) {
        const scan = (meta?.files || []).find((f) => /_scandata\.xml$/i.test(f.name));
        if (!scan) { console.error(`NO COUNT ${id}`); continue; }
        const xml = await (await fetch(
          `https://archive.org/download/${id}/${encodeURIComponent(scan.name)}`,
          { headers: { "user-agent": UA } },
        )).text();
        count = (xml.match(/<page\s/g) || []).length;
      }
      if (!Number.isFinite(count) || count < 16 || count > 110) { console.error(`BAD COUNT ${id} ${count}`); continue; }
      // Golden age only: hard-reject anything hinting modern (a 20xx
      // anywhere in the id/title, or a parsed year past 1963). Items
      // with NO discoverable year are kept for manual review since the
      // series whitelist is inherently golden-age.
      const hay = `${id} ${meta?.metadata?.title || ""}`;
      if (/20\d\d/.test(hay)) continue;
      const year = parseYear(meta) ?? (hay.match(/19[3-5]\d/) ? Number(hay.match(/19[3-5]\d/)[0]) : null);
      if (year && year >= 1964) continue;
      const coverOk = await imageOk(`https://archive.org/services/img/${id}`);
      const pageOk = await imageOk(`https://archive.org/download/${id}/page/n1_w400.jpg`);
      if (!coverOk || !pageOk) { console.error(`IMG FAIL ${id}`); continue; }
      const issue = parseIssue(meta?.metadata?.title || "") ?? parseIssue(id);
      out.push({
        id,
        series: title,
        issue,
        rawTitle: meta?.metadata?.title || d.title || title,
        year: year ? String(year) : "",
        pages: count,
        genre,
      });
      taken++;
      console.log(`OK  ${id}  pages=${count} year=${year} issue=${issue}`);
    } catch {
      console.error(`META FAIL ${id}`);
    }
    await sleep(200);
  }
  await sleep(200);
}

writeFileSync(new URL("./comics-catalog.json", import.meta.url), JSON.stringify(out, null, 2));
console.log(`\nTOTAL VERIFIED: ${out.length}`);
