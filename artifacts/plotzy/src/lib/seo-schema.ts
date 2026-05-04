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

const SITE_NAME = "Plotzy";
const SITE_URL = "https://plotzy.com";
const SITE_LOGO = `${SITE_URL}/plotzy-logo.png`;
const SITE_DESCRIPTION =
  "Plotzy is a complete platform for writers — write, design covers, publish, and produce audiobooks with AI assistance.";

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
