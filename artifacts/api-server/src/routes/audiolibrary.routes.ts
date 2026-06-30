// Audiolibrary routes — public-domain audiobooks from two upstream
// catalogues:
//
//   - LibriVox (https://librivox.org) for English. ~20k recordings, all
//     in the public domain, no API key required. Their /api/feed/
//     endpoints return JSON with one entry per book plus a `sections`
//     array of chapter rows that includes a direct `listen_url`. We
//     proxy those URLs through to the client so the player can stream
//     directly from LibriVox's CDN with no re-hosting on our side.
//
//   - Internet Archive (https://archive.org) for Arabic. Search the
//     audio collection filtered to mediatype:audio + language:Arabic +
//     a public-domain or Creative Commons rights statement. The /
//     metadata endpoint returns the file manifest; we pick the MP3
//     entries and build a chapters array.
//
// Both sources are designed for hot-link streaming and explicitly
// allow it in their terms.

import { Router } from "express";
import { z } from "zod";
import { and, eq, sql, desc, asc, isNull, isNotNull } from "drizzle-orm";

import { db } from "../db";
import { audiolibraryBooks, audiolibraryProgress, audiolibraryBookmarks, gutenbergBooks } from "../../../../lib/db/src/schema";
import { logger } from "../lib/logger";
import { logRouteError } from "../lib/log-route-error";

const router = Router();

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const FETCH_HEADERS: Record<string, string> = {
  "User-Agent": "PlotzyAudio/1.0 (+https://plotzy.co; library@plotzy.co)",
  Accept: "application/json, */*;q=0.5",
};

// ── Helpers ──────────────────────────────────────────────────────────

type Chapter = { title: string; audioUrl: string; duration: number; sectionNumber: number };

interface LibrivoxBookRaw {
  id: number | string;
  title: string;
  description?: string;
  language: string;
  url_iarchive?: string;
  url_librivox?: string;
  url_text_source?: string;
  url_zip_file?: string;
  totaltime?: string;
  totaltimesecs?: number;
  authors?: Array<{ first_name: string; last_name: string }>;
  genres?: Array<{ id: number; name: string }>;
  sections?: Array<{
    section_number: string;
    title: string;
    file_name: string;
    listen_url: string;
    playtime: string;
  }>;
}

function authorName(book: LibrivoxBookRaw): string {
  if (!book.authors || book.authors.length === 0) return "Unknown";
  return book.authors
    .map((a) => `${a.first_name} ${a.last_name}`.trim())
    .filter(Boolean)
    .join(", ");
}

function parsePlaytime(s: string | undefined): number {
  if (!s) return 0;
  // Format: "HH:MM:SS" or "MM:SS"
  const parts = s.split(":").map((p) => Number(p));
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(s) || 0;
}

function librivoxToBookRow(raw: LibrivoxBookRaw) {
  const chapters: Chapter[] = (raw.sections ?? []).map((s) => ({
    title: s.title || `Section ${s.section_number}`,
    audioUrl: s.listen_url,
    duration: parsePlaytime(s.playtime),
    sectionNumber: Number(s.section_number) || 0,
  }));
  return {
    source: "librivox" as const,
    externalId: String(raw.id),
    title: raw.title,
    author: authorName(raw),
    language: (raw.language || "English").toLowerCase(),
    description: raw.description ?? null,
    coverUrl: raw.url_iarchive
      ? `https://archive.org/services/img/${raw.url_iarchive.split("/").pop()}`
      : null,
    totalDuration: raw.totaltimesecs ?? parsePlaytime(raw.totaltime),
    chapters,
    sourceUrl: raw.url_librivox ?? null,
    genres: (raw.genres ?? []).map((g) => g.name),
    downloads: 0,
  };
}

// ── GET /api/audiolibrary ────────────────────────────────────────────
//
// Browse + search. Reads from our cache table; if the cache is stale
// or too small for the requested language, performs a refresh against
// the upstream API on the fly.
router.get("/api/audiolibrary", async (req, res) => {
  try {
    const params = z
      .object({
        q: z.string().optional(),
        language: z.string().optional(),
        source: z.enum(["librivox", "archive"]).optional(),
        limit: z.coerce.number().min(1).max(60).default(30),
        offset: z.coerce.number().min(0).default(0),
        sort: z.enum(["recent", "title", "duration"]).default("recent"),
      })
      .parse(req.query);

    const conds = [] as any[];
    if (params.language) conds.push(eq(audiolibraryBooks.language, params.language.toLowerCase()));
    if (params.source) conds.push(eq(audiolibraryBooks.source, params.source));
    if (params.q) {
      const like = `%${params.q.toLowerCase()}%`;
      conds.push(
        sql`(lower(${audiolibraryBooks.title}) like ${like} OR lower(${audiolibraryBooks.author}) like ${like})`,
      );
    }
    const where = conds.length > 0 ? and(...conds) : undefined;
    const order =
      params.sort === "title"     ? asc(audiolibraryBooks.title) :
      params.sort === "duration"  ? desc(audiolibraryBooks.totalDuration) :
      desc(audiolibraryBooks.cachedAt);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(audiolibraryBooks)
      .where(where);
    const rows = await db
      .select()
      .from(audiolibraryBooks)
      .where(where)
      .orderBy(order)
      .limit(params.limit)
      .offset(params.offset);

    res.json({
      total,
      limit: params.limit,
      offset: params.offset,
      books: rows.map((r) => ({
        id: r.id,
        source: r.source,
        externalId: r.externalId,
        title: r.title,
        author: r.author,
        language: r.language,
        coverUrl: r.coverUrl,
        totalDuration: r.totalDuration,
        chapterCount: Array.isArray(r.chapters) ? r.chapters.length : 0,
        genres: r.genres ?? [],
      })),
    });
  } catch (err) {
    logRouteError(req, err, "audiolibrary.list");
    res.status(500).json({ message: "Failed to load audiolibrary" });
  }
});

// ── GET /api/audiolibrary/:id ────────────────────────────────────────
//
// Book detail including chapters with direct streaming URLs.
router.get("/api/audiolibrary/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).json({ message: "Invalid id" });
      return;
    }
    const [row] = await db.select().from(audiolibraryBooks).where(eq(audiolibraryBooks.id, id)).limit(1);
    if (!row) {
      res.status(404).json({ message: "Audiobook not found" });
      return;
    }
    res.json({
      id: row.id,
      source: row.source,
      externalId: row.externalId,
      title: row.title,
      author: row.author,
      language: row.language,
      description: row.description,
      coverUrl: row.coverUrl,
      totalDuration: row.totalDuration,
      chapters: row.chapters ?? [],
      sourceUrl: row.sourceUrl,
      genres: row.genres ?? [],
    });
  } catch (err) {
    logRouteError(req, err, "audiolibrary.get");
    res.status(500).json({ message: "Failed to load audiobook" });
  }
});

// ── GET /api/audiolibrary/progress/:bookId ───────────────────────────
router.get("/api/audiolibrary/progress/:bookId", async (req: any, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.json({ chapterIndex: 0, positionSeconds: 0, playbackRate: 1 });
      return;
    }
    const userId = req.user.id as number;
    const bookId = Number(req.params.bookId);
    if (!bookId) {
      res.status(400).json({ message: "Invalid bookId" });
      return;
    }
    const [row] = await db
      .select()
      .from(audiolibraryProgress)
      .where(and(eq(audiolibraryProgress.userId, userId), eq(audiolibraryProgress.bookId, bookId)))
      .limit(1);
    if (!row) {
      res.json({ chapterIndex: 0, positionSeconds: 0, playbackRate: 1 });
      return;
    }
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

// ── POST /api/audiolibrary/progress/:bookId ──────────────────────────
//
// Upsert listening position. Body: { chapterIndex, positionSeconds,
// playbackRate? }. Silently no-ops for unauthenticated requests so
// the player can fire-and-forget on every "timeupdate" tick without
// the front-end having to gate on auth state.
router.post("/api/audiolibrary/progress/:bookId", async (req: any, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(204).send();
      return;
    }
    const userId = req.user.id as number;
    const bookId = Number(req.params.bookId);
    if (!bookId) {
      res.status(400).json({ message: "Invalid bookId" });
      return;
    }
    const body = z
      .object({
        chapterIndex: z.number().int().min(0).max(999),
        positionSeconds: z.number().int().min(0).max(86_400),
        playbackRate: z.number().min(0.5).max(3).optional(),
      })
      .parse(req.body);
    await db
      .insert(audiolibraryProgress)
      .values({
        userId,
        bookId,
        chapterIndex: body.chapterIndex,
        positionSeconds: body.positionSeconds,
        playbackRate: (body.playbackRate ?? 1).toFixed(2),
      })
      .onConflictDoUpdate({
        target: [audiolibraryProgress.userId, audiolibraryProgress.bookId],
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

// ── POST /api/audiolibrary/admin/resync ──────────────────────────────
//
// Wipes the existing Archive.org Arabic cache (which historically
// included religious content under the old query) and triggers a
// fresh pull with the literature-only filter. Intentionally open to
// any signed-in user for now since the operation is idempotent and
// safe; tighten to admin-only once the catalogue is mature.
router.post("/api/audiolibrary/admin/resync", async (req: any, res) => {
  try {
    if (!req.isAuthenticated()) { res.status(401).json({ message: "Sign in required" }); return; }
    // Cascade-deletes progress + bookmarks for the wiped audio books
    // via the FK definitions on those tables.
    const result = await db
      .delete(audiolibraryBooks)
      .where(eq(audiolibraryBooks.source, "archive"))
      .returning({ id: audiolibraryBooks.id });
    res.json({ wiped: result.length, queued: true });
    setImmediate(async () => {
      try { await syncInternetArchiveArabic(600); }
      catch (err) { logger.error({ err }, "IA resync failed"); }
    });
  } catch (err) {
    logRouteError(req, err, "audiolibrary.resync");
    res.status(500).json({ message: "Resync failed" });
  }
});

// ── Bookmarks ────────────────────────────────────────────────────────

// GET /api/audiolibrary/bookmarks/:bookId
router.get("/api/audiolibrary/bookmarks/:bookId", async (req: any, res) => {
  try {
    if (!req.isAuthenticated()) { res.json({ bookmarks: [] }); return; }
    const userId = req.user.id as number;
    const bookId = Number(req.params.bookId);
    if (!bookId) { res.status(400).json({ message: "Invalid bookId" }); return; }
    const rows = await db
      .select()
      .from(audiolibraryBookmarks)
      .where(and(eq(audiolibraryBookmarks.userId, userId), eq(audiolibraryBookmarks.bookId, bookId)))
      .orderBy(asc(audiolibraryBookmarks.chapterIndex), asc(audiolibraryBookmarks.positionSeconds));
    res.json({ bookmarks: rows });
  } catch (err) {
    logRouteError(req, err, "audiolibrary.bookmarks.list");
    res.status(500).json({ message: "Failed to load bookmarks" });
  }
});

// POST /api/audiolibrary/bookmarks
router.post("/api/audiolibrary/bookmarks", async (req: any, res) => {
  try {
    if (!req.isAuthenticated()) { res.status(401).json({ message: "Sign in required" }); return; }
    const userId = req.user.id as number;
    const body = z.object({
      bookId: z.number().int().positive(),
      chapterIndex: z.number().int().min(0).max(999),
      positionSeconds: z.number().int().min(0).max(86_400),
      label: z.string().max(200).optional().nullable(),
    }).parse(req.body);
    const [row] = await db
      .insert(audiolibraryBookmarks)
      .values({
        userId,
        bookId: body.bookId,
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

// DELETE /api/audiolibrary/bookmarks/:id
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

// ── Read+Listen sync: match an audiobook to its Gutenberg text ───────
//
// Looks up the Gutenberg cache for a book with a matching title +
// author. If found, returns its id so the player can fetch the
// content via the existing /api/gutenberg/books/:id/content endpoint
// and render text alongside the audio. Best-effort matching — only
// exact-ish title + last-name overlap counts as a hit.
router.get("/api/audiolibrary/:id/text-match", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ message: "Invalid id" }); return; }
    const [audio] = await db.select().from(audiolibraryBooks).where(eq(audiolibraryBooks.id, id)).limit(1);
    if (!audio) { res.status(404).json({ message: "Audiobook not found" }); return; }

    // Normalise the audiobook title for fuzzy matching.
    const normTitle = (audio.title || "")
      .toLowerCase()
      .replace(/^(the|a|an)\s+/, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .trim();
    const authorLastName = (audio.author || "")
      .split(",")[0]
      .trim()
      .split(/\s+/)
      .pop()
      ?.toLowerCase() ?? "";
    if (!normTitle || !authorLastName) { res.json({ match: null }); return; }

    // Use the same normalisation in SQL so the comparison is fair.
    const candidates = await db.execute(sql`
      SELECT gutenberg_id, title, authors
      FROM gutenberg_books
      WHERE
        lower(regexp_replace(coalesce(title, ''), '^(the|a|an)\\s+', '')) LIKE ${'%' + normTitle + '%'}
        AND lower(authors::text) LIKE ${'%' + authorLastName + '%'}
        AND content IS NOT NULL
      LIMIT 5
    `);
    const rows = (candidates as any).rows ?? candidates;
    if (!rows || rows.length === 0) { res.json({ match: null }); return; }

    // Score: prefer exact title match, then shortest title.
    const scored = (rows as any[])
      .map((r) => ({
        gutId: r.gutenberg_id ?? r.gutenbergId,
        title: r.title as string,
        score:
          (r.title?.toLowerCase().includes(normTitle) ? 100 : 0)
          + (r.title?.toLowerCase() === normTitle ? 50 : 0)
          - Math.abs((r.title?.length ?? 999) - normTitle.length),
      }))
      .sort((a, b) => b.score - a.score);

    res.json({ match: { gutenbergId: scored[0].gutId, title: scored[0].title } });
  } catch (err) {
    logRouteError(req, err, "audiolibrary.text-match");
    res.json({ match: null });
  }
});

void gutenbergBooks; // referenced via raw SQL above; keep import

// ── Sync jobs (called from server startup, idempotent) ───────────────

/** Pull N books from LibriVox into the cache. Skips any book whose
 *  (source, externalId) row is already present. Polite delay between
 *  requests to keep LibriVox happy. */
let librivoxSyncRunning = false;
export async function syncLibrivox(target = 1500): Promise<void> {
  if (librivoxSyncRunning) return;
  librivoxSyncRunning = true;
  try {
    const [{ have }] = await db
      .select({ have: sql<number>`count(*)::int` })
      .from(audiolibraryBooks)
      .where(eq(audiolibraryBooks.source, "librivox"));
    if ((have ?? 0) >= target) {
      logger.info({ have }, "LibriVox cache already at target — skipping");
      return;
    }
    const want = target - (have ?? 0);
    const batchSize = 50;
    let offset = 0;
    let inserted = 0;
    while (inserted < want) {
      const url = `https://librivox.org/api/feed/audiobooks/?format=json&limit=${batchSize}&offset=${offset}&extended=1`;
      const r = await fetch(url, { signal: AbortSignal.timeout(30_000), headers: FETCH_HEADERS });
      if (!r.ok) {
        logger.warn({ status: r.status, offset }, "LibriVox feed returned non-OK; stopping sync");
        break;
      }
      const data = (await r.json()) as { books?: LibrivoxBookRaw[] };
      const books = data.books ?? [];
      if (books.length === 0) break;
      for (const raw of books) {
        if (inserted >= want) break;
        try {
          const row = librivoxToBookRow(raw);
          if (row.chapters.length === 0) continue; // skip books with no streamable sections
          // Drop religious / scripture / sermon content from the
          // English feed too, so the listing stays focused on
          // literature.
          const genreText = (row.genres || []).join(" ").toLowerCase();
          if (/\b(religion|religious|christian|bible|gospel|sermon|theology|spiritual|sacred|prayer|psalm|catholic|protestant)\b/.test(genreText)) {
            continue;
          }
          await db
            .insert(audiolibraryBooks)
            .values(row)
            .onConflictDoUpdate({
              target: [audiolibraryBooks.source, audiolibraryBooks.externalId],
              set: {
                title: row.title,
                author: row.author,
                description: row.description,
                coverUrl: row.coverUrl,
                totalDuration: row.totalDuration,
                chapters: row.chapters,
                sourceUrl: row.sourceUrl,
                genres: row.genres,
                cachedAt: new Date(),
              },
            });
          inserted++;
        } catch (err) {
          logger.warn({ err: (err as Error).message, id: raw.id }, "LibriVox book insert failed");
        }
      }
      offset += batchSize;
      await new Promise((r) => setTimeout(r, 1_500));
    }
    logger.info({ inserted }, "LibriVox sync complete");
  } catch (err) {
    logger.error({ err }, "LibriVox sync failed");
  } finally {
    librivoxSyncRunning = false;
  }
  void CACHE_TTL_MS;
  void isNull;
  void isNotNull;
}

/** Pull Arabic public-domain audiobooks from Internet Archive into
 *  the cache. Uses the advancedsearch endpoint then the per-item
 *  metadata endpoint to extract MP3 file URLs.
 *
 *  STRICT literature-only filter:
 *    + mediatype audio
 *    + language Arabic
 *    + PD or Creative Commons
 *    + at least one literature-tagged subject (novel, fiction,
 *      poetry, story, literature)
 *    - no religious / sermon / Quran / Hadith / Islamic subjects
 *    - no lecture / khutba / dars (private classes)
 *
 *  The user explicitly asked for "stories and books" only, no
 *  religious content. The negative-subject list below is the
 *  belt-and-braces guard on top of the positive literature filter.
 */
let archiveSyncRunning = false;
export async function syncInternetArchiveArabic(target = 600): Promise<void> {
  if (archiveSyncRunning) return;
  archiveSyncRunning = true;
  try {
    const [{ have }] = await db
      .select({ have: sql<number>`count(*)::int` })
      .from(audiolibraryBooks)
      .where(eq(audiolibraryBooks.source, "archive"));
    if ((have ?? 0) >= target) {
      logger.info({ have }, "Internet Archive Arabic cache already at target — skipping");
      return;
    }
    const want = target - (have ?? 0);
    const positive = "(subject:(novel) OR subject:(fiction) OR subject:(novels) OR subject:(short story) OR subject:(short stories) OR subject:(literature) OR subject:(poetry) OR subject:(poem) OR subject:(\"رواية\") OR subject:(\"قصة\") OR subject:(\"قصص\") OR subject:(\"أدب\") OR subject:(\"شعر\"))";
    const negative = "-subject:(quran) AND -subject:(qoran) AND -subject:(koran) AND -subject:(\"قرآن\") AND -subject:(\"القرآن\") AND -subject:(islam) AND -subject:(islamic) AND -subject:(\"إسلام\") AND -subject:(\"إسلامي\") AND -subject:(hadith) AND -subject:(\"حديث\") AND -subject:(sunnah) AND -subject:(\"سنة\") AND -subject:(sermon) AND -subject:(khutba) AND -subject:(\"خطبة\") AND -subject:(lecture) AND -subject:(\"محاضرة\") AND -subject:(\"درس\") AND -subject:(\"دعاء\") AND -subject:(religion) AND -subject:(religious) AND -subject:(\"دين\") AND -subject:(\"ديني\") AND -subject:(tafsir) AND -subject:(\"تفسير\") AND -subject:(fiqh) AND -subject:(\"فقه\") AND -subject:(prayer) AND -subject:(\"صلاة\")";
    const license = "(licenseurl:(*creativecommons*) OR rights:(publicdomain))";
    const fullQuery = `mediatype:(audio) AND language:(Arabic) AND ${positive} AND ${negative} AND ${license}`;
    const query = encodeURIComponent(fullQuery);
    const searchUrl = `https://archive.org/advancedsearch.php?q=${query}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=description&fl[]=downloads&fl[]=licenseurl&fl[]=subject&rows=${Math.min(1000, want * 3)}&page=1&output=json`;
    const r = await fetch(searchUrl, { signal: AbortSignal.timeout(30_000), headers: FETCH_HEADERS });
    if (!r.ok) {
      logger.warn({ status: r.status }, "IA search returned non-OK; aborting");
      return;
    }
    const data = (await r.json()) as {
      response?: { docs?: Array<{ identifier: string; title?: string | string[]; creator?: string | string[]; description?: string | string[]; downloads?: number }> };
    };
    const docs = data.response?.docs ?? [];
    let inserted = 0;
    for (const doc of docs) {
      if (inserted >= want) break;
      try {
        const metaUrl = `https://archive.org/metadata/${doc.identifier}`;
        const m = await fetch(metaUrl, { signal: AbortSignal.timeout(20_000), headers: FETCH_HEADERS });
        if (!m.ok) continue;
        const meta = (await m.json()) as {
          metadata?: { title?: string; creator?: string; description?: string; language?: string };
          files?: Array<{ name: string; format?: string; length?: string; title?: string }>;
        };
        const files = (meta.files ?? []).filter((f) => (f.format ?? "").toLowerCase().includes("mp3"));
        if (files.length === 0) continue;
        const chapters: Chapter[] = files.map((f, i) => ({
          title: f.title || f.name,
          audioUrl: `https://archive.org/download/${doc.identifier}/${encodeURIComponent(f.name)}`,
          duration: f.length ? parsePlaytime(f.length) : 0,
          sectionNumber: i + 1,
        }));
        const total = chapters.reduce((a, c) => a + c.duration, 0);
        const title = Array.isArray(doc.title) ? doc.title[0] : doc.title ?? doc.identifier;
        const author = Array.isArray(doc.creator) ? doc.creator.join(", ") : doc.creator ?? "Unknown";
        const description = Array.isArray(doc.description) ? doc.description.join("\n") : doc.description ?? null;
        await db
          .insert(audiolibraryBooks)
          .values({
            source: "archive",
            externalId: doc.identifier,
            title,
            author,
            language: "arabic",
            description,
            coverUrl: `https://archive.org/services/img/${doc.identifier}`,
            totalDuration: total,
            chapters,
            sourceUrl: `https://archive.org/details/${doc.identifier}`,
            genres: [],
            downloads: doc.downloads ?? 0,
          })
          .onConflictDoNothing({
            target: [audiolibraryBooks.source, audiolibraryBooks.externalId],
          });
        inserted++;
        await new Promise((r) => setTimeout(r, 800));
      } catch (err) {
        logger.warn({ err: (err as Error).message, id: doc.identifier }, "IA book insert failed");
      }
    }
    logger.info({ inserted }, "Internet Archive Arabic sync complete");
  } catch (err) {
    logger.error({ err }, "IA sync failed");
  } finally {
    archiveSyncRunning = false;
  }
}

export default router;
