// Single source of truth for blog post categories.
//
// Three surfaces used to keep their own diverging copies (the creation
// modal had 10, the editor 13, the public blog page 14), so the reader
// page offered filters no post could ever have. Every surface now
// imports this list; category VALUES stay English because they are
// stored verbatim in books.articleCategory and matched exactly by the
// blog page filter (display labels are localized via i18n keys).
export const BLOG_CATEGORIES = [
  "Writing Tips",
  "Craft & Technique",
  "Publishing",
  "Reading",
  "Inspiration",
  "Author Interviews",
  "Book Reviews",
  "Industry News",
  "Self-Publishing",
  "Marketing",
  "Grammar & Style",
  "Research",
  "Other",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];
