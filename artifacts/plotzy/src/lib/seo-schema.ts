/**
 * Pure JSON-LD schema builders.
 *
 * Each builder returns a plain object compatible with schema.org's
 * JSON-LD format. The `<JsonLd>` component serializes whatever object
 * is passed in via JSON.stringify, so anything returned from these
 * builders just works as long as the shape matches the schema.
 *
 * No React imports here — these are pure functions so they can be
 * unit-tested, composed into other schemas, and serialized identically
 * server-side or client-side without any runtime dependency on a
 * component tree.
 *
 * Site identity (name, url, logo, description) lives here as the
 * single source of truth so future schemas (Article, Book, Person)
 * can reference the same Organization without duplicating fields.
 */

export const SITE_NAME = "Plotzy";
export const SITE_URL = "https://plotzy.com";
const SITE_LOGO = `${SITE_URL}/plotzy-logo.png`;
const DEFAULT_OG_IMAGE = "/opengraph.jpg";
const SITE_DESCRIPTION =
  "Plotzy is a complete platform for writers — write, design covers, publish, and produce audiobooks with AI assistance.";

/**
 * Resolve any image URL to an absolute https://plotzy.com URL.
 *
 * Used by both the <SEO> component (for og:image) and JSON-LD schema
 * builders (for image, logo, sameAs URLs). Schema validators accept
 * relative paths in some contexts but reject them in og:image, so the
 * helper picks the safer rule: always absolute.
 *
 * Behavior:
 *   - already absolute (http:// or https://) → unchanged
 *   - protocol-relative (//cdn.example.com/x) → prepend "https:"
 *   - site-root path (/uploads/abc.jpg) → prepend SITE_URL
 *   - undefined or unrecognized → falls back to default OG image
 *     (callers that want NO image should drop the field entirely
 *     rather than passing it in)
 */
export function absolutizeImage(value: string | null | undefined): string {
  if (!value) return `${SITE_URL}${DEFAULT_OG_IMAGE}`;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `${SITE_URL}${value}`;
  return `${SITE_URL}${DEFAULT_OG_IMAGE}`;
}

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: SITE_LOGO,
    description: SITE_DESCRIPTION,
  };
}

export function buildWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
  };
}

/**
 * Cap a string at `max` chars, cutting on a word boundary when one is
 * within ~80 chars of the end (so the trimmed text is still meaningful)
 * and appending an ellipsis. Strings already under the cap pass through
 * untouched.
 *
 * Used for JSON-LD `description` fields where Google recommends ≤5000
 * chars but we want a tighter ~500-char surface so the rendered HTML
 * stays lean and the description is more snippet-like.
 */
function truncateAtWord(input: string, max: number): string {
  const s = input.trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  // Only trim back to a word boundary if it's reasonably close to the
  // cap; otherwise fall back to a hard cut so we don't lose too much.
  const trimmed = lastSpace > max - 80 ? cut.slice(0, lastSpace) : cut;
  return `${trimmed.trimEnd()}…`;
}

/**
 * Try to parse a value into an ISO 8601 string suitable for
 * `datePublished` and similar schema fields.
 *
 * Returns `undefined` (not null) so the caller can spread the result
 * into the schema object — schema validators reject malformed dates,
 * so we'd rather omit the field entirely than emit garbage.
 */
function safeIso(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

const BOOK_SUMMARY_CAP = 500;

export interface BookSchemaInput {
  id: number;
  title: string;
  summary: string | null;
  authorName: string | null;
  userId: number | null;
  coverImage: string | null;
  publishedAt: string | null;
  language: string | null;
}

export interface BookRatingInput {
  avg: number;
  count: number;
}

/**
 * Book JSON-LD for a single published book on /read/:id.
 *
 * Conditional fields are omitted (not nulled) so the rendered JSON-LD
 * is minimal and validators don't trip on null values:
 *   - description: omitted if summary is null/empty; capped at 500 chars
 *   - image: omitted if coverImage is null (no fallback to /opengraph.jpg
 *     because that misrepresents the book to crawlers)
 *   - datePublished: omitted if publishedAt is null or unparseable
 *   - inLanguage: omitted if language is null
 *   - author.url: omitted if userId is null (legacy/anonymous books)
 *   - aggregateRating: omitted unless rating.count > 0 — Google's Rich
 *     Results Test rejects aggregateRating blocks with zero ratings.
 *
 * isbn and offers are intentionally not emitted: most user books have no
 * ISBN, and books are free to read on Plotzy so an offers block adds
 * noise without information.
 */
export function buildBookSchema(
  book: BookSchemaInput,
  rating?: BookRatingInput,
): Record<string, unknown> {
  const author: Record<string, unknown> = {
    "@type": "Person",
    name: book.authorName || "Anonymous",
  };
  if (book.userId != null) {
    author.url = `${SITE_URL}/authors/${book.userId}`;
  }

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title,
    url: `${SITE_URL}/read/${book.id}`,
    author,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  if (book.summary && book.summary.trim()) {
    schema.description = truncateAtWord(book.summary, BOOK_SUMMARY_CAP);
  }

  if (book.coverImage) {
    schema.image = absolutizeImage(book.coverImage);
  }

  const datePublished = safeIso(book.publishedAt);
  if (datePublished) schema.datePublished = datePublished;

  if (book.language) schema.inLanguage = book.language;

  if (rating && rating.count > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating.avg.toFixed(1),
      ratingCount: rating.count,
      bestRating: "5",
      worstRating: "1",
    };
  }

  return schema;
}
