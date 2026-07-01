// Audiolibrary routes — BAKED CATALOGUE + LIVE DETAIL.
//
// Design decisions:
//   - The 19,000+ English browse rows are shipped as a JSON file in
//     the repo (see scripts/fetch-audiolibrary-catalogue.mjs). This
//     makes browse and search work even if LibriVox is offline.
//   - Detail (chapter list, description, reviews, stats) still hits
//     LibriVox + Archive.org live because the audio URLs are what
//     the player needs and they'd bloat the bundle by ~150MB if we
//     tried to bake them too.
//   - Audio itself always streams from archive.org — impossible to
//     self-host at 3.6TB.
//   - Per-user data (bookmarks, listening progress) live in the DB.
//
// To refresh the catalogue:
//   node artifacts/api-server/scripts/fetch-audiolibrary-catalogue.mjs
//   git add + commit + deploy.

import { Router } from "express";
import { z } from "zod";
import { and, eq, asc, sql } from "drizzle-orm";

import { db } from "../db";
import { audiolibraryProgress, audiolibraryBookmarks, gutenbergBooks } from "../../../../lib/db/src/schema";
import { logger } from "../lib/logger";
import { logRouteError } from "../lib/log-route-error";
// Compact browse-row records for every English audiobook on LibriVox.
// esbuild inlines this into the production bundle so browse works
// even if LibriVox is down. See scripts/fetch-audiolibrary-catalogue.mjs
// for how to refresh it.
import catalogueData from "../data/audiolibrary-catalogue.json" with { type: "json" };

const router = Router();

const FETCH_HEADERS: Record<string, string> = {
  "User-Agent": "PlotzyAudio/1.0 (+https://plotzy.co; library@plotzy.co)",
  Accept: "application/json, */*;q=0.5",
};

// ── Shared types ────────────────────────────────────────────────────

interface CommonBook {
  source: "librivox";
  externalId: string;
  bookKey: string; // "librivox:<id>"
  title: string;
  author: string | null;
  language: string;
  coverUrl: string | null;
  totalDuration: number | null;
  chapterCount: number;
  genres: string[];
}

interface CommonChapter {
  title: string;
  audioUrl: string;
  duration: number;
  sectionNumber: number;
  readers: { id: string; name: string }[];
}

interface CommonReview {
  stars: number;
  title: string;
  author: string;
  body: string;
  date: string | null;
}

interface CommonBookDetail extends CommonBook {
  description: string | null;
  chapters: CommonChapter[];
  sourceUrl: string;
  // Extras surfaced from LibriVox + Archive.org so the detail page
  // can offer everything the upstream item does.
  wikipediaUrl: string | null;
  archiveUrl: string | null;
  zipDownloadUrl: string | null;
  rssUrl: string | null;
  textSourceUrl: string | null;
  copyrightYear: string | null;
  translators: { name: string }[];
  readers: { id: string; name: string; count: number }[]; // unique readers with chapter count
  avgRating: number | null;
  downloadCount: number | null;
  numReviews: number | null;
  reviews: CommonReview[];
}

// ── Helpers ─────────────────────────────────────────────────────────

function parsePlaytime(s: string | undefined | null): number {
  if (!s) return 0;
  const parts = String(s).split(":").map((p) => Number(p));
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(s) || 0;
}

function librivoxAuthorName(book: any): string {
  if (!book.authors || book.authors.length === 0) return "Unknown";
  return book.authors
    .map((a: any) => `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim())
    .filter(Boolean)
    .join(", ");
}

function librivoxCover(book: any): string | null {
  const u = book.url_iarchive as string | undefined;
  if (!u) return null;
  const id = u.split("/").pop();
  if (!id) return null;
  return `https://archive.org/services/img/${id}`;
}

// ── Bundled catalogue: browse + search from in-memory JSON ──────────
//
// Each row is a compact record produced by fetch-audiolibrary-catalogue.mjs.
// The whole ~5.7 MB payload sits in the bundle so browse never touches
// the network.

interface CatalogueRow {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  archiveId: string | null;
  totalDuration: number | null;
  chapterCount: number;
  genres: string[];
  copyrightYear: string | null;
}

const CATALOGUE: CatalogueRow[] = (catalogueData as { books: CatalogueRow[] }).books;

// Category ID -> LibriVox genre string(s) as they appear in the
// catalogue's `genres` field. We match against the exact string
// LibriVox uses (case-insensitive). "all" bypasses the filter.
const CATEGORY_TO_GENRE_KEYS: Record<string, string[]> = {
  all: [],
  classics: ["historical fiction"],
  mystery: ["detective fiction"],
  adventure: ["action & adventure fiction"],
  scifi: ["science fiction"],
  romance: ["romance"],
  horror: ["horror & supernatural fiction"],
  poetry: ["poetry"],
  children: ["children's fiction"],
  shortstories: ["short stories"],
  history: ["history"],
  philosophy: ["philosophy"],
  biography: ["biography & autobiography"],
  humor: ["humorous fiction", "humor"],
};

function rowMatchesCategory(row: CatalogueRow, category: string): boolean {
  const wanted = CATEGORY_TO_GENRE_KEYS[category];
  if (!wanted || wanted.length === 0) return true;
  const rowGenres = row.genres.map((g) => g.toLowerCase());
  return wanted.some((w) => rowGenres.includes(w));
}

// Cheap fuzzy match: substring test on the concatenated title +
// author string, case-insensitive. Fine for tens of thousands of
// rows in memory.
function rowMatchesQuery(row: CatalogueRow, needle: string): boolean {
  if (!needle) return true;
  const t = row.title.toLowerCase();
  const a = (row.author || "").toLowerCase();
  return t.includes(needle) || a.includes(needle);
}

function catalogueToCommonBook(row: CatalogueRow): CommonBook {
  return {
    source: "librivox" as const,
    externalId: row.id,
    bookKey: `librivox:${row.id}`,
    title: row.title,
    author: row.author,
    language: "english",
    coverUrl: row.coverUrl,
    totalDuration: row.totalDuration,
    chapterCount: row.chapterCount,
    genres: row.genres,
  };
}

function catalogueList(params: {
  q: string;
  limit: number;
  offset: number;
  category: string;
  sort: string;
}): CommonBook[] {
  const needle = params.q.trim().toLowerCase();
  let matched = CATALOGUE.filter(
    (r) => rowMatchesCategory(r, params.category) && rowMatchesQuery(r, needle),
  );

  if (params.sort === "title") {
    matched = matched.slice().sort((a, b) => a.title.localeCompare(b.title));
  } else if (params.sort === "longest") {
    matched = matched.slice().sort((a, b) => (b.totalDuration ?? 0) - (a.totalDuration ?? 0));
  } else if (params.sort === "shortest") {
    matched = matched.slice().sort((a, b) => (a.totalDuration ?? Infinity) - (b.totalDuration ?? Infinity));
  } else {
    // "recent" — the JSON is sorted by ID ascending, and newer books
    // have larger IDs, so we reverse for recent-first.
    matched = matched.slice().reverse();
  }

  return matched
    .slice(params.offset, params.offset + params.limit)
    .map(catalogueToCommonBook);
}

function catalogueCount(): number {
  return CATALOGUE.length;
}

// ── LibriVox: detail ────────────────────────────────────────────────

async function fetchArchiveStats(archiveId: string | null): Promise<{
  avgRating: number | null;
  downloadCount: number | null;
  numReviews: number | null;
  reviews: CommonReview[];
}> {
  const empty = { avgRating: null, downloadCount: null, numReviews: null, reviews: [] as CommonReview[] };
  if (!archiveId) return empty;
  try {
    // The stats live on advancedsearch; reviews live on metadata.
    // Fire both in parallel; either failing is non-fatal.
    const [statsRes, metaRes] = await Promise.allSettled([
      fetch(
        `https://archive.org/advancedsearch.php?q=identifier:${encodeURIComponent(archiveId)}&fl[]=downloads&fl[]=avg_rating&fl[]=num_reviews&output=json`,
        { signal: AbortSignal.timeout(15_000), headers: FETCH_HEADERS },
      ),
      fetch(
        `https://archive.org/metadata/${encodeURIComponent(archiveId)}`,
        { signal: AbortSignal.timeout(15_000), headers: FETCH_HEADERS },
      ),
    ]);
    let avgRating: number | null = null;
    let downloadCount: number | null = null;
    let numReviews: number | null = null;
    if (statsRes.status === "fulfilled" && statsRes.value.ok) {
      const j = await statsRes.value.json() as any;
      const doc = j?.response?.docs?.[0];
      if (doc) {
        avgRating = doc.avg_rating ? Number(doc.avg_rating) : null;
        downloadCount = doc.downloads ? Number(doc.downloads) : null;
        numReviews = doc.num_reviews ? Number(doc.num_reviews) : null;
      }
    }
    let reviews: CommonReview[] = [];
    if (metaRes.status === "fulfilled" && metaRes.value.ok) {
      const j = await metaRes.value.json() as any;
      const raw = Array.isArray(j?.reviews) ? j.reviews : [];
      reviews = raw
        .slice(0, 6)
        .map((r: any) => ({
          stars: Number(r.stars) || 0,
          title: String(r.reviewtitle || "").slice(0, 200),
          author: String(r.reviewer || "Anonymous").slice(0, 80),
          body: String(r.reviewbody || "").slice(0, 1200),
          date: r.reviewdate || r.createdate || null,
        }));
    }
    return { avgRating, downloadCount, numReviews, reviews };
  } catch {
    return empty;
  }
}

async function librivoxDetail(externalId: string): Promise<CommonBookDetail | null> {
  const url = `https://librivox.org/api/feed/audiobooks/?format=json&extended=1&id=${encodeURIComponent(externalId)}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(20_000), headers: FETCH_HEADERS });
  if (!r.ok) return null;
  const data = (await r.json()) as { books?: any[] };
  const b = (data.books || [])[0];
  if (!b) return null;

  const chapters: CommonChapter[] = (b.sections || []).map((s: any) => ({
    title: s.title || `Section ${s.section_number}`,
    audioUrl: s.listen_url,
    duration: parsePlaytime(s.playtime),
    sectionNumber: Number(s.section_number) || 0,
    readers: Array.isArray(s.readers)
      ? s.readers.map((r: any) => ({ id: String(r.reader_id ?? ""), name: String(r.display_name ?? "Reader") }))
      : [],
  }));

  // Aggregate unique readers across the whole book with per-chapter
  // counts, so the detail page can show a proper cast list rather
  // than repeating the same volunteer 30 times.
  const readerMap = new Map<string, { id: string; name: string; count: number }>();
  for (const ch of chapters) {
    for (const r of ch.readers) {
      const key = r.id || r.name;
      const cur = readerMap.get(key);
      if (cur) cur.count++;
      else readerMap.set(key, { id: r.id, name: r.name, count: 1 });
    }
  }
  const readers = Array.from(readerMap.values()).sort((a, b) => b.count - a.count);

  const archiveId = (b.url_iarchive as string | undefined)?.split("/").pop() || null;
  const stats = await fetchArchiveStats(archiveId);

  return {
    source: "librivox",
    externalId,
    bookKey: `librivox:${externalId}`,
    title: b.title || "Untitled",
    author: librivoxAuthorName(b),
    language: (b.language || "English").toLowerCase(),
    description: b.description ?? null,
    coverUrl: librivoxCover(b),
    totalDuration: Number(b.totaltimesecs) || parsePlaytime(b.totaltime),
    chapterCount: chapters.length,
    chapters,
    sourceUrl: b.url_librivox || `https://librivox.org/?p=${externalId}`,
    genres: (b.genres || []).map((g: any) => g.name).filter(Boolean),
    wikipediaUrl: (b.url_project as string) || null,
    archiveUrl: (b.url_iarchive as string) || null,
    zipDownloadUrl: (b.url_zip_file as string) || null,
    rssUrl: (b.url_rss as string) || null,
    textSourceUrl: (b.url_text_source as string) || null,
    copyrightYear: b.copyright_year ? String(b.copyright_year) : null,
    translators: Array.isArray(b.translators)
      ? b.translators
          .map((t: any) => ({ name: `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim() }))
          .filter((t: { name: string }) => t.name)
      : [],
    readers,
    avgRating: stats.avgRating,
    downloadCount: stats.downloadCount,
    numReviews: stats.numReviews,
    reviews: stats.reviews,
  };
}

// ── Featured picks ──────────────────────────────────────────────────
//
// A hand-picked strip of famous public-domain audiobooks that lands
// at the top of the browse page. The IDs are LibriVox book IDs looked
// up once; we re-fetch metadata live so covers, chapter counts and
// runtimes stay in sync with LibriVox.
//
// Chosen to span genres and be immediately recognisable: Dickens,
// Austen, Tolstoy, Twain, Wells, Doyle, Melville, Wilde, Verne, Stoker.

const FEATURED_LIBRIVOX_IDS = [
  "253",   // Pride and Prejudice — Austen
  "314",   // Adventures of Sherlock Holmes — Doyle
  "510",   // A Tale of Two Cities — Dickens
  "200",   // Alice's Adventures in Wonderland — Carroll
  "817",   // The Time Machine — Wells
  "365",   // The Picture of Dorian Gray — Wilde
  "271",   // Dracula — Stoker
  "2591",  // Great Expectations — Dickens
  "448",   // Adventures of Tom Sawyer — Twain
  "911",   // Wuthering Heights — Brontë
  "133",   // Jane Eyre — Brontë
  "449",   // Treasure Island — Stevenson
  "65",    // Odyssey — Homer
  "690",   // Iliad — Homer
];

function librivoxFeatured(): CommonBook[] {
  // The featured row is now served purely from the bundled catalogue.
  // Build an id -> row map once so the featured lookup is O(1).
  const byId = new Map<string, CatalogueRow>();
  for (const r of CATALOGUE) byId.set(r.id, r);
  const books: CommonBook[] = [];
  for (const id of FEATURED_LIBRIVOX_IDS) {
    const row = byId.get(id);
    if (row) books.push(catalogueToCommonBook(row));
  }
  return books;
}

// ── Routes ──────────────────────────────────────────────────────────

// GET /api/audiolibrary/browse
router.get("/api/audiolibrary/browse", async (req, res) => {
  try {
    const params = z.object({
      q: z.string().optional().default(""),
      page: z.coerce.number().min(0).max(1000).default(0),
      sort: z.enum(["recent", "popular", "title", "longest", "shortest"]).default("recent"),
      category: z.string().optional().default("all"),
    }).parse(req.query);
    const limit = 30;
    const offset = params.page * limit;
    const books = catalogueList({
      q: params.q,
      limit,
      offset,
      category: params.category,
      sort: params.sort,
    });
    res.json({ page: params.page, limit, books, total: catalogueCount() });
  } catch (err: any) {
    if (err?.name === "ZodError") { res.status(400).json({ message: "Invalid query" }); return; }
    logRouteError(req, err, "audiolibrary.browse");
    res.status(500).json({ message: "Catalogue lookup failed" });
  }
});

// GET /api/audiolibrary/featured — curated home row (served from the
// bundled catalogue, so no network round-trips.)
router.get("/api/audiolibrary/featured", async (_req, res) => {
  const books = librivoxFeatured();
  res.json({ books });
});

// GET /api/audiolibrary/book/:source/:externalId
router.get("/api/audiolibrary/book/:source/:externalId", async (req, res) => {
  try {
    const source = req.params.source;
    const externalId = req.params.externalId;
    if (source !== "librivox") { res.status(400).json({ message: "Unknown source" }); return; }
    const detail = await librivoxDetail(externalId);
    if (!detail) { res.status(404).json({ message: "Audiobook not found" }); return; }
    res.json(detail);
  } catch (err) {
    logRouteError(req, err, "audiolibrary.book");
    res.status(502).json({ message: "Upstream catalogue unavailable" });
  }
});

// ── Listening progress ──

router.get("/api/audiolibrary/progress/:source/:externalId", async (req: any, res) => {
  try {
    if (!req.isAuthenticated()) { res.json({ chapterIndex: 0, positionSeconds: 0, playbackRate: 1 }); return; }
    const userId = req.user.id as number;
    const bookKey = `${req.params.source}:${req.params.externalId}`;
    const [row] = await db
      .select()
      .from(audiolibraryProgress)
      .where(and(eq(audiolibraryProgress.userId, userId), eq(audiolibraryProgress.bookKey, bookKey)))
      .limit(1);
    if (!row) { res.json({ chapterIndex: 0, positionSeconds: 0, playbackRate: 1 }); return; }
    res.json({
      chapterIndex: row.chapterIndex,
      positionSeconds: row.positionSeconds,
      playbackRate: Number(row.playbackRate),
    });
  } catch (err) {
    logRouteError(req, err, "audiolibrary.progress.get");
    res.status(500).json({ message: "Failed to load progress" });
  }
});

router.post("/api/audiolibrary/progress/:source/:externalId", async (req: any, res) => {
  try {
    if (!req.isAuthenticated()) { res.status(204).send(); return; }
    const userId = req.user.id as number;
    const bookKey = `${req.params.source}:${req.params.externalId}`;
    const body = z.object({
      chapterIndex: z.number().int().min(0).max(999),
      positionSeconds: z.number().int().min(0).max(86_400),
      playbackRate: z.number().min(0.5).max(3).optional(),
    }).parse(req.body);
    await db
      .insert(audiolibraryProgress)
      .values({
        userId,
        bookKey,
        chapterIndex: body.chapterIndex,
        positionSeconds: body.positionSeconds,
        playbackRate: (body.playbackRate ?? 1).toFixed(2),
      })
      .onConflictDoUpdate({
        target: [audiolibraryProgress.userId, audiolibraryProgress.bookKey],
        set: {
          chapterIndex: body.chapterIndex,
          positionSeconds: body.positionSeconds,
          playbackRate: (body.playbackRate ?? 1).toFixed(2),
          updatedAt: new Date(),
        },
      });
    res.status(204).send();
  } catch (err) {
    logRouteError(req, err, "audiolibrary.progress.set");
    res.status(500).json({ message: "Failed to save progress" });
  }
});

// ── Bookmarks ──

router.get("/api/audiolibrary/bookmarks/:source/:externalId", async (req: any, res) => {
  try {
    if (!req.isAuthenticated()) { res.json({ bookmarks: [] }); return; }
    const userId = req.user.id as number;
    const bookKey = `${req.params.source}:${req.params.externalId}`;
    const rows = await db
      .select()
      .from(audiolibraryBookmarks)
      .where(and(eq(audiolibraryBookmarks.userId, userId), eq(audiolibraryBookmarks.bookKey, bookKey)))
      .orderBy(asc(audiolibraryBookmarks.chapterIndex), asc(audiolibraryBookmarks.positionSeconds));
    res.json({ bookmarks: rows });
  } catch (err) {
    logRouteError(req, err, "audiolibrary.bookmarks.list");
    res.status(500).json({ message: "Failed to load bookmarks" });
  }
});

router.post("/api/audiolibrary/bookmarks", async (req: any, res) => {
  try {
    if (!req.isAuthenticated()) { res.status(401).json({ message: "Sign in required" }); return; }
    const userId = req.user.id as number;
    const body = z.object({
      bookKey: z.string().min(1).max(300),
      chapterIndex: z.number().int().min(0).max(999),
      positionSeconds: z.number().int().min(0).max(86_400),
      label: z.string().max(200).optional().nullable(),
    }).parse(req.body);
    const [row] = await db
      .insert(audiolibraryBookmarks)
      .values({
        userId,
        bookKey: body.bookKey,
        chapterIndex: body.chapterIndex,
        positionSeconds: body.positionSeconds,
        label: body.label ?? null,
      })
      .returning();
    res.status(201).json(row);
  } catch (err: any) {
    if (err?.name === "ZodError") { res.status(400).json({ message: "Invalid body" }); return; }
    logRouteError(req, err, "audiolibrary.bookmarks.create");
    res.status(500).json({ message: "Failed to create bookmark" });
  }
});

router.delete("/api/audiolibrary/bookmarks/:id", async (req: any, res) => {
  try {
    if (!req.isAuthenticated()) { res.status(401).json({ message: "Sign in required" }); return; }
    const userId = req.user.id as number;
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ message: "Invalid id" }); return; }
    const [existing] = await db
      .select()
      .from(audiolibraryBookmarks)
      .where(eq(audiolibraryBookmarks.id, id))
      .limit(1);
    if (!existing) { res.status(404).json({ message: "Not found" }); return; }
    if (existing.userId !== userId) { res.status(403).json({ message: "Not yours" }); return; }
    await db.delete(audiolibraryBookmarks).where(eq(audiolibraryBookmarks.id, id));
    res.status(204).send();
  } catch (err) {
    logRouteError(req, err, "audiolibrary.bookmarks.delete");
    res.status(500).json({ message: "Failed to delete bookmark" });
  }
});

// ── Read-along: match audiobook to Gutenberg text ────────────────────

router.get("/api/audiolibrary/text-match/:source/:externalId", async (req, res) => {
  try {
    const source = req.params.source;
    const externalId = req.params.externalId;
    if (source !== "librivox") { res.status(400).json({ match: null }); return; }
    const detail = await librivoxDetail(externalId);
    if (!detail) { res.json({ match: null }); return; }
    const normTitle = (detail.title || "")
      .toLowerCase()
      .replace(/^(the|a|an)\s+/, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .trim();
    const authorLastName = (detail.author || "")
      .split(",")[0]
      .trim()
      .split(/\s+/)
      .pop()
      ?.toLowerCase() ?? "";
    if (!normTitle || !authorLastName) { res.json({ match: null }); return; }
    const candidates = await db.execute(sql`
      SELECT gutenberg_id, title
      FROM gutenberg_books
      WHERE
        lower(regexp_replace(coalesce(title, ''), '^(the|a|an)\\s+', '')) LIKE ${'%' + normTitle + '%'}
        AND lower(authors::text) LIKE ${'%' + authorLastName + '%'}
        AND content IS NOT NULL
      LIMIT 1
    `);
    const rows = ((candidates as any).rows ?? candidates) as any[];
    if (!rows || rows.length === 0) { res.json({ match: null }); return; }
    res.json({ match: { gutenbergId: rows[0].gutenberg_id ?? rows[0].gutenbergId, title: rows[0].title } });
  } catch (err) {
    logRouteError(req, err, "audiolibrary.text-match");
    res.json({ match: null });
  }
});

void gutenbergBooks;
void logger;
export default router;
