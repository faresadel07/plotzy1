// Client-side search engine for the comics catalogue.
//
// Built for "type two letters, get what you meant":
//   - multi-token AND matching across title, series, year, and genre
//     labels in BOTH languages (typing "رعب" lists the horror books),
//   - ranked scoring (series/title starts beat word prefixes beat
//     substrings), ties broken by series then issue number,
//   - light typo tolerance: when a token misses, a Levenshtein
//     distance of 1 against any word still counts ("mistery" finds
//     Mister Mystery),
//   - series suggestions: the top matching series with issue counts,
//     so one tap narrows the whole library.

import { COMICS, COMIC_GENRES, type ComicIssue } from "./comics";

const norm = (s: string) =>
  s.toLowerCase().replace(/['".,!؟?]/g, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();

/** Levenshtein distance capped at 1 (early-exit): is `a` within one
 *  edit of `b`? Enough to absorb a single typo without false hits. */
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (la === lb) { i++; j++; }
    else if (la > lb) i++;
    else j++;
  }
  return edits + (la - i) + (lb - j) <= 1;
}

interface Doc {
  issue: ComicIssue;
  /** Normalized searchable text fields. */
  fields: string[];
  /** All words across the fields (for prefix/fuzzy checks). */
  words: string[];
}

let DOCS: Doc[] | null = null;

function docs(): Doc[] {
  if (DOCS) return DOCS;
  DOCS = COMICS.map((c) => {
    const g = COMIC_GENRES.find((x) => x.id === c.genre);
    const fields = [norm(c.title), norm(c.series), c.year, g ? norm(g.en) : "", g ? g.ar : ""].filter(Boolean);
    const words = [...new Set(fields.flatMap((f) => f.split(" ")))];
    return { issue: c, fields, words };
  });
  return DOCS;
}

/** Score one token against a doc. 0 = no match. */
function tokenScore(t: string, d: Doc): number {
  let best = 0;
  for (const f of d.fields) {
    if (f === t) { best = Math.max(best, 5); continue; }
    if (f.startsWith(t)) { best = Math.max(best, 4); continue; }
    if (f.includes(` ${t}`)) { best = Math.max(best, 2); continue; }
    if (f.includes(t)) best = Math.max(best, 1.5);
  }
  for (const w of d.words) {
    if (w.startsWith(t)) { best = Math.max(best, 3); break; }
  }
  if (best === 0 && t.length >= 4) {
    for (const w of d.words) {
      if (withinOneEdit(t, w)) { best = 1; break; }
    }
  }
  return best;
}

export interface ComicSearchResult {
  issues: ComicIssue[];
  /** Top matching series with their catalogue counts, for one-tap
   *  narrowing suggestions. */
  series: Array<{ series: string; count: number; cover: ComicIssue }>;
  total: number;
}

export function searchComics(query: string, limit = 60): ComicSearchResult {
  const q = norm(query);
  if (!q) return { issues: [], series: [], total: 0 };
  const tokens = q.split(" ").filter(Boolean);

  const scored: Array<{ d: Doc; score: number }> = [];
  for (const d of docs()) {
    let score = 0;
    let ok = true;
    for (const t of tokens) {
      const s = tokenScore(t, d);
      if (s === 0) { ok = false; break; }
      score += s;
    }
    if (ok) scored.push({ d, score });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.d.issue.series.localeCompare(b.d.issue.series) ||
      a.d.issue.title.localeCompare(b.d.issue.title, undefined, { numeric: true }),
  );

  // Series suggestions: best score per series, weighted by depth.
  const bySeries = new Map<string, { score: number; count: number; cover: ComicIssue }>();
  for (const { d, score } of scored) {
    const s = d.issue.series;
    const cur = bySeries.get(s);
    if (cur) cur.count++;
    else bySeries.set(s, { score, count: 1, cover: d.issue });
  }
  const series = [...bySeries.entries()]
    .sort((a, b) => b[1].score + Math.log(b[1].count) - (a[1].score + Math.log(a[1].count)))
    .slice(0, 4)
    .map(([name, v]) => ({ series: name, count: v.count, cover: v.cover }));

  return {
    issues: scored.slice(0, limit).map((x) => x.d.issue),
    series,
    total: scored.length,
  };
}
