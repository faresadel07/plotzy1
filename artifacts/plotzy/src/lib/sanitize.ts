import DOMPurify from "dompurify";

// Allow only schemes that can appear in href / src without executing code.
// `javascript:` and `vbscript:` URIs would be the obvious XSS vectors;
// modern DOMPurify already strips them, but we belt-and-brace via an explicit
// allowlist so a future config tweak can't accidentally re-open the door.
const SAFE_URL_SCHEME = /^(?:https?:|mailto:|tel:|data:image\/(?:png|jpe?g|gif|webp|avif|svg\+xml);base64,|\/|#|\?)/i;

// Hook: force rel="noopener noreferrer" on any link with target="_blank",
// and drop unsafe URL schemes from <a href> and <img src>.
// Runs once at module load (DOMPurify is a singleton).
if (typeof window !== "undefined" && (DOMPurify as any).addHook) {
  (DOMPurify as any).addHook("afterSanitizeAttributes", function (node: Element) {
    if (node.nodeName === "A") {
      const href = node.getAttribute("href");
      if (href && !SAFE_URL_SCHEME.test(href.trim())) node.removeAttribute("href");
      if (node.getAttribute("target") === "_blank") {
        node.setAttribute("rel", "noopener noreferrer");
      }
    }
    if (node.nodeName === "IMG") {
      const src = node.getAttribute("src");
      if (src && !SAFE_URL_SCHEME.test(src.trim())) node.removeAttribute("src");
    }
  });
}

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Allows safe formatting tags (p, br, em, strong, etc.) but strips scripts.
 * Automatically adds rel="noopener noreferrer" to any target="_blank" links.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "p", "br", "b", "i", "em", "strong", "u", "s", "del",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "blockquote", "pre", "code",
      "a", "span", "div", "sub", "sup", "mark",
      "table", "thead", "tbody", "tr", "th", "td",
      "img", "hr",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel", "class", "style", "id",
      "src", "alt", "width", "height",
      "colspan", "rowspan",
      "data-color", "data-font-family", "data-font-size",
      "data-text-align",
    ],
    ALLOW_DATA_ATTR: false,
  });
}
