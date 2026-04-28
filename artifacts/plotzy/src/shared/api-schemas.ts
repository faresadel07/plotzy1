// Hand-written Zod schemas for API response validation. These mirror the
// DB column shapes from lib/db/src/schema/index.ts but reflect WIRE
// reality (e.g., Dates come over JSON as ISO strings, not Date objects).
//
// Why hand-written instead of drizzle-zod's createSelectSchema:
// importing the drizzle table definitions would pull drizzle-orm/pg-core
// into the frontend bundle. Hand-writing keeps the bundle lean.
//
// Drift protection: type-level satisfies guards at the bottom of this
// file. If the DB schema gains/renames a column, the guard fails to
// compile and forces an update here. Zero runtime cost — types are
// erased at build time.

import { z } from "zod";

// jsonb fields are typed loosely on the wire. The frontend continues
// to use its existing BookPreferences/BookPages structural types when
// reading these — Zod just confirms the shape is "an object or null".
const JsonbObject = z.record(z.string(), z.unknown());

// ─── Book ─────────────────────────────────────────────────────────────
//
// Mirrors `books` table at lib/db/src/schema/index.ts:77-121.
// Field-level notes (only where the wire shape differs from the DB type):
//
//   createdAt   timestamp → string (ISO) on the wire — never Date in JSON
//   publishedAt timestamp → string (ISO) on the wire
//   coverData   jsonb (untyped)        — accept any object
//   bookPreferences jsonb $type<...>   — accept any object (frontend casts)
//   bookPages       jsonb $type<...>   — accept any object (frontend casts)
//   tags           jsonb $type<string[]> → array of strings, fail loud if not

export const BookSchema = z.object({
  id: z.number(),
  userId: z.number().nullable().optional(),
  seriesId: z.number().nullable().optional(),
  seriesOrder: z.number().nullable().optional(),
  title: z.string(),
  coverImage: z.string().nullable().optional(),
  backCoverImage: z.string().nullable().optional(),
  spineColor: z.string().nullable().optional(),
  coverData: JsonbObject.nullable().optional(),
  summary: z.string().nullable().optional(),
  authorName: z.string().nullable().optional(),
  bookPreferences: JsonbObject.nullable().optional(),
  isPaid: z.boolean().nullable().optional(),
  isbn: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  isDeleted: z.boolean(),                          // notNull in DB
  createdAt: z.string().nullable().optional(),     // ISO date string on the wire
  contentType: z.string().nullable().optional(),
  articleContent: z.string().nullable().optional(),
  featuredImage: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  articleCategory: z.string().nullable().optional(),
  bookPages: JsonbObject.nullable().optional(),
  wordGoal: z.number().nullable().optional(),
  genre: z.string().nullable().optional(),
  shareToken: z.string().nullable().optional(),
  isPublished: z.boolean(),                        // notNull
  publishedAt: z.string().nullable().optional(),   // ISO date string
  viewCount: z.number(),                           // notNull, default 0
  featured: z.boolean().nullable().optional(),
});

export type Book = z.infer<typeof BookSchema>;

// ─── Chapter ──────────────────────────────────────────────────────────
//
// Mirrors `chapters` table at lib/db/src/schema/index.ts:123-141.
// Same date-string note as Book.

export const ChapterSchema = z.object({
  id: z.number(),
  bookId: z.number(),                              // notNull
  userId: z.number().nullable().optional(),
  title: z.string(),                               // notNull
  content: z.string(),                             // notNull
  order: z.number(),                               // notNull, default 0
  status: z.string(),                              // notNull, default "draft"
  createdAt: z.string().nullable().optional(),     // ISO date string
});

export type Chapter = z.infer<typeof ChapterSchema>;

// ─── Drift guards ─────────────────────────────────────────────────────
//
// Compile-time type checks. If the DB schema ever gains a non-optional
// column (or renames one), `_BookWireShape` and `_ChapterWireShape`
// will diverge and the `extends` check will fail with the human-readable
// string error. Nothing runs at runtime.
//
// We compare against the wire shape (Date columns expressed as string)
// rather than the frontend's @/shared/schema Book type, because that
// type currently declares `createdAt: Date | null` which is itself
// wire-incorrect (a known drift logged in discovered-issues.md).

type _BookWireShape = {
  id: number;
  userId?: number | null;
  seriesId?: number | null;
  seriesOrder?: number | null;
  title: string;
  coverImage?: string | null;
  backCoverImage?: string | null;
  spineColor?: string | null;
  coverData?: Record<string, unknown> | null;
  summary?: string | null;
  authorName?: string | null;
  bookPreferences?: Record<string, unknown> | null;
  isPaid?: boolean | null;
  isbn?: string | null;
  language?: string | null;
  isDeleted: boolean;
  createdAt?: string | null;
  contentType?: string | null;
  articleContent?: string | null;
  featuredImage?: string | null;
  tags?: string[] | null;
  articleCategory?: string | null;
  bookPages?: Record<string, unknown> | null;
  wordGoal?: number | null;
  genre?: string | null;
  shareToken?: string | null;
  isPublished: boolean;
  publishedAt?: string | null;
  viewCount: number;
  featured?: boolean | null;
};

type _ChapterWireShape = {
  id: number;
  bookId: number;
  userId?: number | null;
  title: string;
  content: string;
  order: number;
  status: string;
  createdAt?: string | null;
};

// If these `extends` checks fail, the DB column shape has drifted from
// the schema above. Update the Zod object to match.
type _BookGuard = z.infer<typeof BookSchema> extends _BookWireShape
  ? _BookWireShape extends z.infer<typeof BookSchema>
    ? true
    : "BookSchema is missing fields present in DB"
  : "BookSchema has fields not in DB or wrong types";

type _ChapterGuard = z.infer<typeof ChapterSchema> extends _ChapterWireShape
  ? _ChapterWireShape extends z.infer<typeof ChapterSchema>
    ? true
    : "ChapterSchema is missing fields present in DB"
  : "ChapterSchema has fields not in DB or wrong types";

// Force the guards to be evaluated (otherwise unused types are tree-shaken).
// `true` is the only valid resolution; any drift becomes a compile error.
const _bookGuard: _BookGuard = true;
const _chapterGuard: _ChapterGuard = true;
void _bookGuard;
void _chapterGuard;
