import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

/**
 * Per-page SEO component. Sets <title>, <meta description>, robots,
 * canonical, and Open Graph / Twitter Card tags.
 *
 * Title format: page-specific phrase + " · Plotzy" (matches the existing
 * convention from author-profile.tsx). The brand suffix is applied
 * automatically — pages pass only the page-specific phrase. Pages that
 * legitimately need the verbatim site title (e.g. landing) can pass
 * `titleOverride` to skip the suffix.
 *
 * Canonical URL is built from `https://plotzy.com${pathname}` with the
 * trailing slash stripped except at the root. Override with `canonical`
 * for special cases (e.g. dropping query strings or fragments).
 *
 * Set `noindex` on auth-gated, admin, transactional, or token-bound
 * pages so search engines don't index per-user surfaces.
 *
 * Children render inside <Helmet>, so JSON-LD <script> blocks composed
 * by callers ride along on the same head update without a second
 * roundtrip through Helmet's reconciliation.
 *
 * NOTE: Plotzy is a pure SPA with no SSR. Helmet updates the head AFTER
 * React hydrates. Crawlers that execute JavaScript (Googlebot, Bingbot)
 * see the per-page tags. Crawlers that DON'T (Twitter, Facebook,
 * LinkedIn, Slack, Discord) see only the root index.html. See the SPA
 * social-preview note in discovered-issues.md for the deferred fix.
 */

const SITE_BRAND = "Plotzy";
const SITE_BRAND_FULL = "Plotzy — Write Your Story";
const SITE_URL = "https://plotzy.com";
const DEFAULT_OG_IMAGE = "/opengraph.jpg";
const DEFAULT_DESCRIPTION =
  "Plotzy is a professional book writing platform with AI-assisted tools, audiobook studio, cover designer, and a community library.";

export type OgType = "website" | "article" | "book" | "profile";

export interface SEOProps {
  /**
   * Page-specific title phrase. The brand suffix " · Plotzy" is appended
   * automatically. Omit (or pass `titleOverride`) for the landing page.
   */
  title?: string;
  /**
   * Verbatim title override that bypasses the brand suffix. Use for the
   * landing page when you want to keep "Plotzy — Write Your Story" intact.
   */
  titleOverride?: string;
  /**
   * Meta description (≤160 chars recommended). Falls back to the global
   * Plotzy description if omitted.
   */
  description?: string;
  /**
   * Add `<meta name="robots" content="noindex,nofollow">` so the page is
   * excluded from search index and link-following. Use on auth-gated,
   * admin, transactional, and token-bound surfaces.
   */
  noindex?: boolean;
  /**
   * Canonical URL override. Defaults to `https://plotzy.com${pathname}`
   * with trailing slash stripped (except `/`).
   */
  canonical?: string;
  /**
   * Open Graph image URL. Defaults to /opengraph.jpg. Pass an absolute
   * URL when the page renders user-supplied content (book cover, avatar)
   * so social previews resolve correctly.
   */
  ogImage?: string;
  /**
   * og:type. Defaults to "website". Use "article" for blog posts,
   * "book" for /read/:id, "profile" for /authors/:userId.
   */
  ogType?: OgType;
  /**
   * og:url override. Defaults to the canonical URL.
   */
  ogUrl?: string;
  /**
   * Children render inside <Helmet>. Used by JSON-LD wrappers so a single
   * head update carries title + meta + structured data together.
   */
  children?: React.ReactNode;
}

function buildCanonical(pathname: string): string {
  // Drop query string and fragment if a wouter pathname ever surfaces them
  // (it shouldn't, but defensive). Strip a trailing slash except at root.
  const cleanPath = pathname.split("?")[0].split("#")[0] || "/";
  const stripped = cleanPath.length > 1 && cleanPath.endsWith("/")
    ? cleanPath.slice(0, -1)
    : cleanPath;
  return `${SITE_URL}${stripped}`;
}

export function SEO({
  title,
  titleOverride,
  description,
  noindex,
  canonical,
  ogImage,
  ogType = "website",
  ogUrl,
  children,
}: SEOProps) {
  const [pathname] = useLocation();
  const finalTitle = titleOverride
    ? titleOverride
    : title
      ? `${title} · ${SITE_BRAND}`
      : SITE_BRAND_FULL;
  const finalDescription = description ?? DEFAULT_DESCRIPTION;
  const finalCanonical = canonical ?? buildCanonical(pathname);
  const finalOgUrl = ogUrl ?? finalCanonical;
  const finalOgImage = ogImage ?? DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      <link rel="canonical" href={finalCanonical} />

      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={finalOgImage} />
      <meta property="og:url" content={finalOgUrl} />
      <meta property="og:site_name" content={SITE_BRAND} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalOgImage} />

      {children}
    </Helmet>
  );
}

export default SEO;
