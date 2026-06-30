// Audiolibrary routes — DIRECT PROXY to LibriVox + Internet Archive.
//
// Architecture (revised per writer feedback):
//   - Browse + detail hit the upstream APIs on every request.
//   - We do NOT cache catalogues in our DB. Zero storage cost.
//   - The writer sees the FULL upstream catalogue (20k+ LibriVox
//     English; thousands of Arabic literature on Archive.org).
//   - Per-user data (bookmarks, listening progress) still lives in
//     audiolibrary_progress / audiolibrary_bookmarks, keyed by a
//     "<source>:<external_id>" string instead of an internal FK.
//
// LibriVox: https://librivox.org/api/feed/audiobooks/?format=json
//   Free, no key, returns one entry per book. ?extended=1 includes
//   the sections array with direct listen_url streaming URLs.
//
// Internet Archive: https://archive.org/advancedsearch.php
//   Free, no key, returns hits with identifier we then resolve via
//   https://archive.org/metadata/<id> for the audio file manifest.

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
  source: "librivox" | "archive";
  externalId: string;
  bookKey: string; // source:externalId
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

// LibriVox cover via Archive.org. The book's url_iarchive ends in the
// archive identifier; we substitute it into the services/img endpoint.
function librivoxCover(book: any): string | null {
  const u = book.url_iarchive as string | undefined;
  if (!u) return null;
  const id = u.split("/").pop();
  if (!id) return null;
  return `https://archive.org/services/img/${id}`;
}

function librivoxIsReligious(book: any): boolean {
  const genres = (book.genres || []).map((g: any) => g.name?.toLowerCase() ?? "").join(" ");
  return /\b(religion|religious|christian|bible|gospel|sermon|theology|spiritual|sacred|psalm|catholic|protestant)\b/.test(genres);
}

// ── LibriVox: list ──────────────────────────────────────────────────

async function librivoxList(params: { q: string; limit: number; offset: number }): Promise<CommonBook[]> {
  // LibriVox doesn't expose a server-side title search through the
  // feed, but it does have a `title` filter and a `since` cursor.
  // For our purposes the simplest path is page through the feed and
  // do the keyword match in JS for the page window.
  const url = `https://librivox.org/api/feed/audiobooks/?format=json&limit=${params.limit}&offset=${params.offset}${params.q ? `&title=${encodeURIComponent(params.q)}` : ""}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(20_000), headers: FETCH_HEADERS });
  if (!r.ok) throw new Error(`LibriVox list failed: ${r.status}`);
  const data = (await r.json()) as { books?: any[] };
  const rows = data.books ?? [];
  return rows
    .filter((b) => !librivoxIsReligious(b))
    .map((b) => ({
      source: "librivox" as const,
      externalId: String(b.id),
      bookKey: `librivox:${b.id}`,
      title: b.title || "Untitled",
      author: librivoxAuthorName(b),
      language: (b.language || "English").toLowerCase(),
      coverUrl: librivoxCover(b),
      totalDuration: parsePlaytime(b.totaltime) || Number(b.totaltimesecs) || null,
      chapterCount: 0, // not returned in the basic feed
      genres: (b.genres || []).map((g: any) => g.name).filter(Boolean),
    }));
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

// ── Internet Archive: literature-only Arabic search ─────────────────

const IA_POSITIVE = '(subject:(novel) OR subject:(fiction) OR subject:(novels) OR subject:("short story") OR subject:("short stories") OR subject:(literature) OR subject:(poetry) OR subject:(poem) OR subject:("رواية") OR subject:("قصة") OR subject:("قصص") OR subject:("أدب") OR subject:("شعر"))';
const IA_NEGATIVE = [
  "quran", "qoran", "koran", "قرآن", "القرآن",
  "islam", "islamic", "إسلام", "إسلامي",
  "hadith", "حديث", "sunnah", "سنة",
  "sermon", "khutba", "خطبة",
  "lecture", "محاضرة", "درس", "دعاء",
  "religion", "religious", "دين", "ديني",
  "tafsir", "تفسير", "fiqh", "فقه",
  "prayer", "صلاة",
]
  .map((t) => `-subject:(${t.includes("؀") ? `"${t}"` : t})`)
  .join(" AND ");
const IA_LICENSE = "(licenseurl:(*creativecommons*) OR rights:(publicdomain))";

async function archiveSearch(params: { q: string; limit: number; offset: number; sort: string }): Promise<CommonBook[]> {
  const sortClause =
    params.sort === "title"    ? "&sort[]=titleSorter asc" :
    params.sort === "duration" ? "&sort[]=runtime desc" :
    "&sort[]=publicdate desc";
  const userQuery = params.q ? ` AND (title:(${JSON.stringify(params.q)}) OR creator:(${JSON.stringify(params.q)}))` : "";
  const fullQuery = `mediatype:(audio) AND language:(Arabic) AND ${IA_POSITIVE} AND ${IA_NEGATIVE} AND ${IA_LICENSE}${userQuery}`;
  const page = Math.floor(params.offset / params.limit) + 1;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(fullQuery)}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=runtime&fl[]=downloads&rows=${params.limit}&page=${page}&output=json${sortClause}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(20_000), headers: FETCH_HEADERS });
  if (!r.ok) throw new Error(`IA search failed: ${r.status}`);
  const data = (await r.json()) as { response?: { docs?: any[] } };
  const docs = data.response?.docs ?? [];
  return docs.map((d) => {
    const title = Array.isArray(d.title) ? d.title[0] : (d.title ?? d.identifier);
    const author = Array.isArray(d.creator) ? d.creator.join(", ") : (d.creator ?? "Unknown");
    return {
      source: "archive" as const,
      externalId: d.identifier,
      bookKey: `archive:${d.identifier}`,
      title: title || "Untitled",
      author,
      language: "arabic",
      coverUrl: `https://archive.org/services/img/${d.identifier}`,
      totalDuration: parsePlaytime(d.runtime) || null,
      chapterCount: 0,
      genres: [],
    };
  });
}

async function archiveDetail(externalId: string): Promise<CommonBookDetail | null> {
  const url = `https://archive.org/metadata/${encodeURIComponent(externalId)}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(20_000), headers: FETCH_HEADERS });
  if (!r.ok) return null;
  const meta = (await r.json()) as { metadata?: any; files?: any[] };
  if (!meta.metadata) return null;
  const files = (meta.files || []).filter((f: any) => (f.format ?? "").toLowerCase().includes("mp3"));
  if (files.length === 0) return null;
  const chapters: CommonChapter[] = files.map((f: any, i: number) => ({
    title: f.title || f.name,
    audioUrl: `https://archive.org/download/${encodeURIComponent(externalId)}/${encodeURIComponent(f.name)}`,
    duration: f.length ? parsePlaytime(f.length) : 0,
    sectionNumber: i + 1,
  }));
  const md = meta.metadata;
  const title = Array.isArray(md.title) ? md.title[0] : (md.title ?? externalId);
  const author = Array.isArray(md.creator) ? md.creator.join(", ") : (md.creator ?? "Unknown");
  const description = Array.isArray(md.description) ? md.description.join("\n") : md.description ?? null;
  return {
    source: "archive",
    externalId,
    bookKey: `archive:${externalId}`,
    title,
    author,
    language: "arabic",
    description,
    coverUrl: `https://archive.org/services/img/${externalId}`,
    totalDuration: chapters.reduce((a, c) => a + c.duration, 0),
    chapterCount: chapters.length,
    chapters,
    sourceUrl: `https://archive.org/details/${externalId}`,
    genres: [],
  };
}

// ── Routes ──────────────────────────────────────────────────────────

// GET /api/audiolibrary/browse
//
// Browse + optional search. Hits the upstream API live for the
// requested language.
router.get("/api/audiolibrary/browse", async (req, res) => {
  try {
    const params = z.object({
      lang: z.enum(["english", "arabic"]),
      q: z.string().optional().default(""),
      page: z.coerce.number().min(0).max(200).default(0),
      sort: z.enum(["recent", "title", "duration"]).default("recent"),
    }).parse(req.query);
    const limit = 30;
    const offset = params.page * limit;
    const books =
      params.lang === "english"
        ? await librivoxList({ q: params.q, limit, offset })
        : await archiveSearch({ q: params.q, limit, offset, sort: params.sort });
    res.json({ page: params.page, limit, books });
  } catch (err: any) {
    if (err?.name === "ZodError") { res.status(400).json({ message: "Invalid query" }); return; }
    logRouteError(req, err, "audiolibrary.browse");
    res.status(502).json({ message: "Upstream catalogue unavailable" });
  }
});

// GET /api/audiolibrary/book/:source/:externalId
router.get("/api/audiolibrary/book/:source/:externalId", async (req, res) => {
  try {
    const source = req.params.source;
    const externalId = req.params.externalId;
    if (source !== "librivox" && source !== "archive") {
      res.status(400).json({ message: "Unknown source" }); return;
    }
    const detail = source === "librivox"
      ? await librivoxDetail(externalId)
      : await archiveDetail(externalId);
    if (!detail) { res.status(404).json({ message: "Audiobook not found" }); return; }
    res.json(detail);
  } catch (err) {
    logRouteError(req, err, "audiolibrary.book");
    res.status(502).json({ message: "Upstream catalogue unavailable" });
  }
});

// ── Listening progress (keyed by bookKey now) ──

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

// ── Bookmarks (keyed by bookKey now) ──

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
    if (source !== "librivox" && source !== "archive") { res.status(400).json({ match: null }); return; }
    const detail = source === "librivox" ? await librivoxDetail(externalId) : await archiveDetail(externalId);
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
