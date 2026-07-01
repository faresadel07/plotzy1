// Audiolibrary routes — DIRECT PROXY to LibriVox (English only).
//
// Design decisions:
//   - Browse + detail hit LibriVox on every request. No DB cache.
//   - The writer sees the FULL upstream catalogue (~20,000 books).
//   - Per-user data (bookmarks, listening progress) live in
//     audiolibrary_progress / audiolibrary_bookmarks, keyed by a
//     "librivox:<external_id>" string.
//   - The `source` path segment is kept in the URL for forward
//     compatibility (if we add a second English source later we
//     don't have to rev every route).
//
// LibriVox: https://librivox.org/api/feed/audiobooks/?format=json
//   Free, no key, ?extended=1 includes the sections array with direct
//   listen_url streaming URLs.

import { Router } from "express";
import { z } from "zod";
import { and, eq, asc, sql } from "drizzle-orm";

import { db } from "../db";
import { audiolibraryProgress, audiolibraryBookmarks, gutenbergBooks } from "../../../../lib/db/src/schema";
import { logger } from "../lib/logger";
import { logRouteError } from "../lib/log-route-error";

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

// ── LibriVox: list ──────────────────────────────────────────────────
//
// LibriVox exposes a genre filter (?genre=Fiction) but no combined
// sort. We map our category IDs to the exact genre strings LibriVox
// accepts, then sort the returned window on our side by title/length
// when the caller asked for that ordering. "recent" is the natural
// LibriVox order (most recently catalogued first).

const CATEGORY_TO_GENRE: Record<string, string | null> = {
  all: null,
  fiction: "*Non-fiction",              // handled specially below
  classics: "Historical Fiction",
  mystery: "Detective Fiction",
  adventure: "Action & Adventure Fiction",
  scifi: "Science Fiction",
  romance: "Romance",
  horror: "Horror & Supernatural Fiction",
  poetry: "Poetry",
  children: "Children's Fiction",
  shortstories: "Short Stories",
  history: "History",
  philosophy: "Philosophy",
  biography: "Biography & Autobiography",
  humor: "Humorous Fiction",
};

function mapLibrivoxRow(b: any): CommonBook {
  return {
    source: "librivox" as const,
    externalId: String(b.id),
    bookKey: `librivox:${b.id}`,
    title: b.title || "Untitled",
    author: librivoxAuthorName(b),
    language: (b.language || "English").toLowerCase(),
    coverUrl: librivoxCover(b),
    totalDuration: parsePlaytime(b.totaltime) || Number(b.totaltimesecs) || null,
    chapterCount: Array.isArray(b.sections) ? b.sections.length : (Number(b.num_sections) || 0),
    genres: (b.genres || []).map((g: any) => g.name).filter(Boolean),
  };
}

function isEnglishRow(b: any): boolean {
  const lang = String(b.language || "").toLowerCase();
  return lang === "english" || lang === "multilingual" || lang.includes("english");
}

async function librivoxFetchRaw(qs: URLSearchParams): Promise<any[]> {
  const url = `https://librivox.org/api/feed/audiobooks/?${qs.toString()}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(20_000), headers: FETCH_HEADERS });
  if (!r.ok) return [];
  try {
    const data = (await r.json()) as { books?: any[] };
    return data.books ?? [];
  } catch {
    return [];
  }
}

// Fetch a LibriVox book by exact title. Tries the query as-is, and
// also with "The " stripped and with the subtitle after a comma
// dropped. Returns the first hit or null.
async function librivoxByExactTitle(title: string): Promise<any | null> {
  const variants = new Set<string>([
    title,
    title.replace(/^(the|a|an)\s+/i, ""),
    title.split(",")[0].trim(),
    title.replace(/^(the|a|an)\s+/i, "").split(",")[0].trim(),
  ]);
  for (const v of variants) {
    if (!v) continue;
    const u = new URLSearchParams();
    u.set("format", "json");
    u.set("extended", "1");
    u.set("limit", "1");
    u.set("title", v);
    const rows = await librivoxFetchRaw(u);
    if (rows.length > 0) return rows[0];
  }
  return null;
}

// LibriVox's `title=` filter is a whole-title exact match — it happily
// 0-hits "Pride" or "Sherlock". `author=` is forgiving for surnames
// but not partial title words. So we fan out:
//   1. LibriVox title exact
//   2. LibriVox author exact
//   3. Archive.org librivoxaudio fuzzy search (real fuzzy title
//      matching) — for each hit we resolve back to a LibriVox book
//      via exact-title lookup with common variants
//   4. If STILL thin, JS fuzzy scan across a wider window
async function librivoxSearch(q: string, category: string, limit: number): Promise<CommonBook[]> {
  const cat = CATEGORY_TO_GENRE[category];
  const base = () => {
    const u = new URLSearchParams();
    u.set("format", "json");
    u.set("extended", "1");
    u.set("limit", "60");
    if (cat && cat !== "*Non-fiction") u.set("genre", cat);
    return u;
  };
  const titleQs = base(); titleQs.set("title", q);
  const authorQs = base(); authorQs.set("author", q);

  // Archive.org fuzzy search over the librivoxaudio collection.
  // Real substring/token matching, unlike LibriVox's own search.
  const archiveQuery = `collection:(librivoxaudio) AND (title:(${JSON.stringify(q)}) OR creator:(${JSON.stringify(q)}))`;
  const archiveUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(archiveQuery)}&fl[]=identifier&fl[]=title&rows=15&output=json&sort[]=downloads%20desc`;
  const archivePromise: Promise<any> = fetch(archiveUrl, { signal: AbortSignal.timeout(15_000), headers: FETCH_HEADERS })
    .then((r) => r.ok ? r.json() : { response: { docs: [] } })
    .catch(() => ({ response: { docs: [] } }));

  const [titleHits, authorHits, archiveResp] = await Promise.all([
    librivoxFetchRaw(titleQs),
    librivoxFetchRaw(authorQs),
    archivePromise,
  ]);

  const seen = new Set<string>();
  const merged: any[] = [];
  const pushIfNew = (row: any) => {
    const id = String(row.id);
    if (seen.has(id)) return false;
    if (!isEnglishRow(row)) return false;
    seen.add(id);
    merged.push(row);
    return true;
  };
  for (const row of [...titleHits, ...authorHits]) pushIfNew(row);

  // Map archive.org hits back to LibriVox books via exact-title lookup.
  const archiveDocs = (archiveResp?.response?.docs || []) as any[];
  const titles = archiveDocs
    .map((d: any) => (Array.isArray(d.title) ? d.title[0] : d.title))
    .filter(Boolean)
    .slice(0, 10);
  if (titles.length > 0 && merged.length < limit) {
    const resolved = await Promise.all(titles.map((t: string) => librivoxByExactTitle(t)));
    for (const row of resolved) {
      if (!row) continue;
      pushIfNew(row);
      if (merged.length >= limit) break;
    }
  }

  if (merged.length >= limit) return merged.slice(0, limit).map(mapLibrivoxRow);

  // Last resort — JS fuzzy scan across ~600 books in parallel.
  const scanPages = [0, 60, 120, 180, 240, 300, 360, 420, 480, 540];
  const scanQs = scanPages.map((offset) => {
    const u = base();
    u.set("offset", String(offset));
    return u;
  });
  const scanBatches = await Promise.all(scanQs.map((qs) => librivoxFetchRaw(qs)));
  const needle = q.toLowerCase();
  for (const batch of scanBatches) {
    for (const row of batch) {
      if (!isEnglishRow(row)) continue;
      const title = String(row.title || "").toLowerCase();
      const author = librivoxAuthorName(row).toLowerCase();
      if (title.includes(needle) || author.includes(needle)) {
        pushIfNew(row);
        if (merged.length >= limit) break;
      }
    }
    if (merged.length >= limit) break;
  }
  return merged.slice(0, limit).map(mapLibrivoxRow);
}

async function librivoxList(params: {
  q: string;
  limit: number;
  offset: number;
  category: string;
  sort: string;
}): Promise<CommonBook[]> {
  // Search takes a different path — LibriVox's built-in search is
  // exact-match only, so we merge title + author + a fuzzy pass to
  // deliver the results a writer would actually expect.
  if (params.q) {
    const results = await librivoxSearch(params.q, params.category, params.limit);
    if (params.sort === "title") {
      results.sort((a, b) => a.title.localeCompare(b.title));
    } else if (params.sort === "longest") {
      results.sort((a, b) => (b.totalDuration ?? 0) - (a.totalDuration ?? 0));
    } else if (params.sort === "shortest") {
      results.sort((a, b) => (a.totalDuration ?? Infinity) - (b.totalDuration ?? Infinity));
    }
    return results;
  }

  // Non-search browse: catalogue is ~84% English so we oversample by
  // 1.5x, drop non-English, and slice back to the requested size.
  const oversample = Math.ceil(params.limit * 1.5);
  const oversampleOffset = Math.ceil(params.offset * 1.5);

  const u = new URLSearchParams();
  u.set("format", "json");
  u.set("extended", "1");
  u.set("limit", String(oversample));
  u.set("offset", String(oversampleOffset));
  const cat = CATEGORY_TO_GENRE[params.category];
  if (cat && cat !== "*Non-fiction") u.set("genre", cat);

  const rows = (await librivoxFetchRaw(u))
    .filter(isEnglishRow)
    .slice(0, params.limit);
  const mapped = rows.map(mapLibrivoxRow);

  if (params.sort === "title") {
    mapped.sort((a, b) => a.title.localeCompare(b.title));
  } else if (params.sort === "longest") {
    mapped.sort((a, b) => (b.totalDuration ?? 0) - (a.totalDuration ?? 0));
  } else if (params.sort === "shortest") {
    mapped.sort((a, b) => (a.totalDuration ?? Infinity) - (b.totalDuration ?? Infinity));
  }
  return mapped;
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

async function librivoxFeatured(): Promise<CommonBook[]> {
  // Cards only need the CommonBook fields — skip the archive.org
  // stats/reviews fetch (which fires 2 HTTP calls per book) since the
  // featured row would otherwise trigger ~28 upstream requests.
  const results = await Promise.allSettled(
    FEATURED_LIBRIVOX_IDS.map(async (id) => {
      const url = `https://librivox.org/api/feed/audiobooks/?format=json&extended=1&id=${encodeURIComponent(id)}`;
      const r = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: FETCH_HEADERS });
      if (!r.ok) return null;
      const data = (await r.json()) as { books?: any[] };
      const b = (data.books || [])[0];
      return b ? mapLibrivoxRow(b) : null;
    }),
  );
  const books: CommonBook[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) books.push(r.value);
  }
  return books;
}

// ── Routes ──────────────────────────────────────────────────────────

// GET /api/audiolibrary/browse
router.get("/api/audiolibrary/browse", async (req, res) => {
  try {
    const params = z.object({
      q: z.string().optional().default(""),
      page: z.coerce.number().min(0).max(300).default(0),
      sort: z.enum(["recent", "popular", "title", "longest", "shortest"]).default("recent"),
      category: z.string().optional().default("all"),
    }).parse(req.query);
    const limit = 30;
    const offset = params.page * limit;
    const books = await librivoxList({
      q: params.q,
      limit,
      offset,
      category: params.category,
      sort: params.sort,
    });
    res.json({ page: params.page, limit, books });
  } catch (err: any) {
    if (err?.name === "ZodError") { res.status(400).json({ message: "Invalid query" }); return; }
    logRouteError(req, err, "audiolibrary.browse");
    res.status(502).json({ message: "Upstream catalogue unavailable" });
  }
});

// GET /api/audiolibrary/featured — curated home row
router.get("/api/audiolibrary/featured", async (req, res) => {
  try {
    const books = await librivoxFeatured();
    res.json({ books });
  } catch (err) {
    logRouteError(req, err, "audiolibrary.featured");
    res.status(502).json({ message: "Featured picks unavailable" });
  }
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
