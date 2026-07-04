// Converts the verified comics-catalog.json into the COMICS array for
// src/lib/comics.ts (prints to stdout; the array is pasted into the
// module). Titles are normalized to "Series N (Year)" style display
// names regardless of how messy the archive item title is.
//
// Run: node scripts/emit-comics-ts.mjs

import { readFileSync } from "node:fs";

const raw = JSON.parse(readFileSync(new URL("./comics-catalog.json", import.meta.url), "utf8"));

// Sort: genre, then series, then issue number.
const genreOrder = ["scifi", "hero", "horror", "jungle", "war", "crime"];
raw.sort((a, b) =>
  genreOrder.indexOf(a.genre) - genreOrder.indexOf(b.genre) ||
  a.series.localeCompare(b.series) ||
  (a.issue ?? 0) - (b.issue ?? 0),
);

const seen = new Set();
const lines = [];
for (const c of raw) {
  if (seen.has(c.id)) continue;
  seen.add(c.id);
  const shortSeries = c.series.replace(/, Queen of the Jungle/, "");
  const title = c.issue ? `${shortSeries} ${c.issue}` : shortSeries;
  lines.push(
    `  { id: ${JSON.stringify(c.id)}, title: ${JSON.stringify(title)}, series: ${JSON.stringify(shortSeries)}, year: ${JSON.stringify(c.year)}, pages: ${c.pages}, genre: ${JSON.stringify(c.genre)} },`,
  );
}

console.log(`export const COMICS: ComicIssue[] = [\n${lines.join("\n")}\n];`);
console.log(`\n// total: ${lines.length}`);
