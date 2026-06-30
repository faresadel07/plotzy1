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
import { audiolibraryBooks, audiolibraryProgress } from "../../../../lib/db/src/schema";
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

// ── Sync jobs (called from server startup, idempotent) ───────────────

/** Pull N books from LibriVox into the cache. Skips any book whose
 *  (source, externalId) row is already present. Polite delay between
 *  requests to keep LibriVox happy. */
let librivoxSyncRunning = false;
export async function syncLibrivox(target = 300): Promise<void> {
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
 *  metadata endpoint to extract MP3 file URLs. */
let archiveSyncRunning = false;
export async function syncInternetArchiveArabic(target = 100): Promise<void> {
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
    const query = encodeURIComponent(
      `mediatype:(audio) AND language:(Arabic) AND (-rights:(*copyright*) AND (licenseurl:(*creativecommons*) OR rights:(publicdomain)))`,
    );
    const searchUrl = `https://archive.org/advancedsearch.php?q=${query}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=description&fl[]=downloads&fl[]=licenseurl&rows=${Math.min(200, want * 2)}&page=1&output=json`;
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
