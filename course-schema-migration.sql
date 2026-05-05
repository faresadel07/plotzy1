-- Course schema migration — feat/course-batch-1-schema
-- Source: lib/db/src/schema/index.ts (8 new course_* tables)
-- Apply via: cd lib/db && pnpm push
--
-- Why this file exists:
--   The project ships schema via `drizzle-kit push` (no on-disk
--   migration files). This file documents the exact DDL `push` will
--   propose for the schema diff after this branch's edits, so the
--   user can review it before the interactive prompt. Mirrors the
--   pattern used by the GDPR-batch's stage-1-migration.sql.
--
-- Tables (8):
--   1. course_modules             — 6-module catalog
--   2. course_lessons             — 27 lessons across 6 modules
--   3. course_quizzes             — 6 module quizzes + 1 final exam
--   4. course_quiz_questions      — MCQ pool (4 options each)
--   5. course_progress            — per-user lesson completion
--   6. course_quiz_attempts       — per-user quiz attempts (history)
--   7. course_certificates        — one per user on full completion
--   8. course_final_projects      — one per user, references existing book
--
-- Cascade strategy:
--   - users → course_progress / quiz_attempts / certificates / final_projects: CASCADE (GDPR right-to-erasure)
--   - course_modules → lessons / quizzes: CASCADE (admin cleanup)
--   - course_quizzes → questions / attempts: CASCADE
--   - course_lessons → course_progress: RESTRICT (protect against accidental data loss)
--   - books → course_final_projects: CASCADE (book delete removes its submission)

BEGIN;

-- ── Table 1: course_modules ───────────────────────────────────────────────
CREATE TABLE "course_modules" (
  "id"                 serial PRIMARY KEY,
  "slug"               text NOT NULL UNIQUE,
  "title"              text NOT NULL,
  "subtitle"           text,
  "description"        text,
  "order"              integer NOT NULL,
  "estimated_minutes"  integer NOT NULL,
  "created_at"         timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "course_modules_order_range" CHECK ("order" BETWEEN 1 AND 6)
);
CREATE UNIQUE INDEX "idx_course_modules_order_unique" ON "course_modules" ("order");

-- ── Table 2: course_lessons ───────────────────────────────────────────────
CREATE TABLE "course_lessons" (
  "id"                 serial PRIMARY KEY,
  "module_id"          integer NOT NULL REFERENCES "course_modules"("id") ON DELETE CASCADE,
  "slug"               text NOT NULL,
  "title"              text NOT NULL,
  "order_in_module"    integer NOT NULL,
  "estimated_minutes"  integer NOT NULL,
  "content"            text NOT NULL,
  "hero_image_url"     text,
  "created_at"         timestamp NOT NULL DEFAULT now(),
  "updated_at"         timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "idx_course_lessons_module_slug"  ON "course_lessons" ("module_id", "slug");
CREATE UNIQUE INDEX "idx_course_lessons_module_order" ON "course_lessons" ("module_id", "order_in_module");
CREATE INDEX        "idx_course_lessons_module"       ON "course_lessons" ("module_id");

-- ── Table 3: course_quizzes ───────────────────────────────────────────────
CREATE TABLE "course_quizzes" (
  "id"                  serial PRIMARY KEY,
  "module_id"           integer REFERENCES "course_modules"("id") ON DELETE CASCADE,
  "type"                text NOT NULL,
  "question_count"      integer NOT NULL,
  "passing_percentage"  integer NOT NULL,
  "time_limit_minutes"  integer,
  "created_at"          timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "course_quizzes_type_check"           CHECK ("type" IN ('module', 'final')),
  CONSTRAINT "course_quizzes_module_consistency"   CHECK (("type" = 'module' AND "module_id" IS NOT NULL) OR ("type" = 'final' AND "module_id" IS NULL)),
  CONSTRAINT "course_quizzes_passing_range"        CHECK ("passing_percentage" BETWEEN 0 AND 100)
);
-- Partial unique: one quiz per module. Final exam (module_id NULL) is exempt.
CREATE UNIQUE INDEX "idx_course_quizzes_module_unique" ON "course_quizzes" ("module_id") WHERE "module_id" IS NOT NULL;

-- ── Table 4: course_quiz_questions ────────────────────────────────────────
CREATE TABLE "course_quiz_questions" (
  "id"               serial PRIMARY KEY,
  "quiz_id"          integer NOT NULL REFERENCES "course_quizzes"("id") ON DELETE CASCADE,
  "question_text"    text NOT NULL,
  "option_a"         text NOT NULL,
  "option_b"         text NOT NULL,
  "option_c"         text NOT NULL,
  "option_d"         text NOT NULL,
  "correct_option"   text NOT NULL,
  "explanation"      text,
  "order"            integer NOT NULL,
  CONSTRAINT "course_quiz_questions_correct_option_check" CHECK ("correct_option" IN ('a', 'b', 'c', 'd'))
);
CREATE INDEX        "idx_course_quiz_questions_quiz"        ON "course_quiz_questions" ("quiz_id");
CREATE UNIQUE INDEX "idx_course_quiz_questions_quiz_order"  ON "course_quiz_questions" ("quiz_id", "order");

-- ── Table 5: course_progress ──────────────────────────────────────────────
-- userId CASCADE (GDPR), lessonId RESTRICT (don't accidentally delete
-- a lesson that students have progress on).
CREATE TABLE "course_progress" (
  "id"                 serial PRIMARY KEY,
  "user_id"            integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "lesson_id"          integer NOT NULL REFERENCES "course_lessons"("id") ON DELETE RESTRICT,
  "completed_at"       timestamp NOT NULL DEFAULT now(),
  "time_spent_seconds" integer NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "idx_course_progress_user_lesson" ON "course_progress" ("user_id", "lesson_id");
CREATE INDEX        "idx_course_progress_user"        ON "course_progress" ("user_id");

-- ── Table 6: course_quiz_attempts ─────────────────────────────────────────
CREATE TABLE "course_quiz_attempts" (
  "id"                 serial PRIMARY KEY,
  "user_id"            integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "quiz_id"            integer NOT NULL REFERENCES "course_quizzes"("id") ON DELETE CASCADE,
  "score_percentage"   integer NOT NULL,
  "correct_count"      integer NOT NULL,
  "total_count"        integer NOT NULL,
  "passed"             boolean NOT NULL,
  "started_at"         timestamp NOT NULL DEFAULT now(),
  "completed_at"       timestamp,
  "answers_json"       jsonb NOT NULL,
  CONSTRAINT "course_quiz_attempts_score_range" CHECK ("score_percentage" BETWEEN 0 AND 100)
);
CREATE INDEX "idx_course_quiz_attempts_user"      ON "course_quiz_attempts" ("user_id");
CREATE INDEX "idx_course_quiz_attempts_quiz"      ON "course_quiz_attempts" ("quiz_id");
CREATE INDEX "idx_course_quiz_attempts_user_quiz" ON "course_quiz_attempts" ("user_id", "quiz_id");

-- ── Table 7: course_certificates ──────────────────────────────────────────
-- One per user (UNIQUE on user_id). certificate_uuid is the public slug.
CREATE TABLE "course_certificates" (
  "id"                       serial PRIMARY KEY,
  "user_id"                  integer NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "certificate_uuid"         text NOT NULL UNIQUE,
  "issued_at"                timestamp NOT NULL DEFAULT now(),
  "final_exam_score"         integer NOT NULL,
  "modules_completed_at"     jsonb NOT NULL,
  "pdf_url"                  text
);
CREATE INDEX "idx_course_certificates_uuid" ON "course_certificates" ("certificate_uuid");

-- ── Table 8: course_final_projects ────────────────────────────────────────
-- One per user. References an existing book (CASCADE if the book is
-- deleted — the user can resubmit). chapter_ids is jsonb; the
-- submission API is responsible for verifying the IDs.
CREATE TABLE "course_final_projects" (
  "id"                serial PRIMARY KEY,
  "user_id"           integer NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "book_id"           integer NOT NULL REFERENCES "books"("id") ON DELETE CASCADE,
  "chapter_ids"       jsonb NOT NULL,
  "submitted_at"      timestamp NOT NULL DEFAULT now(),
  "approved_at"       timestamp,
  "ai_feedback_json"  jsonb
);
CREATE INDEX "idx_course_final_projects_book" ON "course_final_projects" ("book_id");

COMMIT;

-- Rollback (manual, if ever needed):
--   BEGIN;
--   DROP TABLE "course_final_projects";
--   DROP TABLE "course_certificates";
--   DROP TABLE "course_quiz_attempts";
--   DROP TABLE "course_progress";
--   DROP TABLE "course_quiz_questions";
--   DROP TABLE "course_quizzes";
--   DROP TABLE "course_lessons";
--   DROP TABLE "course_modules";
--   COMMIT;
-- (Drop order is reverse of create order — children before parents.)
