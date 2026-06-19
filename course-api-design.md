# Course API Design — Batch 1.2

**Date:** 2026-05-05
**Branch:** `feat/course-batch-1-schema` is current; Phase B will branch new for 1.2
**Master tip:** `63b644e`
**Reference:** [course-schema-design.md](course-schema-design.md), [lib/db/src/schema/index.ts](lib/db/src/schema/index.ts) (course tables added in `a185299`)

---

## Reality check upfront

The course is **free for all tiers** per the user's directive. That has two implications for the API:

1. **No tier-gating on course endpoints.** No `getTierLimits().canX` checks anywhere in this batch.
2. **AI cost still real.** The final-project feedback runs 4 LLM analyses (plot holes / pacing / dialogue / voice). Charging the **daily AI budget** (`tierAiLimiter`) is still appropriate — Free users get 10 calls/day, Pro 100, Premium 200. A submission would burn 4 of their daily budget. We do NOT charge the marketplace monthly counter, because Free has 0 marketplace allowance and we don't want a course gate via the side door.

Auth model:
- **Public** (no auth): module/lesson catalog reads, certificate UUID lookup. These are marketing/sharing primitives.
- **Authenticated** (`requireAuth`): everything user-specific — progress, quiz attempts, certificate issuance, final project.
- **No `requireEmailVerified`** on course — verified email is needed for publishing/commenting per existing code, but blocking course access on email verification creates a worse onboarding step. Logged-in is enough.

---

## URL namespace

Two top-level groups:

| Prefix | Purpose | Auth |
|---|---|---|
| `/api/course/...` | course content + per-user progress + project + cert issuance | logged-in (mostly) |
| `/api/certificates/:uuid` | public verification — sharing primitive | public |

The split is deliberate. `/api/certificates/:uuid` is a public, shareable URL (someone tweets a link). It doesn't need to live under `/api/course/` — the certificate itself is the user-facing artifact, the course is the path that produced it.

Frontend routes (out of scope for Batch 1.2 but referenced for context):
- `/learn` — course landing
- `/learn/lesson/<lesson-slug>` — lesson reader
- `/learn/quiz/<quiz-id>` — quiz UI
- `/learn/final-project` — submission page
- `/certificates/<uuid>` — public verification page (frontend route mirrors API path)

---

## Endpoint inventory

### Group 1 — Catalog (public reads)

#### `GET /api/course/modules`
List all 6 modules with lesson summaries. Public-readable for marketing.

**Auth:** none (public).
**Rate limit:** `publicReadLimiter` (60/min/IP).
**Response:** `200`
```ts
{
  modules: Array<{
    id: number;
    slug: string;            // "foundation"
    title: string;           // "The Foundation"
    subtitle: string;        // "Before You Write: Understanding Story"
    description: string;
    order: number;           // 1-6
    estimatedMinutes: number;
    lessonCount: number;     // computed
    lessons: Array<{
      id: number;
      slug: string;          // "foundation-what-is-story"
      title: string;
      orderInModule: number; // 1-N
      estimatedMinutes: number;
      heroImageUrl: string | null;
    }>;
  }>;
  totalLessons: number;      // 27
  totalEstimatedMinutes: number;
}
```
Lesson `content` is NOT included on the catalog response — keeps payload small. Fetch full content via the per-lesson endpoint.

#### `GET /api/course/modules/:slug`
Single module with its lessons (same lesson summary shape as above).

**Auth:** none.
**Rate limit:** `publicReadLimiter`.
**Errors:** `404` if slug not found.

#### `GET /api/course/lessons/:slug`
Single lesson with full markdown content. Slug is namespaced (e.g., `foundation-what-is-story`) so lookup-by-slug-alone is unambiguous given how we seeded.

**Auth:** none (public — pre-signup users can read lessons).
**Rate limit:** `publicReadLimiter`.
**Response:** `200`
```ts
{
  id: number;
  moduleId: number;
  moduleSlug: string;        // for breadcrumbs
  moduleTitle: string;
  slug: string;
  title: string;
  orderInModule: number;
  estimatedMinutes: number;
  content: string;           // markdown
  heroImageUrl: string | null;
  prevLesson: { slug: string; title: string } | null;  // computed (prev within module, or last lesson of prev module)
  nextLesson: { slug: string; title: string } | null;
  // If user is authenticated, include their completion state for this lesson:
  myCompletion: { completedAt: string; timeSpentSeconds: number } | null;
}
```
**Errors:** `404` if not found.

### Group 2 — Per-user progress (authenticated)

#### `POST /api/course/lessons/:lessonId/complete`
Mark lesson complete for the authenticated user. **Idempotent** — re-clicking does not duplicate; updates `time_spent_seconds` if a new value is provided.

**Auth:** `requireAuth`.
**Rate limit:** `writeLimiter` (30/min).
**Body:**
```ts
{ timeSpentSeconds?: number }  // optional, defaults to 0
```
**Response:** `200` (idempotent — both first-time and re-click return `200`)
```ts
{
  lessonId: number;
  completedAt: string;
  timeSpentSeconds: number;
  // Aggregate so the frontend can immediately update progress UI:
  progress: { completedLessons: number; totalLessons: number; percentage: number };
}
```
**Errors:** `401` (not auth), `404` (lesson not found).

#### `GET /api/course/progress`
Aggregate progress for the current user.

**Auth:** `requireAuth`.
**Rate limit:** `generalLimiter`.
**Response:** `200`
```ts
{
  completedLessons: number;       // count of distinct rows in course_progress for user
  totalLessons: number;           // 27
  percentage: number;             // round(completed/total * 100)
  modules: Array<{
    moduleId: number;
    slug: string;
    completedLessons: number;
    totalLessons: number;
    completedAt: string | null;   // when ALL lessons in module completed
  }>;
  quizzes: Array<{
    quizId: number;
    moduleId: number | null;       // NULL for final
    type: "module" | "final";
    bestScore: number | null;       // 0-100, NULL if never attempted
    passed: boolean;                // best attempt's passed flag
    attemptCount: number;
  }>;
  finalProject: {
    submitted: boolean;
    approved: boolean;              // approvedAt IS NOT NULL
  };
  certificate: {
    issued: boolean;
    uuid: string | null;
    issuedAt: string | null;
  };
}
```

This is the page-load endpoint for `/learn` — one round-trip surfaces everything the dashboard needs.

### Group 3 — Quizzes (authenticated)

#### `GET /api/course/quizzes/:quizId`
Quiz definition + questions WITHOUT correct answers. Server never leaks `correct_option` until after the user submits (then it's in the attempt review response).

**Auth:** `requireAuth`.
**Rate limit:** `generalLimiter`.
**Response:** `200`
```ts
{
  id: number;
  moduleId: number | null;
  type: "module" | "final";
  passingPercentage: number;
  timeLimitMinutes: number | null;
  questionCount: number;
  questions: Array<{
    id: number;
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    order: number;
    // NO correctOption field, NO explanation field — leaked only post-submit
  }>;
}
```
**Errors:** `401`, `404`.

#### `POST /api/course/quizzes/:quizId/attempts`
Submit a quiz attempt. Server scores it.

**Auth:** `requireAuth`.
**Rate limit:** `writeLimiter`.
**Body:**
```ts
{
  startedAt: string;                       // ISO timestamp client recorded when quiz started
  answers: Record<string, "a" | "b" | "c" | "d">;  // { "<questionId>": "a", ... }
}
```
**Server validation:**
- Reject if `Object.keys(answers).length !== questionCount` → `422`
- Reject if any answer not in `['a','b','c','d']` → `422`
- For final exam (`time_limit_minutes` set): reject if `now - startedAt > timeLimitMinutes` → `422 TIME_EXPIRED`

**Response:** `201`
```ts
{
  attemptId: number;
  scorePercentage: number;        // 0-100
  correctCount: number;
  totalCount: number;
  passed: boolean;
  // Per-question review (now safe to leak correct answers + explanations):
  review: Array<{
    questionId: number;
    questionText: string;
    yourAnswer: "a" | "b" | "c" | "d" | null;
    correctAnswer: "a" | "b" | "c" | "d";
    correct: boolean;
    explanation: string | null;
  }>;
  bestScoreSoFar: number;          // user's best across all attempts on this quiz
}
```
**Errors:** `401`, `404`, `422`.

#### `GET /api/course/quizzes/:quizId/attempts`
List user's attempts on this quiz (history view).

**Auth:** `requireAuth`.
**Rate limit:** `generalLimiter`.
**Response:** `200`
```ts
{
  attempts: Array<{
    id: number;
    scorePercentage: number;
    correctCount: number;
    totalCount: number;
    passed: boolean;
    startedAt: string;
    completedAt: string | null;
  }>;
  bestScore: number | null;
}
```

### Group 4 — Final project (authenticated)

#### `POST /api/course/final-project`
Submit (or resubmit) the final project.

**Auth:** `requireAuth`.
**Rate limit:** `writeLimiter`.
**Body:**
```ts
{
  bookId: number;
  chapterIds: number[];   // exactly 3
}
```
**Server validation:**
- Verify the book belongs to the user → `404` else
- Verify exactly 3 chapter IDs and all belong to that book → `422` else
- Schema-level UNIQUE on user_id means re-submission is an UPSERT (DELETE + INSERT in a transaction) — preserves the "one project per user" invariant while letting users iterate

**Response:** `200` (existing or fresh)
```ts
{
  id: number;
  bookId: number;
  chapterIds: number[];
  submittedAt: string;
  approvedAt: string | null;
  hasAiFeedback: boolean;   // true if /feedback has run
}
```

#### `GET /api/course/final-project`
Current user's submission (or `null`).

**Auth:** `requireAuth`.
**Rate limit:** `generalLimiter`.
**Response:** `200`
```ts
{
  project: { id, bookId, chapterIds, submittedAt, approvedAt, aiFeedback: object | null } | null;
}
```

#### `POST /api/course/final-project/feedback`
Run the 4 AI analyses (plot holes, pacing, dialogue, voice) against the submitted chapters and store the structured output. **This is the AI-cost endpoint.**

**Auth:** `requireAuth`.
**Rate limit:** `aiLimiter` (per-min) + `tierAiLimiter` (daily AI budget). The 4 analyses count as 4 calls against the user's daily AI budget. We do NOT charge the marketplace monthly counter — course is free for all tiers.

**Body:** none (uses the user's submitted project).

**Server flow:**
1. Look up the user's `course_final_projects` row. `404` if no submission.
2. If `ai_feedback_json` already populated AND the request body has no `force: true`, return the cached feedback. Avoids accidental re-spend.
3. Otherwise: call the 4 analysis functions (extracted from `routes.ts:783` marketplace handler into a shared helper), compose the structured output, persist via UPDATE.
4. Return.

**Response:** `200`
```ts
{
  feedback: {
    plotHoles: { report: string; generatedAt: string };
    pacing:    { report: string; generatedAt: string };
    dialogue:  { report: string; generatedAt: string };
    voice:     { report: string; generatedAt: string };
  };
  cached: boolean;   // true if we returned existing feedback
}
```
**Errors:** `401`, `404` (no submission), `429` (daily AI budget exhausted), `500` (LLM failure).

### Group 5 — Certificate (authenticated + 1 public)

#### `POST /api/course/certificate/issue`
Issue certificate if eligible. **Idempotent** — second call returns the existing cert.

**Auth:** `requireAuth`.
**Rate limit:** `writeLimiter`.

**Server eligibility check (all four must be true):**
1. All 27 lessons completed (`COUNT(course_progress WHERE user_id) = 27`)
2. All 6 module quizzes have at least one passed attempt (`max(score_percentage) >= 70` per module quiz)
3. Final exam passed (`max(score_percentage) >= 75` on the final-type quiz)
4. Final project submitted (`course_final_projects` row exists for user)

**Response (success):** `201` first time, `200` if cert already exists
```ts
{
  uuid: string;             // public slug
  issuedAt: string;
  finalExamScore: number;
  pdfUrl: string | null;    // null until first GET /pdf
  alreadyIssued: boolean;   // true on second call
}
```
**Errors (eligibility failure):** `409 NOT_ELIGIBLE` with structured detail
```ts
{
  code: "NOT_ELIGIBLE";
  message: "Complete all course requirements before issuing certificate";
  missing: {
    lessonsCompleted: number;     // X / 27
    moduleQuizzesPassed: number;  // X / 6
    finalExamPassed: boolean;
    finalProjectSubmitted: boolean;
  };
}
```

#### `GET /api/course/certificate`
Current user's certificate (if issued).

**Auth:** `requireAuth`.
**Rate limit:** `generalLimiter`.
**Response:** `200` if issued, `404` if not yet
```ts
{
  uuid: string;
  issuedAt: string;
  finalExamScore: number;
  modulesCompletedAt: Record<string, string>;   // { "1": "2026-...", "2": "..." }
  pdfUrl: string | null;
}
```

#### `GET /api/certificates/:uuid`
**PUBLIC** — verification page payload. Anyone with the UUID can see who earned it.

**Auth:** none.
**Rate limit:** `publicReadLimiter`.
**Response:** `200`
```ts
{
  uuid: string;
  issuedAt: string;
  finalExamScore: number;
  holder: {
    displayName: string | null;
    avatarUrl: string | null;
    profileUrl: string;       // /authors/<userId> for clickthrough
  };
  // courseTitle is fixed for v1; eventually if we have multiple courses
  // this will branch by certificate type:
  courseTitle: "How to Write Your First Book";
}
```
Privacy note: we leak `displayName` + `avatarUrl` deliberately because that's the point of a shareable certificate. Email and other PII stay private.

**Errors:** `404` if uuid not found.

#### `GET /api/certificates/:uuid/pdf`
Generate (lazy) and serve the certificate PDF.

**Auth:** none (the UUID is the bearer token).
**Rate limit:** `publicReadLimiter`.
**Server flow:**
1. Look up cert by uuid.
2. If `pdf_url` populated, redirect or proxy that URL.
3. Else: generate PDF (using existing `pdfkit` or similar — PDF generation infrastructure exists in the codebase for book exports), upload to whatever blob storage the app uses (or render inline), persist `pdf_url`, then serve.

**Response:** `200` with `Content-Type: application/pdf`. Or `302 redirect` to a CDN URL if blob-stored.
**Errors:** `404` (uuid not found), `500` (generation failed).

> **Implementation note for Phase B:** PDF generation can be deferred to a follow-up if the blob-storage path is more involved than expected. The `pdf_url` column is nullable specifically so issuance is not blocked on PDF infra. **Decision point for you below.**

---

## Rate-limit strategy summary

| Endpoint group | Middleware stack | Rationale |
|---|---|---|
| Public catalog reads (`GET /api/course/modules`, `GET /api/course/lessons/:slug`) | `publicReadLimiter` | 60/min/IP — anti-scrape, pre-signup readers OK |
| Per-user reads (`GET /api/course/progress`, `GET /api/course/quizzes/:id`) | `requireAuth` + `generalLimiter` | 200/min/user |
| Per-user writes (`complete`, `submit attempt`, `submit project`, `issue cert`) | `requireAuth` + `writeLimiter` | 30/min/user |
| AI-cost endpoint (`POST /final-project/feedback`) | `requireAuth` + `aiLimiter` + `tierAiLimiter` | Per-minute spam guard + daily AI budget (4 calls per submission) |
| Public cert verification (`GET /api/certificates/:uuid`) | `publicReadLimiter` | 60/min/IP |
| Public cert PDF (`GET /api/certificates/:uuid/pdf`) | `publicReadLimiter` | 60/min/IP |

---

## Error code conventions

Standard HTTP + structured `code` field for ones the frontend branches on:

| Status | Code | Where |
|---|---|---|
| 400 | `VALIDATION_ERROR` (Zod) | bad input shape |
| 401 | (none — message only) | not authenticated where required |
| 404 | (none — message only) | resource not found |
| 409 | `NOT_ELIGIBLE` | certificate issuance fails the four-criteria check |
| 422 | `TIME_EXPIRED` | quiz submission past its time limit |
| 422 | `INVALID_ANSWERS` | answer count mismatch / illegal option |
| 422 | `BOOK_OWNERSHIP` | submitted bookId not owned by user |
| 422 | `CHAPTER_COUNT` | not exactly 3 chapter IDs |
| 422 | `CHAPTER_OWNERSHIP` | submitted chapterId not in submitted bookId |
| 429 | `AI_DAILY_LIMIT` (existing from `tierAiLimiter`) | daily AI budget exhausted |
| 429 | (rate limit message) | minute-burst caps |
| 500 | (generic) | unexpected error |

---

## Storage layer additions (preview)

New `IStorage` methods needed (add to `lib/db/scripts/seed-course.ts`'s sibling — i.e., `artifacts/api-server/src/storage.ts`):

```ts
// Catalog
getCourseModules(): Promise<CourseModule[]>;
getCourseModuleBySlug(slug: string): Promise<CourseModule | undefined>;
getCourseLessonsByModule(moduleId: number): Promise<CourseLesson[]>;
getCourseLessonBySlug(slug: string): Promise<CourseLesson | undefined>;
getAllCourseLessons(): Promise<CourseLesson[]>;   // for catalog endpoint and certificate eligibility

// Progress
getCourseProgressForUser(userId: number): Promise<CourseProgress[]>;
upsertLessonCompletion(userId: number, lessonId: number, timeSpentSeconds: number): Promise<CourseProgress>;

// Quizzes
getCourseQuiz(quizId: number): Promise<CourseQuiz | undefined>;
getCourseQuizQuestions(quizId: number): Promise<CourseQuizQuestion[]>;
getModuleQuizForModule(moduleId: number): Promise<CourseQuiz | undefined>;
getFinalQuiz(): Promise<CourseQuiz | undefined>;

// Quiz attempts
recordQuizAttempt(insert: InsertCourseQuizAttempt): Promise<CourseQuizAttempt>;
getQuizAttemptsForUser(userId: number, quizId: number): Promise<CourseQuizAttempt[]>;
getBestQuizAttempt(userId: number, quizId: number): Promise<CourseQuizAttempt | undefined>;

// Final project
getFinalProjectForUser(userId: number): Promise<CourseFinalProject | undefined>;
upsertFinalProject(userId: number, bookId: number, chapterIds: number[]): Promise<CourseFinalProject>;
saveFinalProjectFeedback(userId: number, feedback: object): Promise<void>;

// Certificate
getCertificateForUser(userId: number): Promise<CourseCertificate | undefined>;
getCertificateByUuid(uuid: string): Promise<CourseCertificate | undefined>;
issueCertificate(userId: number, finalExamScore: number, modulesCompletedAt: object): Promise<CourseCertificate>;
setCertificatePdfUrl(uuid: string, pdfUrl: string): Promise<void>;
```

12+ new storage methods — proportional to the surface area. No changes to existing methods.

---

## Idempotency and edge cases worth flagging

1. **`POST /lessons/:id/complete`** — re-click safe. Implements as `INSERT ... ON CONFLICT (user_id, lesson_id) DO UPDATE SET time_spent_seconds = ...` so multiple completes update the time without erroring on the unique constraint.

2. **`POST /final-project`** — schema has `UNIQUE(user_id)`. Re-submission needs to either:
   - (a) UPSERT semantics: DELETE + INSERT in a transaction. Loses the AI feedback (resubmission means previous feedback is stale anyway).
   - (b) UPDATE-only: PATCH the existing row. Preserves AI feedback timestamp until `/feedback` is re-run.
   
   **Recommend (a)** — resubmission means new chapter IDs, so the prior feedback is for old content. Cleaner to nuke it.

3. **`POST /certificate/issue`** — schema has `UNIQUE(user_id)`. Second call returns existing cert with `alreadyIssued: true` (no error). Eligibility re-check on second call is unnecessary — once issued, always valid.

4. **Concurrent quiz submissions** — race when user double-clicks "Submit": two attempts created. Schema allows multiple attempts, so this is acceptable, but the frontend should disable the button after click. No backend dedup needed.

5. **Final project AI feedback caching** — by default, second call to `/feedback` returns the cached `ai_feedback_json`. Frontend "regenerate feedback" button would send `{ force: true }` body to bypass cache and burn another 4 AI calls.

---

## Open decisions (require your input before Phase B)

### D1. Public lesson reading (no auth)
Currently designed: anyone can read lesson content without signing up. **Pro:** SEO + marketing — Google can index lesson titles + content (high-value SEO surface). Plotzy's organic acquisition stays open.
**Con:** Reduces signup pressure. Free users can consume the entire course content without ever creating an account.

**Recommend:** keep public. The progress-tracking + quizzes + cert + final project all require auth, which is enough conversion incentive.

### D2. Final project AI feedback charging
**Recommend:** charges daily AI budget (`tierAiLimiter`), does NOT charge marketplace monthly. Confirm.

### D3. PDF generation in this batch?
**Recommend: defer.** Issue the cert without a PDF URL (column already nullable). Add `GET /:uuid/pdf` as a lazy generator in a follow-up batch — PDF generation infrastructure decisions (pdfkit vs server-rendered HTML→PDF, where to store the blob) are bigger than they look. The shareable cert URL `/certificates/<uuid>` works as a web page in the meantime.

### D4. Final project submission — UPSERT or PATCH?
**Recommend (a) UPSERT** — re-submitting wipes prior AI feedback since it's for old content. Confirm.

### D5. Narrative-analysis helper extraction
**Correction (post-implementation audit, F1–F3):** the original write-up below misidentified the source. The 4 narrative analyses (plot holes, pacing, dialogue, voice) do **not** live in `/api/marketplace/analyze` — that endpoint serves 8 unrelated editorial services (dev-editor, copy-editor, blurb-writer, etc.). The 4 analyses already exist as 4 separate per-book endpoints:

- [routes.ts:2122](artifacts/api-server/src/routes.ts#L2122) `/api/books/:bookId/ai/plot-holes`
- [routes.ts:2153](artifacts/api-server/src/routes.ts#L2153) `/api/books/:bookId/ai/dialogue-coach`
- [routes.ts:2184](artifacts/api-server/src/routes.ts#L2184) `/api/books/:bookId/ai/pacing`
- [routes.ts:2221](artifacts/api-server/src/routes.ts#L2221) `/api/books/:bookId/ai/voice-consistency`

**Refactor scope:** extract the prompt + LLM-call + JSON-parse logic from those 4 handlers into `artifacts/api-server/src/lib/ai-analysis.ts` (matches the local naming convention next to `ai-tracker.ts`; the workspace-`lib/` path I originally proposed doesn't exist). Each per-book endpoint becomes a thin wrapper. The course `/final-project/feedback` endpoint composes the 4 helpers into one structured `aiFeedback` blob.

**Marketplace `/analyze` is NOT touched** — its 8 prompts are a different family (editorial services, not narrative critique). Bundling them in would be scope creep AND risk regressions in the marketplace bypass fix from `9f6f9d7`.

### D6. `requireEmailVerified` on writes?
For comments + publishing, the codebase enforces `requireEmailVerified`. For course writes (complete lesson, submit quiz)?

**Recommend:** NO. Course progress is per-user state with no spam vector. Forcing email verification just to mark a lesson complete adds friction. (`POST /final-project/feedback` has `tierAiLimiter` which is a stronger guard against abuse than email verification anyway.)

---

## Out of scope (Batch 1.3 + later)

- Frontend routes (Batch 1.3): `/learn`, `/learn/lesson/<slug>`, `/learn/quiz/<id>`, `/learn/final-project`, `/certificates/<uuid>`
- PDF generation (deferred)
- Quiz pool-based randomization (logged in discovered-issues)
- Course restart endpoint (logged in discovered-issues)
- Admin: review/approve final projects (no admin endpoint in Batch 1.2)
- Multi-course support: schema has no `course_id` field — assumes one course at a time. If we add a second course later, schema change needed.
- Email notifications (cert issued, final project approved)
- Analytics: track quiz pass rates, lesson dropoff

---

## Phase B preview (after your approval)

- **B1.2.a** — Shared analysis helper: extract the 4 prompts from `routes.ts:2122-2249` (the 4 per-book narrative-analysis endpoints) into `artifacts/api-server/src/lib/ai-analysis.ts`. Refactor those 4 endpoints to thin wrappers. **Marketplace `/analyze` is untouched.**
- **B1.2.b** — Storage layer: 12+ new methods in `storage.ts`.
- **B1.2.c** — Course routes module: new file `artifacts/api-server/src/routes/course.routes.ts`. ~14 endpoints.
- **B1.2.d** — Wire the router into `app.ts`.
- **B1.2.e** — Public certificate route: new file or fold into course.routes.ts (different prefix).
- **B1.2.f** — Discovered-issues additions for any new follow-ups.

Single commit OR split? **Recommend split** — at least: (refactor) → (storage) → (routes) → (wire-up) so each commit is reviewable. Confirm preference.

---

## Approval gate

Before Phase B, please confirm:

1. **Endpoint inventory** — 14 endpoints across catalog + progress + quizzes + project + cert. Anything missing or unwanted?
2. **D1 — Public lesson reads (no auth)?** Recommend: yes.
3. **D2 — AI charging on final-project feedback?** Recommend: daily AI budget, no marketplace counter.
4. **D3 — Defer PDF generation?** Recommend: yes; cert issued with `pdf_url = NULL`, build PDF lazily in a follow-up batch.
5. **D4 — Final project UPSERT semantics?** Recommend: (a) DELETE + INSERT, wipes prior AI feedback.
6. **D5 — Refactor analysis helper out of `routes.ts:783`?** Recommend: yes, in Phase B.
7. **D6 — Skip `requireEmailVerified` on course writes?** Recommend: yes.
8. **Phase B commit shape** — one big commit vs split (refactor / storage / routes / wire-up)? Recommend: split.

Awaiting your decisions before any Phase B code.
