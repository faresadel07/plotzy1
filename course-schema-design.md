# Course Schema Design — Batch 1.1

**Date:** 2026-05-05
**Branch:** `feat/course-batch-1-schema` (created from `63b644e`)
**Scope:** Database schema only — 8 new tables for the free Writing Course.

---

## Decision points (require your input)

### 1. Lessons content: DB vs markdown files in repo

**Recommendation: DB column (markdown text in `course_lessons.content`).**

The user spec already declares `content (rich text/markdown — the lesson body)` as a column, so this is mostly a confirmation — but here's the honest both-sides argument.

**Markdown files in repo (`/content/course/<module>/<lesson>.md`) — pros:**
- Editor experience (write in real markdown editor with preview).
- PR-reviewable diffs for content changes.
- Co-locate images alongside the file.
- No DB churn for content edits.

**Markdown files — cons:**
- Adds infrastructure that doesn't exist today: build-time manifest, file-loader, fallback when a slug doesn't have a file. Plotzy has no contentlayer / Astro / MDX pipeline; we'd build one.
- Splits source-of-truth: lesson metadata in DB, content on disk. Future admin UI for editing means writing a file-write API.
- Initial deployment is a two-step dance (deploy code → upload content) instead of one DB seed.

**DB column — pros:**
- Single source of truth. `SELECT * FROM course_lessons WHERE slug = ?` returns everything the frontend needs.
- No new file-loading infrastructure; reuses existing query patterns.
- Seed-script editable in Git (write a `seedCourseLessons.ts` that inserts the 27 lessons). Diffs are reviewable.
- Easier path to a future "edit lesson" admin UI (one PATCH endpoint).

**DB column — cons:**
- Editing content means writing SQL or running a seed script (no inline-edit-and-PR experience).
- Markdown blob in row — but the row count is 27, content is moderate size. Postgres handles this trivially.

**Why DB wins for our case:** Plotzy is a solo-founder codebase with no CMS and low expected edit frequency post-launch. The cost of building a markdown-file pipeline (~3–4 hours including tests) outweighs the editing-experience benefit for a content set that won't change often. If we ever need full markdown-file editing, migrating from DB → files later is straightforward (read the rows, write to files, drop the column).

### 2. Quiz randomization

**Recommendation: fixed questions for v1. Pool-based randomization deferred.**

| Approach | Authoring cost | Anti-memorization | Schema complexity |
|---|---|---|---|
| Fixed (5 per module, 40 final) | 70 questions total | Low — same Qs every attempt | Simple |
| Pool of 10/60, random select | 120 questions total | High | Add `pool_size` field + selection logic |

For launch: 70 quality MCQs is already a substantial authoring effort. Pooling adds 50 more questions to write at the same quality bar. Save it for v2 once the course has been validated by real students.

**Schema implication:** `course_quizzes.question_count` carries the count actually shown (5 or 40). When we later move to pools, we'd add a nullable `pool_size` column — additive migration.

### 3. Soft-delete vs hard-delete on progress / "restart course"

**Recommendation: don't ship a "restart" button at v1.**

Re-watching lessons doesn't require deletion of `course_progress` rows — the UI can still show them as completed and let the user re-engage. Re-attempting quizzes is already supported (`course_quiz_attempts` allows multiple attempts).

The only real "restart" use case is "I want my progress display to read 0% again." That's a UX cosmetic, not a learning need. Punting:

- v1: no restart button. Users see their actual progress, can re-engage with content.
- v2 (if requested): hard delete `course_progress` and `course_quiz_attempts` rows on restart. **Never delete `course_certificates`** — once earned, it's earned.

This keeps the schema minimal (no `deleted_at` columns, no `attempt_number` versioning).

### 4. Migration strategy — and a flag the prompt assumes

**This is the biggest flag.** The prompt asks for "Create migration file… reversible (down() defined)" in `lib/db/migrations/`.

**Reality:** the project does NOT use versioned migrations. There is no `lib/db/migrations/` directory. Schema changes ship via `drizzle-kit push` — same as the GDPR Stage 1 batch we did earlier (which we paused). [drizzle.config.ts](lib/db/drizzle.config.ts) has no `out` directory; [package.json](lib/db/package.json) only defines a `push` script.

**Two paths:**

- **(A) Stick with `drizzle-kit push`** (what the project has done historically). Add the 8 tables to `lib/db/src/schema/index.ts`. Generate a hand-written SQL artifact for review (same pattern as the GDPR batch's `stage-1-migration.sql`), get your approval, then you run `pnpm push` interactively. **Recommended.**
- **(B) Migrate the project to versioned migrations.** Big architectural change. Out of scope for a course-schema batch.

I'll proceed with (A). On migration ordering: one push for all 8 tables. They have FK dependencies but `drizzle-kit push` orders DDL correctly. No safety benefit from splitting (1–4) and (5–8); the second push is just "edit TS again, run push again."

---

## Schema (TypeScript Drizzle definitions)

```ts
// ── Course: Modules ───────────────────────────────────────────────────────
// Static metadata for the 6 course modules. Seeded at deploy time;
// rarely edited.
export const courseModules = pgTable("course_modules", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),  // "foundation", "architecture", ...
  title: text("title").notNull(),
  subtitle: text("subtitle"),               // "Building the Skeleton"
  description: text("description"),
  order: integer("order").notNull(),        // 1-6
  estimatedMinutes: integer("estimated_minutes").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("idx_course_modules_order_unique").on(t.order),
  check("course_modules_order_range", sql`${t.order} BETWEEN 1 AND 6`),
]);

// ── Course: Lessons ───────────────────────────────────────────────────────
// 27 lessons across 6 modules. Content body is markdown stored in-row
// (see Decision Point 1).
export const courseLessons = pgTable("course_lessons", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => courseModules.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  orderInModule: integer("order_in_module").notNull(),
  estimatedMinutes: integer("estimated_minutes").notNull(),
  content: text("content").notNull(),       // markdown body
  heroImageUrl: text("hero_image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("idx_course_lessons_module_slug").on(t.moduleId, t.slug),    // slug unique within a module
  uniqueIndex("idx_course_lessons_module_order").on(t.moduleId, t.orderInModule),
  index("idx_course_lessons_module").on(t.moduleId),
]);

// ── Course: Quizzes ───────────────────────────────────────────────────────
// 7 rows: 6 module quizzes + 1 final exam. Module quizzes have moduleId;
// the final exam has moduleId NULL.
export const courseQuizzes = pgTable("course_quizzes", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").references(() => courseModules.id, { onDelete: "cascade" }),  // NULL for final
  type: text("type").notNull(),                // 'module' | 'final'
  questionCount: integer("question_count").notNull(),
  passingPercentage: integer("passing_percentage").notNull(),  // 70 or 75
  timeLimitMinutes: integer("time_limit_minutes"),             // NULL for module, 60 for final
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  check("course_quizzes_type_check", sql`${t.type} IN ('module', 'final')`),
  // type/moduleId consistency: 'module' MUST have a moduleId; 'final' MUST NOT.
  check("course_quizzes_module_consistency",
    sql`(${t.type} = 'module' AND ${t.moduleId} IS NOT NULL) OR (${t.type} = 'final' AND ${t.moduleId} IS NULL)`),
  check("course_quizzes_passing_range", sql`${t.passingPercentage} BETWEEN 0 AND 100`),
  // One quiz per module (the final exam is the single row with moduleId NULL).
  uniqueIndex("idx_course_quizzes_module_unique").on(t.moduleId).where(sql`${t.moduleId} IS NOT NULL`),
]);

// ── Course: Quiz Questions ────────────────────────────────────────────────
// MCQ questions. 4 options each. correct_option is one of 'a','b','c','d'.
export const courseQuizQuestions = pgTable("course_quiz_questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => courseQuizzes.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  correctOption: text("correct_option").notNull(),  // 'a' | 'b' | 'c' | 'd'
  explanation: text("explanation"),                  // shown after answering
  order: integer("order").notNull(),
}, (t) => [
  index("idx_course_quiz_questions_quiz").on(t.quizId),
  uniqueIndex("idx_course_quiz_questions_quiz_order").on(t.quizId, t.order),
  check("course_quiz_questions_correct_option_check", sql`${t.correctOption} IN ('a', 'b', 'c', 'd')`),
]);

// ── Course: Progress (per-user lesson completion) ─────────────────────────
// One row per (user, lesson) when the lesson is marked complete.
// Re-attempts don't insert new rows; UPDATE the existing row's
// timeSpentSeconds and (optionally) re-stamp completedAt.
export const courseProgress = pgTable("course_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lessonId: integer("lesson_id").notNull().references(() => courseLessons.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  timeSpentSeconds: integer("time_spent_seconds").default(0).notNull(),
}, (t) => [
  uniqueIndex("idx_course_progress_user_lesson").on(t.userId, t.lessonId),
  index("idx_course_progress_user").on(t.userId),
]);

// ── Course: Quiz Attempts ─────────────────────────────────────────────────
// Multiple attempts allowed. Best attempt is queried via
// ORDER BY score_percentage DESC LIMIT 1. answersJson is the audit
// trail (which option the user picked per question), used to render
// the post-attempt review screen.
export const courseQuizAttempts = pgTable("course_quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  quizId: integer("quiz_id").notNull().references(() => courseQuizzes.id, { onDelete: "cascade" }),
  scorePercentage: integer("score_percentage").notNull(),  // 0-100
  correctCount: integer("correct_count").notNull(),
  totalCount: integer("total_count").notNull(),
  passed: boolean("passed").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),                  // NULL = abandoned mid-attempt
  answersJson: jsonb("answers_json").notNull(),            // { "<questionId>": "a", ... }
}, (t) => [
  index("idx_course_quiz_attempts_user").on(t.userId),
  index("idx_course_quiz_attempts_quiz").on(t.quizId),
  index("idx_course_quiz_attempts_user_quiz").on(t.userId, t.quizId),
  check("course_quiz_attempts_score_range", sql`${t.scorePercentage} BETWEEN 0 AND 100`),
]);

// ── Course: Certificates ──────────────────────────────────────────────────
// Issued exactly once per user when ALL completion criteria are met:
//   - All 27 lessons completed
//   - All 6 module quizzes passed (≥70%)
//   - Final exam passed (≥75%)
//   - Final project submitted
// Validation lives in the API layer (Batch 1.2). The unique on userId
// is the schema's hard guarantee that we never double-issue.
export const courseCertificates = pgTable("course_certificates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  certificateUuid: text("certificate_uuid").notNull().unique(),  // public-facing slug, /certificates/<uuid>
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  finalExamScore: integer("final_exam_score").notNull(),
  modulesCompletedAt: jsonb("modules_completed_at").notNull(),    // { "1": "2026-...", "2": "...", ... }
  pdfUrl: text("pdf_url"),                                         // populated lazily on first download
}, (t) => [
  index("idx_course_certificates_uuid").on(t.certificateUuid),
]);

// ── Course: Final Projects ────────────────────────────────────────────────
// One submission per user, referencing an existing Plotzy book + 3
// chapters. ai_feedback_json holds the structured output of the existing
// AI analysis tools run against the submission (plot holes, pacing, etc.).
export const courseFinalProjects = pgTable("course_final_projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  chapterIds: jsonb("chapter_ids").notNull(),     // e.g. [12, 13, 14]
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),            // NULL until reviewed
  aiFeedbackJson: jsonb("ai_feedback_json"),       // structured output of the analysis tools
}, (t) => [
  index("idx_course_final_projects_book").on(t.bookId),
]);
```

---

## Indexes

Summary of indexes per table (all already declared in the schema above):

| Table | Index | Purpose |
|---|---|---|
| `course_modules` | unique on `order` | enforce 6 distinct positions |
| `course_lessons` | unique on `(module_id, slug)` | URL-routing — `/course/<module>/<lesson>` |
| `course_lessons` | unique on `(module_id, order_in_module)` | enforce 1–5 ordering per module |
| `course_lessons` | index on `module_id` | "list lessons of module" query |
| `course_quizzes` | partial unique on `module_id WHERE module_id IS NOT NULL` | one quiz per module; final exam (NULL module_id) is the single row not subject to this |
| `course_quiz_questions` | index on `quiz_id` | fetch questions for a quiz |
| `course_quiz_questions` | unique on `(quiz_id, order)` | enforce ordering within a quiz |
| `course_progress` | unique on `(user_id, lesson_id)` | one completion record per user-lesson pair |
| `course_progress` | index on `user_id` | "my progress" query |
| `course_quiz_attempts` | index on `user_id`, `quiz_id`, `(user_id, quiz_id)` | best-attempt queries |
| `course_certificates` | unique on `user_id` (column-level) | one cert per user — schema-enforced |
| `course_certificates` | index on `certificate_uuid` | public lookup `/certificates/<uuid>` |
| `course_final_projects` | unique on `user_id` (column-level) | one final project per user |
| `course_final_projects` | index on `book_id` | "is this book a final project submission?" lookup |

---

## Relations (FK diagram)

```
users (existing)
  ├── course_progress.user_id           (CASCADE delete)
  ├── course_quiz_attempts.user_id      (CASCADE delete)
  ├── course_certificates.user_id       (CASCADE delete, UNIQUE)
  └── course_final_projects.user_id     (CASCADE delete, UNIQUE)

books (existing)
  └── course_final_projects.book_id     (CASCADE delete)

course_modules
  ├── course_lessons.module_id          (CASCADE delete)
  └── course_quizzes.module_id          (CASCADE delete, NULLable for final exam)

course_lessons
  └── course_progress.lesson_id         (CASCADE delete)

course_quizzes
  ├── course_quiz_questions.quiz_id     (CASCADE delete)
  └── course_quiz_attempts.quiz_id      (CASCADE delete)
```

**ON DELETE strategy notes:**
- User deletion cascades → loses progress, quiz attempts, certificate, final project. Aligned with GDPR right-to-erasure.
- Module deletion cascades → loses its lessons, quiz, and questions. We will never delete modules in practice (only edit). The cascade is for symmetry/safety.
- Book deletion cascades to final project → if a user deletes the book they submitted, the project record is removed. They'd need to resubmit. Acceptable.

---

## Migration plan

Per Decision Point 4 (use `drizzle-kit push`, no versioned migrations):

1. **B1.1.a — Schema TS edit**: append the 8 table definitions to [lib/db/src/schema/index.ts](lib/db/src/schema/index.ts) at the end of the file (after `adminAuditLogs` at line 691+).
2. **B1.1.b — Migration SQL artifact**: hand-write `course-schema-migration.sql` documenting the exact DDL `drizzle-kit push` will propose. Same pattern we used for `stage-1-migration.sql` in the GDPR batch. You review before push.
3. **B1.1.c — `pnpm push`**: you run from `lib/db/` and accept the interactive prompt.
4. **B1.1.d — Seed data**:
   - 6 module rows with finalized slug/title/subtitle/description/order/estimatedMinutes
   - 27 lesson rows (placeholder content, real titles/order/module_id) — content fills in Batch 2
   - 7 quiz rows (6 module quizzes + 1 final exam) with correct passing_percentage and time_limit_minutes
   - **No quiz questions seeded yet** — those wait for Batch 3 per the user's "Out of Scope" list
5. Verify by `psql` (or via api-server queries) that all 8 tables exist with FKs and indexes.

The seed approach: a one-shot `scripts/seedCourse.ts` script that uses the Drizzle connection. Idempotent via `ON CONFLICT (slug) DO NOTHING` for modules/lessons. Re-runnable safely.

---

## Potential issues found during the audit

### 1. `lib/db/migrations/` directory does not exist (project uses `drizzle-kit push`)
**Severity**: BLOCKER — affects how Phase B is executed.
The user's prompt assumes versioned migrations with `down()` definitions. The project doesn't have that. **Need explicit decision: Path A (stick with push, this batch's work) or Path B (migrate project to versioned migrations, separate batch).** Recommended Path A.

### 2. `order` is a SQL reserved word; existing `chapters` table already uses it
**Severity**: LOW.
The bare column name `order` is risky in raw SQL but Drizzle escapes it correctly. The `chapters` table at [schema/index.ts:136](lib/db/src/schema/index.ts#L136) already uses it without issue. We follow the existing convention. No special handling needed.

### 3. No `course_*` table conflicts in the existing schema
**Severity**: NONE — verified.
Grep for `course_` returns zero matches in the existing 38-table schema. The course namespace is clean.

### 4. The existing `tutorials` table is unrelated
**Severity**: NONE — verified.
[`tutorials`](lib/db/src/schema/index.ts#L555) powers the existing `/tutorial` page (video tutorials). It's a separate feature from the writing course. No collision; we keep both.

### 5. Final project FK to `books` requires the user to have an existing book
**Observation**: by-design but worth flagging.
The schema requires `course_final_projects.bookId` to be `notNull`. A user who reaches Module 6 without having created a book in their main library can't submit a final project. Frontend (Batch 1.3) needs to either:
- Surface "create your first book to submit" CTA, OR
- Auto-create a placeholder book on submission attempt.

Not a schema issue. Logged here so Batch 1.3 doesn't surprise us.

### 6. `modulesCompletedAt` JSON shape isn't validated by the schema
**Severity**: LOW.
We store `{ "1": "2026-...", ... }` as `jsonb`. Postgres won't validate the shape. The certificate-issuance API (Batch 1.2) is responsible for writing well-formed values. A future Path A item could add a `CHECK (jsonb_typeof(modules_completed_at) = 'object')` or similar.

### 7. `chapter_ids` JSON array on final project — no FK enforcement
**Severity**: LOW.
Storing `[12, 13, 14]` as `jsonb` means we can't rely on Postgres to validate the chapter IDs exist. The submission API must validate before insert. Same constraint exists for similar JSON-list patterns elsewhere in the codebase (e.g., `books.tags`).

---

## Approval gate

Before any code change:

1. **Approve Path A** (stick with `drizzle-kit push`, hand-write SQL artifact for review) over Path B (migrate to versioned migrations as a separate batch)?
2. **Approve content-in-DB** (Decision 1) — markdown text in `course_lessons.content`?
3. **Approve fixed quizzes** (Decision 2) — 5 fixed Qs per module, 40 fixed for final, no random pool yet?
4. **Approve no-restart for v1** (Decision 3) — punt the restart UX entirely?
5. **Approve the schema as drafted** — 8 tables, 14 indexes, 5 check constraints, the FK/cascade map? Any field renames or constraints to add?
6. **Anything to change** in the seed-data plan (6 modules + 27 lesson placeholders + 7 quiz rows, NO questions seeded)?

Awaiting your decisions before I edit `schema/index.ts` or write the SQL artifact.
