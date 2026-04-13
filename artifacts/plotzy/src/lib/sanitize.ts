import DOMPurify from "dompurify";

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Allows safe formatting tags (p, br, em, strong, etc.) but strips scripts.
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
