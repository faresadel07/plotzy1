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

/**
 * Normalise a social handle stored on the user record.
 *
 * Strips an optional leading `@` and trims whitespace. Case is preserved
 * because some platforms render handles case-sensitively (vanity URLs)
 * and lowercasing every entry would change the visible identity.
 *
 * Returns `null` for empty / whitespace-only / null inputs so the caller
 * can decide whether to drop the field entirely.
 */
function normalizeHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^@+/, "").trim();
  return trimmed || null;
}

/**
 * Strict scheme check for a website URL destined for JSON-LD `sameAs`.
 *
 * Unlike the UI-side `safeExternalUrl` helper (which auto-prepends
 * https:// for friendly display), the JSON-LD schema must not silently
 * "fix" a bare-domain input — schema validators reject it, and a
 * misspelled bare domain like "plotzy.con" would otherwise be turned
 * into a live URL pointing at someone else's site.
 *
 * Drops with a DEV-only console.debug breadcrumb so a user reporting
 * "my website doesn't show in search results" has a trace to follow.
 */
function validateWebsiteUrlForSameAs(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug(
        "[seo] Dropping website from Person sameAs: missing http(s) scheme",
        { raw },
      );
    }
    return null;
  }
  // Defensive parse — even with a scheme, malformed values (spaces,
  // control chars) shouldn't reach the schema.
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

const PERSON_BIO_CAP = 500;

export interface PersonSchemaInput {
  id: number;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  website: string | null;
  twitterHandle: string | null;
  instagramHandle: string | null;
}

/**
 * Person JSON-LD for an author profile at /authors/:userId.
 *
 * Schema fields:
 *   name, url — always present (`name` falls back to "Author" when the
 *               user hasn't set a displayName)
 *   image — included only when avatarUrl is truthy. Gradient-initial
 *           avatars are page-rendered, not real images, so we omit
 *           `image` rather than referencing a URL that doesn't exist.
 *   description — bio capped at 500 chars via the same truncateAtWord
 *                 helper used for Book.description.
 *   sameAs — array of absolute URLs. Built from twitterHandle,
 *            instagramHandle, and website (validated). Omitted when
 *            empty so validators don't see `"sameAs": []`.
 *
 * No further social fields are emitted because the user record doesn't
 * store them: TikTok, LinkedIn user URL, YouTube, Facebook page,
 * Mastodon, Threads, Bluesky, and a separate blog URL are all out of
 * scope. (`linkedinId` and `facebookId` exist but are OAuth provider
 * IDs, not user-managed URLs — the API strips them.)
 */
export function buildPersonSchema(profile: PersonSchemaInput): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.displayName?.trim() || "Author",
    url: `${SITE_URL}/authors/${profile.id}`,
  };

  if (profile.avatarUrl) {
    schema.image = absolutizeImage(profile.avatarUrl);
  }

  if (profile.bio && profile.bio.trim()) {
    schema.description = truncateAtWord(profile.bio, PERSON_BIO_CAP);
  }

  const sameAs: string[] = [];
  const tw = normalizeHandle(profile.twitterHandle);
  if (tw) sameAs.push(`https://twitter.com/${tw}`);
  const ig = normalizeHandle(profile.instagramHandle);
  if (ig) sameAs.push(`https://instagram.com/${ig}`);
  const website = validateWebsiteUrlForSameAs(profile.website);
  if (website) sameAs.push(website);

  if (sameAs.length > 0) {
    schema.sameAs = sameAs;
  }

  return schema;
}

export interface FaqItemInput {
  question: string;
  answer: string;
}

export interface FaqCategoryInput {
  items: FaqItemInput[];
}

/**
 * FAQPage JSON-LD for /faq.
 *
 * Flattens the page's category-grouped Q&A into the single
 * `mainEntity` array that schema.org defines — Google's FAQPage rich
 * result doesn't model categories, so the visual grouping on the page
 * is a presentation detail not reflected in the schema.
 *
 * Each entry is a `Question` whose `acceptedAnswer.text` is the answer
 * verbatim. Plotzy's FAQ answers are plain prose (verified — no
 * markdown), so JSON.stringify in <JsonLd> escapes them safely. If a
 * future answer ever introduces HTML, schema.org permits it inside
 * `Answer.text` as long as the page also renders the same HTML.
 *
 * No length cap is applied: the longest answer at the time of writing
 * is 556 chars, well under Google's 5000-char recommendation. Add a
 * cap if that ever changes.
 *
 * Visibility requirement: every Question/Answer in this schema MUST
 * be present in the rendered HTML (Google's policy on structured data
 * matching visible content). The FAQ page achieves this via the
 * `forceMount` prop on each AccordionContent, which keeps the closed-
 * state answer in the DOM with the `hidden` HTML attribute.
 */
export function buildFaqPageSchema(
  categories: FaqCategoryInput[],
): Record<string, unknown> {
  const mainEntity = categories
    .flatMap((cat) => cat.items)
    .map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    }));

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity,
  };
}

export interface BreadcrumbItem {
  /** Visible label rendered by Google's breadcrumb chip. */
  name: string;
  /** Site-root-relative path, e.g. "/pricing" or `/read/${id}`. The
   *  builder prepends SITE_URL so call sites don't repeat the host. */
  path: string;
}

/**
 * BreadcrumbList JSON-LD for nested public routes.
 *
 * The home item (`Plotzy` → `https://plotzy.com`) is prepended
 * automatically — Google's BreadcrumbList rich result requires
 * position 1 to be the site root, so building it in keeps every call
 * site honest and avoids forgetting it.
 *
 * Pass the trailing portion of the breadcrumb only:
 *   buildBreadcrumbSchema([{ name: "Pricing", path: "/pricing" }])
 *     → Plotzy › Pricing  (2 items)
 *
 *   buildBreadcrumbSchema([
 *     { name: "Community Library", path: "/library" },
 *     { name: book.title, path: `/read/${book.id}` },
 *   ])
 *     → Plotzy › Community Library › <book title>  (3 items)
 *
 * Call sites should guard on data availability for dynamic pages —
 * rendering `Plotzy › Library › undefined` while the book query is
 * loading is worse than no breadcrumb at all.
 */
export function buildBreadcrumbSchema(
  items: BreadcrumbItem[],
): Record<string, unknown> {
  const allItems: BreadcrumbItem[] = [
    { name: SITE_NAME, path: "" },
    ...items,
  ];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: allItems.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}
