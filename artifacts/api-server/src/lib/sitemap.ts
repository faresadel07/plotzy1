// Dynamic sitemap.xml generator.
//
// Replaces the previous hand-coded artifacts/plotzy/public/sitemap.xml,
// which only listed 12 static URLs and left every dynamic surface
// (published books, articles, author profiles) invisible to search
// engines.
//
// Strategy:
//   - Static surfaces: declared inline at the top (home, library,
//     pricing, etc.). Same set the previous static file shipped.
//   - Dynamic surfaces: queried from the DB at request time.
//     Filtered to published, non-deleted rows only.
//   - Output cached in-process for 1 hour to avoid hammering the DB
//     on every crawler hit. Single in-memory cache is fine for a
//     single-instance deploy; if we ever scale horizontally and a
//     tighter SLA is needed, hoist this to Redis.
//
// Spec note: at launch scale (low hundreds of books at most) this
// fits comfortably under the 50,000-URL / 50 MB single-sitemap cap
// google enforces. If we ever exceed that we'll need a sitemap
// index file (sitemap-index.xml pointing at sitemap-001.xml,
// sitemap-002.xml, etc.). Easy follow-up; not needed today.

import { db } from "../db";
import { books, users } from "../../../../lib/db/src/schema";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { logger } from "./logger";

const SITE_URL = "https://plotzy.co";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface SitemapEntry {
  loc: string;
  lastmod?: string; // ISO date (YYYY-MM-DD is fine for sitemaps)
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number; // 0.0 – 1.0
}

// Static URLs — same set the previous hand-coded sitemap shipped,
// plus a few that were obviously missing (/course, /faq stay).
// Auth-required surfaces (/dashboard, /messages, etc.) are
// intentionally absent: they're disallowed in robots.txt and have
// noindex meta tags, so listing them in the sitemap would just
// confuse crawlers.
const STATIC_ENTRIES: SitemapEntry[] = [
  { loc: `${SITE_URL}/`, priority: 1.0, changefreq: "daily" },
  { loc: `${SITE_URL}/library`, priority: 0.9, changefreq: "daily" },
  { loc: `${SITE_URL}/discover`, priority: 0.8, changefreq: "daily" },
  { loc: `${SITE_URL}/pricing`, priority: 0.8, changefreq: "monthly" },
  { loc: `${SITE_URL}/writing-guide`, priority: 0.7, changefreq: "monthly" },
  { loc: `${SITE_URL}/faq`, priority: 0.7, changefreq: "monthly" },
  { loc: `${SITE_URL}/tutorial`, priority: 0.6, changefreq: "monthly" },
  { loc: `${SITE_URL}/marketplace`, priority: 0.6, changefreq: "weekly" },
  { loc: `${SITE_URL}/blog`, priority: 0.6, changefreq: "weekly" },
  { loc: `${SITE_URL}/course`, priority: 0.8, changefreq: "monthly" },
  { loc: `${SITE_URL}/privacy`, priority: 0.3, changefreq: "yearly" },
  { loc: `${SITE_URL}/terms`, priority: 0.3, changefreq: "yearly" },
];

// Sitemap protocol XML-escape rules: only these five characters MUST
// be escaped in <loc>. URLs from our own routes never contain them
// (we use integer ids, no query strings, no fragments) but the helper
// is here as belt-and-suspenders for any future slug-bearing route.
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/'/g, "&apos;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isoDate(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined;
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return undefined;
  // Sitemap accepts ISO 8601; date-only form keeps the file compact.
  return date.toISOString().slice(0, 10);
}

function entryToXml(e: SitemapEntry): string {
  const parts = [`<loc>${xmlEscape(e.loc)}</loc>`];
  if (e.lastmod) parts.push(`<lastmod>${e.lastmod}</lastmod>`);
  if (e.changefreq) parts.push(`<changefreq>${e.changefreq}</changefreq>`);
  if (typeof e.priority === "number") parts.push(`<priority>${e.priority.toFixed(1)}</priority>`);
  return `  <url>${parts.join("")}</url>`;
}

async function buildEntries(): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = [...STATIC_ENTRIES];

  // ── Published books and articles ─────────────────────────────────
  // The books table holds both books (contentType="book", URL /read/:id)
  // and articles (contentType="article", URL /blog/:id). Filter to
  // published + non-deleted only; pull the row's createdAt as a
  // lastmod fallback (publishedAt may be null on legacy rows).
  try {
    const pubRows = await db
      .select({
        id: books.id,
        contentType: books.contentType,
        publishedAt: books.publishedAt,
        createdAt: books.createdAt,
        userId: books.userId,
      })
      .from(books)
      .where(and(eq(books.isPublished, true), eq(books.isDeleted, false)));

    for (const row of pubRows) {
      const isArticle = row.contentType === "article";
      const path = isArticle ? `/blog/${row.id}` : `/read/${row.id}`;
      entries.push({
        loc: `${SITE_URL}${path}`,
        lastmod: isoDate(row.publishedAt) ?? isoDate(row.createdAt),
        changefreq: isArticle ? "weekly" : "monthly",
        priority: isArticle ? 0.6 : 0.7,
      });
    }

    // ── Author profile pages ─────────────────────────────────────
    // Include /authors/:userId for every user who has at least one
    // published, non-deleted book or article. Don't list authors
    // who only have private drafts — their profile page exists but
    // has nothing public to show, so indexing it wastes crawl budget.
    const authorRows = await db
      .selectDistinct({ userId: books.userId })
      .from(books)
      .where(and(eq(books.isPublished, true), eq(books.isDeleted, false), isNotNull(books.userId)));

    const authorIds = authorRows
      .map((r) => r.userId)
      .filter((id): id is number => id !== null);

    if (authorIds.length > 0) {
      const authorProfiles = await db
        .select({ id: users.id, displayName: users.displayName })
        .from(users)
        .where(inArray(users.id, authorIds));
      for (const a of authorProfiles) {
        // Skip profiles with no display name set — they'd render as
        // an unnamed author page which is poor SEO. Once they finish
        // their profile they'll appear on the next cache refresh.
        if (!a.displayName) continue;
        entries.push({
          loc: `${SITE_URL}/authors/${a.id}`,
          changefreq: "weekly",
          priority: 0.5,
        });
      }
    }
  } catch (err) {
    // The sitemap is a SEO surface, not a request the user is waiting
    // on. If the DB query fails we still want to serve SOMETHING
    // (the static set) rather than 500ing back to crawlers, who treat
    // a 5xx as a temporary outage and re-crawl, but treat repeated
    // 5xxs as a signal to drop cached entries entirely. A static-only
    // sitemap keeps the canonical surfaces indexable while the DB
    // recovers.
    logger.error({ err }, "Sitemap dynamic-entries query failed; falling back to static set");
  }

  return entries;
}

function entriesToXml(entries: SitemapEntry[]): string {
  const body = entries.map(entryToXml).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

interface CachedSitemap {
  xml: string;
  builtAt: number;
}
let cache: CachedSitemap | null = null;

export async function generateSitemap(): Promise<string> {
  const now = Date.now();
  if (cache && now - cache.builtAt < CACHE_TTL_MS) {
    return cache.xml;
  }
  const entries = await buildEntries();
  const xml = entriesToXml(entries);
  cache = { xml, builtAt: now };
  return xml;
}

/** For tests / admin tooling — clears the cached sitemap. */
export function clearSitemapCache(): void {
  cache = null;
}
