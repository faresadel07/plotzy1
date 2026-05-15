import { Router } from "express";
import { db } from "../db";
import { eq, and, asc, sql } from "drizzle-orm";
import { hindawiBooks } from "../../../../lib/db/src/schema";

import { logger } from "../lib/logger";

import { logRouteError } from "../lib/log-route-error";
const router = Router();

// ── Hindawi Public-Domain Arabic Library ─────────────────────────────────────
//
// Arabic counterpart to the Gutenberg integration. hindawi.org fingerprint-
// blocks datacenter HTTP clients (every book download 403s from the server
// even though a browser/curl succeeds), so we never fetch it directly.
// Instead both catalog metadata and the clean reading text come from the
// openly licensed "The Arabic E-Book Corpus" mirror on Hugging Face — its
// `booknr` column is exactly the Hindawi book id, and the `text` column is
// the publisher's own clean digital text (correct logical-order Unicode,
// no PDF glyph mangling). Cover images load from Hindawi's separate,
// unprotected image CDN.

const HF_DATASET = "mohres/The_Arabic_E-Book_Corpus";
const HF_ROWS = "https://datasets-server.huggingface.co/rows";
const HF_FILTER = "https://datasets-server.huggingface.co/filter";
const HF_PAGE = 100;
/** Minimum rows to consider the catalog synced (corpus has ~1745). */
const CATALOG_MIN_BOOKS = 1000;
/** Public-domain text never changes — cache effectively forever. */
const HINDAWI_TEXT_CACHE_TTL_MS = 365 * 24 * 60 * 60 * 1000;
/** How many books we keep permanently cached so the Arabic discover grid
 *  stays reliable without hitting Hugging Face on every read. */
const PRECACHE_TARGET = 150;
/** Polite delay between Hugging Face fetches during the precache job. */
const PRECACHE_DELAY_MS = 1500;

const coverUrlFor = (id: number) =>
  `https://downloads.hindawi.org/covers/304x406/${id}.jpg`;

let catalogSyncRunning = false;
let precacheRunning = false;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** The exact attribution line CC BY 4.0 requires us to display. */
function buildAttribution(author?: string | null, origAuthor?: string | null): string {
  const parts = ["المصدر: مؤسسة هنداوي"];
  if (author) parts.push(`المؤلف: ${author}`);
  if (origAuthor && origAuthor !== author) parts.push(`العمل الأصلي: ${origAuthor}`);
  parts.push("الترخيص: المشاع الإبداعي نَسَب المُصنَّف 4.0 (CC BY 4.0)");
  return parts.join(" • ");
}

/** Split the corpus `category` ("history,philosophy" / "detective.fiction")
 *  into searchable subject tokens. */
function parseSubjects(category?: string | null): string[] {
  if (!category) return [];
  return category
    .split(",")
    .flatMap((c) => c.trim().split("."))
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Fetch JSON from the Hugging Face datasets-server. On a cold index it
 *  returns HTTP 500 "the dataset index is loading, this can take a minute" —
 *  that is transient, so retry with backoff rather than failing the read. */
async function hfJson(
  url: string,
  { retries = 0, timeoutMs = 30_000 }: { retries?: number; timeoutMs?: number } = {},
): Promise<any | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await fetch(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (r.status === 200) return await r.json();
      if (r.status === 500 && attempt < retries) {
        const body = await r.text().catch(() => "");
        if (/loading/i.test(body)) { await sleep(8000); continue; }
      }
      return null;
    } catch {
      if (attempt < retries) { await sleep(4000); continue; }
      return null;
    }
  }
  return null;
}

/** Download the corpus metadata (paginated) and import it into the DB.
 *  Text is intentionally NOT stored here — only the small metadata columns;
 *  the full text is fetched lazily per book on first read. */
export async function syncHindawiCatalog(): Promise<void> {
  if (catalogSyncRunning) return;
  catalogSyncRunning = true;
  try {
    const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(hindawiBooks);
    if ((row?.n ?? 0) >= CATALOG_MIN_BOOKS) {
      logger.debug({ count: row?.n }, "Hindawi catalog already synced — skipping");
      return;
    }

    const first = await hfJson(
      `${HF_ROWS}?dataset=${encodeURIComponent(HF_DATASET)}&config=default&split=train&offset=0&length=${HF_PAGE}`,
      { retries: 3 },
    );
    if (!first) throw new Error("Hugging Face rows endpoint unreachable");
    const total: number = first.num_rows_total ?? 0;
    logger.info({ total }, "Downloading Hindawi corpus catalog");

    let imported = 0;
    for (let offset = 0; offset < total; offset += HF_PAGE) {
      const page =
        offset === 0
          ? first
          : await hfJson(
              `${HF_ROWS}?dataset=${encodeURIComponent(HF_DATASET)}&config=default&split=train&offset=${offset}&length=${HF_PAGE}`,
              { retries: 2 },
            );
      const rows: any[] = page?.rows ?? [];
      if (rows.length === 0) continue;

      const batch = rows
        .map(({ row }) => {
          const id = Number(row.booknr);
          if (!Number.isFinite(id) || id <= 0) return null;
          const author = (row.author || "").trim() || null;
          const origAuthor = (row.origauthor || "").trim() || null;
          return {
            hindawiId: id,
            title: (row.title || "").trim() || "بدون عنوان",
            author,
            origAuthor,
            subjects: parseSubjects(row.category),
            languages: ["ar"],
            coverUrl: coverUrlFor(id),
            attribution: buildAttribution(author, origAuthor),
          };
        })
        .filter(Boolean) as any[];

      if (batch.length > 0) {
        await db
          .insert(hindawiBooks)
          .values(batch)
          .onConflictDoUpdate({
            target: hindawiBooks.hindawiId,
            set: {
              title: sql`excluded.title`,
              author: sql`excluded.author`,
              origAuthor: sql`excluded.orig_author`,
              subjects: sql`excluded.subjects`,
              coverUrl: sql`excluded.cover_url`,
              attribution: sql`excluded.attribution`,
            },
          });
        imported += batch.length;
      }
    }

    logger.info({ imported }, "Hindawi catalog sync complete");
  } catch (err) {
    logger.error({ err }, "Hindawi catalog sync failed");
  } finally {
    catalogSyncRunning = false;
  }
}

/** Fetch one book's full clean text from the corpus by Hindawi id. Returns
 *  null when the corpus has no such book; throws only on transient errors so
 *  the caller can distinguish "missing" from "try again later". */
async function fetchHindawiText(
  id: number,
): Promise<{ content: string; author: string | null; origAuthor: string | null; title: string | null; subjects: string[] } | "missing" | null> {
  const url =
    `${HF_FILTER}?dataset=${encodeURIComponent(HF_DATASET)}` +
    `&config=default&split=train&where=${encodeURIComponent(`"booknr"=${id}`)}&offset=0&length=1`;
  const data = await hfJson(url, { retries: 3 });
  if (!data) return null; // transient (network / cold index exhausted retries)
  const entry = data.rows?.[0];
  if (!entry) return "missing"; // corpus genuinely has no such book
  // Never cache a half book — if the API truncated the text cell, treat it
  // as transient so we retry later instead of serving an incomplete read.
  if ((entry.truncated_cells || []).includes("text")) return null;
  const row = entry.row || {};
  const content = String(row.text || "").trim();
  if (!content) return "missing";
  return {
    content,
    author: (row.author || "").trim() || null,
    origAuthor: (row.origauthor || "").trim() || null,
    title: (row.title || "").trim() || null,
    subjects: parseSubjects(row.category),
  };
}

/** Pre-cache the text of the first N catalog books so the Arabic discover
 *  page stays reliable without hitting Hugging Face on every read.
 *  Idempotent and polite (delay between fetches). */
export async function precacheHindawiTopBooks(target = PRECACHE_TARGET): Promise<void> {
  if (precacheRunning) return;
  precacheRunning = true;
  try {
    const [{ alreadyCached }] = await db
      .select({ alreadyCached: sql<number>`count(*)::int` })
      .from(hindawiBooks)
      .where(sql`${hindawiBooks.content} is not null`);
    if ((alreadyCached ?? 0) >= target) {
      logger.info({ alreadyCached }, "Hindawi precache already at target — skipping");
      return;
    }
    const remaining = target - (alreadyCached ?? 0);

    const candidates = await db
      .select({ hindawiId: hindawiBooks.hindawiId })
      .from(hindawiBooks)
      .where(and(
        sql`${hindawiBooks.content} is null`,
        sql`coalesce(${hindawiBooks.unavailable}, false) = false`,
      ))
      .orderBy(asc(hindawiBooks.id))
      .limit(remaining);

    logger.info({ count: candidates.length, remaining }, "Hindawi precache starting");

    let succeeded = 0;
    let failed = 0;
    for (const book of candidates) {
      try {
        const result = await fetchHindawiText(book.hindawiId);
        if (result && result !== "missing") {
          await db.update(hindawiBooks)
            .set({
              content: result.content,
              contentCachedAt: new Date(),
              author: result.author ?? sql`${hindawiBooks.author}`,
              origAuthor: result.origAuthor ?? sql`${hindawiBooks.origAuthor}`,
              attribution: buildAttribution(result.author, result.origAuthor),
            })
            .where(eq(hindawiBooks.hindawiId, book.hindawiId));
          succeeded++;
        } else if (result === "missing") {
          await db.update(hindawiBooks)
            .set({ unavailable: true })
            .where(eq(hindawiBooks.hindawiId, book.hindawiId));
          failed++;
        }
      } catch (err) {
        logger.warn({ err, hindawiId: book.hindawiId }, "Hindawi precache fetch error");
      }
      await sleep(PRECACHE_DELAY_MS);
    }

    logger.info({ succeeded, failed }, "Hindawi precache complete");
  } catch (err) {
    logger.error({ err }, "Hindawi precache failed");
  } finally {
    precacheRunning = false;
  }
}

// GET /api/hindawi/books?search=&topic=&page=&sort=
router.get("/api/hindawi/books", async (req: any, res: any) => {
  try {
    const { search = "", topic = "", page = "1", sort = "" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limit = 32;
    const offset = (pageNum - 1) * limit;

    const [countRow] = await db.select({ n: sql<number>`count(*)::int` }).from(hindawiBooks);
    const totalInDB = countRow?.n ?? 0;

    if (totalInDB < CATALOG_MIN_BOOKS) {
      if (!catalogSyncRunning) syncHindawiCatalog().catch((err) => logger.error({ err }, "Background Hindawi sync failed"));
      return res.json({ count: 0, next: null, previous: null, results: [], syncing: true });
    }

    const conditions: any[] = [sql`coalesce(${hindawiBooks.unavailable}, false) = false`];
    if (search) {
      const q = `%${search.toLowerCase()}%`;
      conditions.push(sql`(lower(${hindawiBooks.title}) like ${q} OR lower(coalesce(${hindawiBooks.author},'')) like ${q} OR lower(coalesce(${hindawiBooks.origAuthor},'')) like ${q})`);
    }
    if (topic) {
      const t = `%${topic.toLowerCase()}%`;
      conditions.push(sql`lower(${hindawiBooks.subjects}::text) like ${t}`);
    }
    const where = and(...conditions);

    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(hindawiBooks).where(where);
    const rows = await db.select().from(hindawiBooks).where(where).orderBy(asc(hindawiBooks.id)).limit(limit).offset(offset);

    const results = rows.map((b) => ({
      id: b.hindawiId,
      title: b.title,
      authors: b.author ? [{ name: b.author }] : [],
      subjects: b.subjects || [],
      languages: b.languages || ["ar"],
      coverUrl: b.coverUrl,
      downloadCount: 0,
      hasText: true,
    }));

    res.json({
      count: total,
      next: total > pageNum * limit ? `page=${pageNum + 1}` : null,
      previous: pageNum > 1 ? `page=${pageNum - 1}` : null,
      results,
    });
  } catch (err: any) {
    logRouteError(req, err, "hindawi.routes");
    res.status(500).json({ message: "Failed to fetch books" });
  }
});

// GET /api/hindawi/sync-status — catalog import progress
router.get("/api/hindawi/sync-status", async (_req: any, res: any) => {
  try {
    const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(hindawiBooks);
    res.json({ synced: (row?.n ?? 0) >= CATALOG_MIN_BOOKS, count: row?.n ?? 0, running: catalogSyncRunning });
  } catch (err) {
    logRouteError(_req, err, "hindawi.routes");
    res.status(500).json({ message: "Internal error" });
  }
});

// GET /api/hindawi/books/:id — metadata only
router.get("/api/hindawi/books/:id", async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });

    const cached = await db.select().from(hindawiBooks).where(eq(hindawiBooks.hindawiId, id)).limit(1);
    if (cached.length === 0) return res.status(404).json({ error: "Book not found" });
    const b = cached[0];
    return res.json({
      id: b.hindawiId,
      dbId: b.id,
      title: b.title,
      authors: b.author ? [{ name: b.author }] : [],
      origAuthor: b.origAuthor,
      subjects: b.subjects || [],
      languages: b.languages || ["ar"],
      coverUrl: b.coverUrl,
      license: b.license,
      attribution: b.attribution,
      downloadCount: 0,
      hasContent: !!b.content,
      contentCachedAt: b.contentCachedAt,
    });
  } catch (err) {
    logRouteError(req, err, "hindawi.routes");
    return res.status(502).json({ error: "Failed to fetch book metadata" });
  }
});

// GET /api/hindawi/books/:id/content — full clean text (cached in DB)
router.get("/api/hindawi/books/:id/content", async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });

    const cached = await db.select().from(hindawiBooks).where(eq(hindawiBooks.hindawiId, id)).limit(1);
    const row = cached[0];

    if (row?.content && row.contentCachedAt) {
      const age = Date.now() - new Date(row.contentCachedAt).getTime();
      if (age < HINDAWI_TEXT_CACHE_TTL_MS) {
        return res.json({
          content: row.content,
          title: row.title,
          attribution: row.attribution,
          fromCache: true,
          cachedAt: row.contentCachedAt,
        });
      }
    }

    const result = await fetchHindawiText(id);
    if (result === "missing") {
      if (row) {
        await db.update(hindawiBooks)
          .set({ unavailable: true })
          .where(eq(hindawiBooks.hindawiId, id))
          .catch((err) => logger.error({ err }, "Hindawi DB update failed"));
      }
      return res.status(404).json({ error: "This book is not available in the Hindawi corpus" });
    }
    if (!result) {
      // Transient (network / cold index / API truncation) — do NOT mark the
      // book unavailable; let the reader retry.
      return res.status(503).json({ error: "Book text is temporarily unavailable, please try again" });
    }

    const attribution = buildAttribution(result.author, result.origAuthor);
    if (row) {
      await db.update(hindawiBooks)
        .set({
          content: result.content,
          contentCachedAt: new Date(),
          author: result.author ?? row.author,
          origAuthor: result.origAuthor ?? row.origAuthor,
          subjects: result.subjects.length ? result.subjects : row.subjects,
          attribution,
        })
        .where(eq(hindawiBooks.hindawiId, id));
    } else {
      await db.insert(hindawiBooks).values({
        hindawiId: id,
        title: result.title || "بدون عنوان",
        author: result.author,
        origAuthor: result.origAuthor,
        subjects: result.subjects,
        languages: ["ar"],
        coverUrl: coverUrlFor(id),
        content: result.content,
        contentCachedAt: new Date(),
        attribution,
      }).onConflictDoUpdate({
        target: hindawiBooks.hindawiId,
        set: { content: result.content, contentCachedAt: new Date(), attribution },
      });
    }

    return res.json({
      content: result.content,
      title: result.title || row?.title,
      attribution,
      fromCache: false,
      cachedAt: new Date(),
    });
  } catch (err: any) {
    logRouteError(req, err, "hindawi.routes");
    return res.status(502).json({ message: "Failed to retrieve book text" });
  }
});

export default router;
