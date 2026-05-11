import { createHash } from "node:crypto";
import { db } from "../db";
import { books, gutenbergBooks } from "../../../../lib/db/src/schema";
import { and, eq, ne, or } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Friction-grade duplicate-content detection at book publish time.
 *
 * SHA-256 over normalized text on two surfaces — the title and the
 * first 1,000 words of the body — covers the realistic abuse cases
 * (someone uploading Pride and Prejudice; someone copy-pasting
 * another user's book) without the cost or complexity of an
 * embedding index. Exact matches only — paraphrasing or chapter
 * shuffling will get through, but those aren't the threat model
 * the audit flagged.
 *
 * Honest scope:
 *   - HASH MATCH ≠ COPY. Two writers can independently land on the
 *     same title ("The Letter") and we'd flag both. The handler
 *     surfaces a contestable error rather than auto-rejecting; the
 *     duplicate_check_bypassed flag is the admin escape hatch.
 *   - The normaliser is intentionally aggressive (lowercased,
 *     punctuation-stripped, whitespace-collapsed) so trivial edits
 *     ("the lighthouse" vs "The Lighthouse!") still match.
 *   - We compare titleFingerprint OR openingFingerprint, not AND.
 *     Anchor-text matches on either dimension are suspicious enough
 *     to block at publish time.
 */

const OPENING_WORD_COUNT = 1000;

/**
 * Normalise text for fingerprinting.
 *
 *   - HTML tags stripped (chapter content from the editor is HTML)
 *   - HTML entities decoded
 *   - Unicode-normalised (NFKC) so "café" matches "café"
 *   - lowercased
 *   - punctuation stripped (keep letters, digits, whitespace)
 *   - whitespace collapsed to single spaces, trimmed
 *
 * Returns "" for inputs that contain no fingerprintable content
 * (empty string, whitespace-only, HTML with no text). Callers
 * should treat empty fingerprints as "skip the comparison" rather
 * than as a zero-content match.
 */
export function normaliseForFingerprint(input: string | null | undefined): string {
  if (!input) return "";
  return input
    // Strip HTML tags
    .replace(/<[^>]+>/g, " ")
    // Decode the entities the editor commonly emits
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&[lr]squo;/g, "'")
    .replace(/&[lr]dquo;/g, '"')
    // Unicode normalise + lowercase
    .normalize("NFKC")
    .toLowerCase()
    // Drop everything that isn't letter/digit/whitespace. Catches
    // punctuation, smart quotes, em-dashes, etc.
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf-8").digest("hex");
}

/**
 * Title fingerprint — SHA-256 of the normalised title. Returns null
 * when the title normalises to empty (so the comparator skips it).
 */
export function fingerprintTitle(title: string | null | undefined): string | null {
  const norm = normaliseForFingerprint(title);
  return norm ? sha256Hex(norm) : null;
}

/**
 * Opening fingerprint — SHA-256 of the first OPENING_WORD_COUNT
 * normalised words of the body. Caller passes a single concatenated
 * body string (chapter 1 content for books, articleContent for
 * articles). Returns null on empty input.
 */
export function fingerprintOpening(body: string | null | undefined): string | null {
  const norm = normaliseForFingerprint(body);
  if (!norm) return null;
  const words = norm.split(" ");
  // Cheap upper bound: don't fingerprint super-short openings, they
  // produce false positives across short pieces ("The end." matches
  // "The end."). Need at least ~50 words of substance to compare.
  if (words.length < 50) return null;
  const opening = words.slice(0, OPENING_WORD_COUNT).join(" ");
  return sha256Hex(opening);
}

/**
 * Convenience: compute both fingerprints in one call.
 */
export function fingerprintBookContent(title: string, body: string): {
  titleFingerprint: string | null;
  openingFingerprint: string | null;
} {
  return {
    titleFingerprint: fingerprintTitle(title),
    openingFingerprint: fingerprintOpening(body),
  };
}

export interface DuplicateMatch {
  /** Where the match came from. Drives the user-facing error copy. */
  source: "plotzy" | "gutenberg";
  /** Display title — surfaced to the user in the error message. */
  title: string;
  /** Display author — surfaced to the user. */
  author: string | null;
  /** Which fingerprint dimension matched. */
  matchedOn: "title" | "opening" | "both";
  /** Internal identifier — logged for admin review, NOT exposed in
   *  the user-facing error response. */
  internalId: number;
}

/**
 * Look up duplicate-content matches against published Plotzy books
 * and Gutenberg public-domain works.
 *
 *   - Excludes the candidate's own book row (so unpublishing and
 *     re-publishing your own work doesn't trigger the check).
 *   - Excludes other books owned by the same user (so an author can
 *     publish a sequel that opens with a recap of book 1, etc.).
 *   - Only considers books where the same dimension was actually
 *     fingerprinted — null fingerprints in the catalogue are
 *     ignored (they'll be backfilled lazily on their next publish).
 *
 * Returns the first match found (priority: both > opening > title)
 * or null.
 */
export async function findDuplicateMatch(args: {
  candidateBookId: number;
  candidateUserId: number | null;
  titleFingerprint: string | null;
  openingFingerprint: string | null;
}): Promise<DuplicateMatch | null> {
  const { candidateBookId, candidateUserId, titleFingerprint, openingFingerprint } = args;
  if (!titleFingerprint && !openingFingerprint) return null;

  // ── Plotzy books ──
  // Build the OR over the dimensions that have a candidate
  // fingerprint. Drizzle complains about an empty or() so we collect
  // active terms.
  const dimensionTerms = [];
  if (titleFingerprint) dimensionTerms.push(eq(books.titleFingerprint, titleFingerprint));
  if (openingFingerprint) dimensionTerms.push(eq(books.openingFingerprint, openingFingerprint));

  const plotzyMatches = await db
    .select({
      id: books.id,
      userId: books.userId,
      title: books.title,
      authorName: books.authorName,
      titleFingerprint: books.titleFingerprint,
      openingFingerprint: books.openingFingerprint,
    })
    .from(books)
    .where(
      and(
        eq(books.isPublished, true),
        eq(books.isDeleted, false),
        ne(books.id, candidateBookId),
        or(...dimensionTerms),
      ),
    )
    .limit(5);

  for (const row of plotzyMatches) {
    // Skip rows owned by the same user.
    if (candidateUserId !== null && row.userId === candidateUserId) continue;
    const tHit = !!titleFingerprint && row.titleFingerprint === titleFingerprint;
    const oHit = !!openingFingerprint && row.openingFingerprint === openingFingerprint;
    if (!tHit && !oHit) continue;
    return {
      source: "plotzy",
      title: row.title,
      author: row.authorName,
      matchedOn: tHit && oHit ? "both" : tHit ? "title" : "opening",
      internalId: row.id,
    };
  }

  // ── Gutenberg corpus ──
  // Drizzle conditions are column-bound, so we have to re-build the
  // OR clauses against the gutenbergBooks columns rather than reusing
  // the books-bound ones above.
  const gutDimensionTerms = [];
  if (titleFingerprint) gutDimensionTerms.push(eq(gutenbergBooks.titleFingerprint, titleFingerprint));
  if (openingFingerprint) gutDimensionTerms.push(eq(gutenbergBooks.openingFingerprint, openingFingerprint));

  const gutMatches = await db
    .select({
      id: gutenbergBooks.id,
      title: gutenbergBooks.title,
      authors: gutenbergBooks.authors,
      titleFingerprint: gutenbergBooks.titleFingerprint,
      openingFingerprint: gutenbergBooks.openingFingerprint,
    })
    .from(gutenbergBooks)
    .where(or(...gutDimensionTerms))
    .limit(5);

  for (const row of gutMatches) {
    const tHit = !!titleFingerprint && row.titleFingerprint === titleFingerprint;
    const oHit = !!openingFingerprint && row.openingFingerprint === openingFingerprint;
    if (!tHit && !oHit) continue;
    const author = Array.isArray(row.authors) && row.authors.length > 0 ? (row.authors[0] as any).name : null;
    return {
      source: "gutenberg",
      title: row.title,
      author,
      matchedOn: tHit && oHit ? "both" : tHit ? "title" : "opening",
      internalId: row.id,
    };
  }

  return null;
}

/**
 * Build the user-facing duplicate error message.
 *
 * We deliberately reveal the matched book's title + author (so the
 * accused writer can recognise whether it's a real conflict) but
 * NOT the internal ID, owner, URL, or other navigation breadcrumbs
 * — preserving the matched author's privacy and avoiding turning
 * the error into a discovery surface.
 */
export function buildDuplicateMessage(match: DuplicateMatch): string {
  const author = match.author ? ` by ${match.author}` : "";
  const what =
    match.source === "gutenberg"
      ? `the public-domain work "${match.title}"${author}`
      : `an existing work on Plotzy: "${match.title}"${author}`;
  return (
    `This content appears similar to ${what}. ` +
    `If this is your original work, please contact support@plotzy.co.`
  );
}

/**
 * Best-effort populate fingerprints on a book row. Idempotent —
 * existing fingerprints are recomputed (cheap, hashes are
 * deterministic), so this also serves as the backfill primitive
 * for older rows.
 */
export async function persistBookFingerprints(args: {
  bookId: number;
  title: string;
  body: string;
}): Promise<void> {
  try {
    const fp = fingerprintBookContent(args.title, args.body);
    await db
      .update(books)
      .set({
        titleFingerprint: fp.titleFingerprint,
        openingFingerprint: fp.openingFingerprint,
      })
      .where(eq(books.id, args.bookId));
  } catch (err) {
    // Non-fatal — we'd rather let the publish through than block on
    // a fingerprint write failure. The next publish attempt will
    // retry the persist.
    logger.warn({ err, bookId: args.bookId }, "Failed to persist book fingerprints");
  }
}
