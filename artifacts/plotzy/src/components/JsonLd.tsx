import { Helmet } from "react-helmet-async";

/**
 * Renders a JSON-LD <script type="application/ld+json"> block inside
 * <head> via react-helmet-async.
 *
 * Helmet's <script> child must be a string (a single text node) — that's
 * why we JSON.stringify the data here rather than passing the object
 * directly. Anything outside that pattern (an object, JSX) silently fails
 * to render in the head.
 *
 * Multiple <JsonLd> components on the same page are fine — Helmet groups
 * them all into <head> and search engines parse each <script> block
 * independently. So a page can render <OrganizationJsonLd /> at the app
 * level AND <BookJsonLd /> at the page level without conflict.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(data)}
      </script>
    </Helmet>
  );
}

export default JsonLd;
