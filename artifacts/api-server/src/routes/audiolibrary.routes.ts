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
}

interface CommonBookDetail extends CommonBook {
  description: string | null;
  chapters: CommonChapter[];
  sourceUrl: string;
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

async function librivoxList(params: {
  q: string;
  limit: number;
  offset: number;
  category: string;
  sort: string;
}): Promise<CommonBook[]> {
  // The catalogue is ~84% English, so to guarantee we return `limit`
  // English books per page we oversample by ~1.5x and drop anything
  // that isn't English on our side. LibriVox has no ?language= filter
  // (they accept the param but ignore it), so JS is the only way.
  const oversample = Math.ceil(params.limit * 1.5);
  const oversampleOffset = Math.ceil(params.offset * 1.5);

  const u = new URLSearchParams();
  u.set("format", "json");
  u.set("extended", "1");
  u.set("limit", String(oversample));
  u.set("offset", String(oversampleOffset));
  if (params.q) u.set("title", params.q);
  const cat = CATEGORY_TO_GENRE[params.category];
  // "fiction" is treated as "all" — LibriVox has no wide "Fiction"
  // genre, so the tab just accepts everything.
  if (cat && cat !== "*Non-fiction") u.set("genre", cat);

  const url = `https://librivox.org/api/feed/audiobooks/?${u.toString()}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(20_000), headers: FETCH_HEADERS });
  if (!r.ok) throw new Error(`LibriVox list failed: ${r.status}`);
  const data = (await r.json()) as { books?: any[] };
  const rows = (data.books ?? []).filter((b) => {
    const lang = String(b.language || "").toLowerCase();
    return lang === "english" || lang === "multilingual" || lang.includes("english");
  }).slice(0, params.limit);

  const mapped: CommonBook[] = rows.map((b) => ({
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
  }));

  // Client-side sort on the returned window (LibriVox has no server sort).
  if (params.sort === "title") {
    mapped.sort((a, b) => a.title.localeCompare(b.title));
  } else if (params.sort === "longest") {
    mapped.sort((a, b) => (b.totalDuration ?? 0) - (a.totalDuration ?? 0));
  } else if (params.sort === "shortest") {
    mapped.sort((a, b) => (a.totalDuration ?? Infinity) - (b.totalDuration ?? Infinity));
  }
  // "recent" and "popular" fall through as LibriVox's default ordering.

  return mapped;
}

// ── LibriVox: detail ────────────────────────────────────────────────

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
  }));
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
  // LibriVox's feed accepts a single id at a time — fire them all in
  // parallel and drop failures.
  const results = await Promise.allSettled(
    FEATURED_LIBRIVOX_IDS.map(async (id) => {
      const d = await librivoxDetail(id);
      return d;
    }),
  );
  const books: CommonBook[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      const { chapters: _c, description: _d, sourceUrl: _s, ...rest } = r.value;
      void _c; void _d; void _s;
      books.push(rest);
    }
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
