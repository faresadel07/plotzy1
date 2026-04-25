import { Router } from "express";
import { db } from "../db";
import { eq, and, asc, desc, sql, isNotNull, isNull } from "drizzle-orm";
import { gutenbergBooks } from "../../../../lib/db/src/schema";

import { logger } from "../lib/logger";

const router = Router();

// ── Gutenberg Public-Domain Library ──────────────────────────────────────────

const GUTENBERG_CATALOG_URL = "https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv";
const GUTENBERG_TEXT_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const OPEN_LIBRARY = "https://openlibrary.org";
/** Minimum rows to consider the catalog synced */
const CATALOG_MIN_BOOKS = 1000;
/** How many of the most-classic English books we keep permanently cached so
 *  the discover page never goes empty even when gutenberg.org is unreachable. */
const PRECACHE_TARGET = 200;
/** Polite delay between gutenberg.org fetches during the precache job. */
const PRECACHE_DELAY_MS = 2000;

let catalogSyncRunning = false;
let precacheRunning = false;

/** Parse one CSV row, handling quoted fields correctly */
function parseCSVRow(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      cols.push(cur); cur = "";
    } else {
      cur += c;
    }
  }
  cols.push(cur);
  return cols;
}

/** Parse "Last, First, YYYY-YYYY; Author2" into structured array */
function parseGutAuthors(raw: string): { name: string; birth_year?: number; death_year?: number }[] {
  if (!raw.trim()) return [];
  return raw.split(";").flatMap(a => {
    const s = a.trim();
    if (!s) return [];
    const ym = s.match(/,\s*(\d{3,4})\s*-\s*(\d{3,4})?\s*$/);
    if (ym) {
      return [{ name: s.slice(0, ym.index!).trim(), birth_year: parseInt(ym[1]), death_year: ym[2] ? parseInt(ym[2]) : undefined }];
    }
    return [{ name: s }];
  });
}

/** Download and import the full Gutenberg catalog CSV into the DB */
export async function syncGutenbergCatalog(): Promise<void> {
  if (catalogSyncRunning) return;
  catalogSyncRunning = true;
  try {
    // Skip if already synced
    const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(gutenbergBooks);
    if ((row?.n ?? 0) >= CATALOG_MIN_BOOKS) {
      logger.debug({ count: row?.n }, "Gutenberg catalog already synced — skipping");
      return;
    }

    logger.info("Downloading Gutenberg catalog CSV (~21 MB)…");
    const resp = await fetch(GUTENBERG_CATALOG_URL, { signal: AbortSignal.timeout(90_000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    const lines = text.split("\n");
    logger.info({ lines: lines.length }, "Parsing Gutenberg catalog lines");

    const BATCH = 300;
    const batch: any[] = [];
    let imported = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = parseCSVRow(line);
      if (cols.length < 9) continue;
      const [gutIdStr, type, , title, langStr, authorsStr, subjectsStr, , bookshelvesStr] = cols;
      if (type.trim() !== "Text") continue;
      const gutId = parseInt(gutIdStr.trim());
      if (!gutId || gutId <= 0) continue;

      const languages = langStr.trim().split(";").map(l => l.trim()).filter(Boolean);
      const authors = parseGutAuthors(authorsStr);
      const subjects = subjectsStr.trim().split(";").map(s => s.trim()).filter(Boolean);
      const bookshelves = bookshelvesStr.trim().split(";").map(s => s.trim()).filter(Boolean);

      batch.push({
        gutenbergId: gutId,
        title: title.trim() || "Unknown",
        authors,
        subjects,
        bookshelves,
        languages,
        coverUrl: `https://www.gutenberg.org/cache/epub/${gutId}/pg${gutId}.cover.medium.jpg`,
        textUrl: `https://www.gutenberg.org/cache/epub/${gutId}/pg${gutId}.txt`,
        downloadCount: 0,
      });

      if (batch.length >= BATCH) {
        await db.insert(gutenbergBooks).values(batch)
          .onConflictDoUpdate({
            target: gutenbergBooks.gutenbergId,
            set: {
              title: sql`excluded.title`,
              authors: sql`excluded.authors`,
              subjects: sql`excluded.subjects`,
              bookshelves: sql`excluded.bookshelves`,
              languages: sql`excluded.languages`,
              coverUrl: sql`excluded.cover_url`,
            },
          });
        imported += batch.length;
        batch.length = 0;
        if (imported % 3000 === 0) logger.info({ imported }, "Gutenberg catalog import progress");
      }
    }

    if (batch.length > 0) {
      await db.insert(gutenbergBooks).values(batch)
        .onConflictDoUpdate({
          target: gutenbergBooks.gutenbergId,
          set: {
            title: sql`excluded.title`,
            authors: sql`excluded.authors`,
            subjects: sql`excluded.subjects`,
            bookshelves: sql`excluded.bookshelves`,
            languages: sql`excluded.languages`,
            coverUrl: sql`excluded.cover_url`,
          },
        });
      imported += batch.length;
    }

    logger.info({ imported }, "Gutenberg catalog sync complete");
  } catch (err) {
    logger.error({ err }, "Gutenberg catalog sync failed");
  } finally {
    catalogSyncRunning = false;
  }
}

/** Build Gutenberg text URL candidates for a given numeric gutenberg ID */
function gutenbergTextUrls(id: number): string[] {
  return [
    `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
    `https://www.gutenberg.org/files/${id}/${id}-0.txt`,
    `https://www.gutenberg.org/files/${id}/${id}.txt`,
  ];
}

/** Strip Project Gutenberg's standard header/footer markers from a raw .txt
 *  download so what we store is the actual book body. The markers are stable
 *  across all Gutenberg releases since 2005. */
function stripGutenbergMarkers(rawText: string): string {
  const startMarker = /\*\*\* START OF (THE|THIS) PROJECT GUTENBERG/i;
  const endMarker = /\*\*\* END OF (THE|THIS) PROJECT GUTENBERG/i;
  let content = rawText;
  const startMatch = rawText.search(startMarker);
  if (startMatch !== -1) {
    const afterStart = rawText.indexOf("\n", startMatch) + 1;
    content = rawText.slice(afterStart);
  }
  const endMatch = content.search(endMarker);
  if (endMatch !== -1) {
    content = content.slice(0, endMatch).trim();
  }
  return content;
}

/** Try every known URL pattern Gutenberg uses for plain-text books and return
 *  the first one that works, plus the cleaned content. Returns null when no
 *  variant is reachable — caller treats that as "this book has no plain-text
 *  version available". `preferredUrl` is tried first when supplied. */
async function fetchAndCleanGutenbergText(
  gutId: number,
  preferredUrl?: string | null,
): Promise<{ content: string; textUrl: string } | null> {
  const candidates = gutenbergTextUrls(gutId);
  if (preferredUrl && !candidates.includes(preferredUrl)) candidates.unshift(preferredUrl);
  for (const url of candidates) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!r.ok) continue;
      const rawText = await r.text();
      return { content: stripGutenbergMarkers(rawText), textUrl: url };
    } catch { /* try next candidate */ }
  }
  return null;
}

/** Pre-cache the full text of the top N most-classic English books so the
 *  discover page is reliable even when gutenberg.org is slow or unreachable.
 *
 *  Selection strategy: English books that appear in at least one curated
 *  bookshelf (a strong signal that Gutenberg's editors flagged them as
 *  noteworthy), ordered by gutenbergId ASC because lower IDs are older
 *  uploads which skew toward famous classics (Pride and Prejudice = 1342,
 *  Frankenstein = 84, Alice in Wonderland = 11). Skips books we've already
 *  cached or already marked broken (textUrl IS NULL).
 *
 *  Idempotent — re-runs are no-ops once the target is met. Polite to
 *  gutenberg.org via a 2-second delay between fetches.
 */
export async function precacheTopBooks(target = PRECACHE_TARGET): Promise<void> {
  if (precacheRunning) return;
  precacheRunning = true;
  try {
    const [{ alreadyCached }] = await db
      .select({ alreadyCached: sql<number>`count(*)::int` })
      .from(gutenbergBooks)
      .where(isNotNull(gutenbergBooks.content));
    if ((alreadyCached ?? 0) >= target) {
      logger.info({ alreadyCached }, "Gutenberg precache already at target — skipping");
      return;
    }
    const remaining = target - (alreadyCached ?? 0);

    const candidates = await db
      .select({ gutenbergId: gutenbergBooks.gutenbergId, textUrl: gutenbergBooks.textUrl })
      .from(gutenbergBooks)
      .where(and(
        isNull(gutenbergBooks.content),
        isNotNull(gutenbergBooks.textUrl),
        sql`${gutenbergBooks.languages}::text like ${`%"en"%`}`,
        sql`jsonb_array_length(${gutenbergBooks.bookshelves}) > 0`,
      ))
      .orderBy(asc(gutenbergBooks.gutenbergId))
      .limit(remaining);

    logger.info({ count: candidates.length, remaining }, "Gutenberg precache starting");

    let succeeded = 0;
    let failed = 0;
    for (const book of candidates) {
      try {
        const result = await fetchAndCleanGutenbergText(book.gutenbergId, book.textUrl);
        if (result) {
          await db.update(gutenbergBooks)
            .set({ content: result.content, contentCachedAt: new Date(), textUrl: result.textUrl })
            .where(eq(gutenbergBooks.gutenbergId, book.gutenbergId));
          succeeded++;
        } else {
          // No plain-text version — mark broken so it disappears from discover.
          await db.update(gutenbergBooks)
            .set({ textUrl: null })
            .where(eq(gutenbergBooks.gutenbergId, book.gutenbergId));
          failed++;
        }
      } catch (err) {
        logger.warn({ err, gutId: book.gutenbergId }, "Gutenberg precache fetch error");
      }
      await new Promise(r => setTimeout(r, PRECACHE_DELAY_MS));
    }

    logger.info({ succeeded, failed }, "Gutenberg precache complete");
  } catch (err) {
    logger.error({ err }, "Gutenberg precache failed");
  } finally {
    precacheRunning = false;
  }
}

/** Upsert Open Library metadata into gutenbergBooks table */
async function upsertOLMeta(olDoc: any, gutId: number) {
  const title = olDoc.title || "Unknown";
  const authors = (olDoc.author_name || []).map((n: string) => ({ name: n }));
  const subjects = olDoc.subject || [];
  const languages = olDoc.language || [];
  const coverUrl = olDoc.cover_i
    ? `https://covers.openlibrary.org/b/id/${olDoc.cover_i}-M.jpg`
    : `https://www.gutenberg.org/cache/epub/${gutId}/pg${gutId}.cover.medium.jpg`;

  const [row] = await db
    .insert(gutenbergBooks)
    .values({
      gutenbergId: gutId,
      title,
      authors,
      subjects,
      languages,
      coverUrl,
      textUrl: `https://www.gutenberg.org/cache/epub/${gutId}/pg${gutId}.txt`,
      downloadCount: 0,
    })
    .onConflictDoUpdate({
      target: gutenbergBooks.gutenbergId,
      set: { title, authors, subjects, languages, coverUrl },
    })
    .returning();
  return row;
}

// GET /api/gutenberg/books?search=&topic=&page=&lang=sort=
router.get("/api/gutenberg/books", async (req: any, res: any) => {
  try {
    const { search = "", topic = "", page = "1", lang = "en", sort = "" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limit = 32;
    const offset = (pageNum - 1) * limit;

    // Check if catalog has been synced into DB
    const [countRow] = await db.select({ n: sql<number>`count(*)::int` }).from(gutenbergBooks);
    const totalInDB = countRow?.n ?? 0;

    if (totalInDB < CATALOG_MIN_BOOKS) {
      // Catalog not yet loaded — trigger background sync and return empty with a hint
      if (!catalogSyncRunning) syncGutenbergCatalog().catch((err) => logger.error({ err }, "Background catalog sync failed"));
      return res.json({ count: 0, next: null, previous: null, results: [], syncing: true });
    }

    // Build WHERE conditions from DB. Always exclude books we've previously
    // confirmed broken — the content endpoint sets textUrl=NULL the first
    // time it can't fetch a plain-text version, so this single filter keeps
    // the discover grid free of dead tiles for the rest of time.
    const conditions: any[] = [isNotNull(gutenbergBooks.textUrl)];
    if (search) {
      const q = `%${search.toLowerCase()}%`;
      conditions.push(sql`(lower(${gutenbergBooks.title}) like ${q} OR lower(${gutenbergBooks.authors}::text) like ${q})`);
    }
    if (topic) {
      const t = `%${topic.toLowerCase()}%`;
      conditions.push(sql`(lower(${gutenbergBooks.subjects}::text) like ${t} OR lower(${gutenbergBooks.bookshelves}::text) like ${t})`);
    }
    if (lang) {
      conditions.push(sql`${gutenbergBooks.languages}::text like ${`%"${lang}"%`}`);
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(gutenbergBooks).where(where);
    const orderBy = sort === "ascending" ? asc(gutenbergBooks.createdAt) : desc(gutenbergBooks.downloadCount);
    const rows = await db.select().from(gutenbergBooks).where(where).orderBy(orderBy).limit(limit).offset(offset);

    const results = rows.map(b => ({
      id: b.gutenbergId,
      title: b.title,
      authors: b.authors || [],
      subjects: b.subjects || [],
      languages: b.languages || [],
      coverUrl: b.coverUrl,
      downloadCount: b.downloadCount || 0,
      hasText: true,
    }));

    res.json({
      count: total,
      next: total > pageNum * limit ? `page=${pageNum + 1}` : null,
      previous: pageNum > 1 ? `page=${pageNum - 1}` : null,
      results,
    });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to fetch books" });
  }
});

// GET /api/gutenberg/sync-status — catalog import progress
router.get("/api/gutenberg/sync-status", async (_req: any, res: any) => {
  try {
    const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(gutenbergBooks);
    res.json({ synced: (row?.n ?? 0) >= CATALOG_MIN_BOOKS, count: row?.n ?? 0, running: catalogSyncRunning });
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// GET /api/gutenberg/books/:id — metadata only
router.get("/api/gutenberg/books/:id", async (req: any, res: any) => {
  try {
    const gutId = parseInt(req.params.id);
    if (!gutId) return res.status(400).json({ error: "Invalid id" });

    const cached = await db.select().from(gutenbergBooks).where(eq(gutenbergBooks.gutenbergId, gutId)).limit(1);
    if (cached.length > 0) {
      const b = cached[0];
      return res.json({
        id: b.gutenbergId,
        dbId: b.id,
        title: b.title,
        authors: b.authors || [],
        subjects: b.subjects || [],
        bookshelves: b.bookshelves || [],
        languages: b.languages || [],
        coverUrl: b.coverUrl,
        downloadCount: b.downloadCount || 0,
        hasContent: !!b.content,
        contentCachedAt: b.contentCachedAt,
      });
    }

    // Fetch from Open Library by searching for the Gutenberg ID
    const resp = await fetch(`${OPEN_LIBRARY}/search.json?q=${gutId}&fields=key,title,author_name,cover_i,subject,language,edition_count,id_project_gutenberg&limit=5`);
    if (!resp.ok) return res.status(404).json({ error: "Book not found" });
    const data = await resp.json() as any;
    const olDoc = (data.docs || []).find((d: any) =>
      (d.id_project_gutenberg || []).includes(String(gutId))
    ) || data.docs?.[0];
    if (!olDoc) return res.status(404).json({ error: "Book not found" });
    const row = await upsertOLMeta(olDoc, gutId);
    return res.json({
      id: row.gutenbergId,
      dbId: row.id,
      title: row.title,
      authors: row.authors || [],
      subjects: row.subjects || [],
      bookshelves: row.bookshelves || [],
      languages: row.languages || [],
      coverUrl: row.coverUrl,
      downloadCount: row.downloadCount || 0,
      hasContent: !!row.content,
      contentCachedAt: row.contentCachedAt,
    });
  } catch {
    return res.status(502).json({ error: "Failed to fetch book metadata" });
  }
});

// GET /api/gutenberg/books/:id/content — full text (cached in DB)
router.get("/api/gutenberg/books/:id/content", async (req: any, res: any) => {
  try {
    const gutId = parseInt(req.params.id);
    if (!gutId) return res.status(400).json({ error: "Invalid id" });

    const cached = await db.select().from(gutenbergBooks).where(eq(gutenbergBooks.gutenbergId, gutId)).limit(1);
    const row = cached[0];

    if (row?.content && row.contentCachedAt) {
      const age = Date.now() - new Date(row.contentCachedAt).getTime();
      if (age < GUTENBERG_TEXT_CACHE_TTL_MS) {
        return res.json({ content: row.content, fromCache: true, cachedAt: row.contentCachedAt });
      }
    }

    const result = await fetchAndCleanGutenbergText(gutId, row?.textUrl);
    if (!result) {
      // No working URL — mark the row broken so the discover query hides it.
      if (row) {
        await db.update(gutenbergBooks)
          .set({ textUrl: null })
          .where(eq(gutenbergBooks.gutenbergId, gutId))
          .catch((err) => logger.error({ err }, "Gutenberg DB update failed"));
      }
      return res.status(404).json({ error: "No plain-text version available for this book" });
    }

    const { content, textUrl } = result;
    if (row) {
      await db.update(gutenbergBooks)
        .set({ content, contentCachedAt: new Date(), textUrl })
        .where(eq(gutenbergBooks.gutenbergId, gutId));
    } else {
      await db.insert(gutenbergBooks).values({
        gutenbergId: gutId,
        title: "Unknown",
        textUrl,
        content,
        contentCachedAt: new Date(),
      }).onConflictDoUpdate({
        target: gutenbergBooks.gutenbergId,
        set: { content, contentCachedAt: new Date(), textUrl },
      });
    }

    return res.json({ content, fromCache: false, cachedAt: new Date() });
  } catch (err: any) {
    return res.status(502).json({ message: "Failed to retrieve book text" });
  }
});

export default router;
