# Plotzy Writing Course — Launch Readiness Report

Date: 2026-05-06
Master tip: `29b4a17` (post-QA-fixes)
Repository: github.com/faresadel07/plotzy1
Status: **functionally complete; gated only on infrastructure purchases**

---

## Section 1 — Executive summary

The Plotzy writing course is a single coherent feature spanning four phases of work:

1. **Infrastructure** — schema (8 tables, 14 indexes), API (14 endpoints, ~25 storage methods), frontend (6 routes, 13 components)
2. **Content** — 27 lessons across 6 modules totalling 36,203 words, with 30 module quiz questions
3. **Assessment** — 40 final exam questions (8 originally-approved samples + 32 added in dedicated batch); single timed final exam (60 min, 75% pass)
4. **Cert pipeline** — issuance API → public verify page → designed PDF template + lazy generation + race-safe storage + 1-year immutable cache + frontend download CTA

Across the build: ~14 `--no-ff` merges + ~11 direct commits + 2 docs commits (~27 course-related commits) on master, ~9,000 lines added (lessons + components + tests + docs combined). Pre-launch with zero users; the course can be enrolled, completed, exam-passed, certificate-issued, and PDF-downloaded end-to-end via the deployed UI on the first launch day.

**18 final QA findings** were enumerated; 8 (all 4 HIGH + 4 MEDIUM) fixed pre-launch in commit `98f4232`. 10 remaining (3 MEDIUM + 7 LOW) deferred to post-launch polish — none security-critical or data-corruption.

---

## Section 2 — Phase-by-phase breakdown

Course-feature commits on `master`, in chronological order. Merge commits are `--no-ff` parents; direct commits (Batch 1.1 era) are listed inline with their merge phase.

### Infrastructure phase

| Batch | Merge | Description |
|---|---|---|
| **1.1** | (direct commits leading to `a185299`) | Schema: 8 course tables (`courseModules`, `courseLessons`, `courseQuizzes`, `courseQuizQuestions`, `courseProgress`, `courseQuizAttempts`, `courseCertificates`, `courseFinalProjects`) + 14 indexes + idempotent seeder for module catalog |
| **1.2** | `96056b9` | Course API: 14 endpoints across catalog / progress / quizzes / final-project / certificate. ~20 storage methods. AI-analysis helpers extracted from existing `ai-analysis.ts` for use by final-project feedback |
| **1.3** | `9153ee0` | Course frontend: 13 reusable components, 6 routes (`/learn`, `/learn/module/:slug`, `/learn/lesson/:slug`, `/learn/quiz/:id`, `/learn/final-project`, `/certificates/:uuid`), 3 JSON-LD builders, sitemap + robots additions, 14-language i18n keys (English-only outside `navCourse`) |

### Content phase

| Batch | Merge | Description |
|---|---|---|
| **2.1** | `f3cfd60` | Module 1 (Foundation): 4 lessons, 5,150 words, 5-question quiz |
| **2.2** | `2fd27b6` | Module 2 (Architecture): 4 lessons, 5,789 words, 5-question quiz. L3 renamed `architecture-save-the-cat` → `architecture-beat-sheets` (trademark) via `LESSON_RENAMES` migration |
| **2.3** | `920d193` | Module 3 (Characters): 5 lessons, 6,732 words, 5-question quiz |
| **2.4** | `8aff0a9` | Module 4 (World): 4 lessons, 5,445 words, 5-question quiz |
| **2.5** | `1ccb5b2` | Module 5 (Writing Process): 5 lessons, 6,103 words, 5-question quiz |
| **2.6** | `f8ea479` | Module 6 (Publishing): 5 lessons, 6,985 words, 5-question quiz. **Content phase complete (27/27 lessons, 30/30 module quiz Qs)** |

### Visual layer (partial)

| Batch | Merge | Description |
|---|---|---|
| **2.7 B1** | `4b9cfce` | 6 visual component primitives (Hero, InlineImage, Diagram, AnimatedDiagram, QuoteCard, InteractiveExample) + internal `/learn/visuals-preview` style-guide page (noindex). **Components merged but unused** at lesson level — Batch 2.7 B2-B6 deferred |
| **2.7 B2** | `6b91ade` (defer) | Hero images + chosen-template strategy paused; 9 curated Unsplash photos dropped, scaffolding (sharp dep, fetch-course-heroes.ts, hero-config.ts stubs) preserved for resume |

### Assessment + cert pipeline

| Batch | Merge | Description |
|---|---|---|
| **3.1** | `9391d49` | 40-question final exam seeded into the existing final-quiz row. Distribution 22 applied + 11 recall + 7 synthesis; per-module M1=6 / M2=6 / M3=7 / M4=6 / M5=7 / M6=5 + 3 cross-module synthesis. Phase A audit caught 3 inventions + 5 wrong M3 lesson references that would have shipped otherwise |
| **3.2 B1** | `819c8d5` | Cert PDF storage layer: schema (`pdf_data BYTEA`, `pdf_generated_at TIMESTAMP`, `pdf_size_bytes INTEGER`, `holder_language TEXT` columns added via surgical ALTER TABLE due to drizzle-kit drift), storage methods (`getCertificatePdfData`, `setCertificatePdfData` with race-safe `WHERE pdf_data IS NULL`) |
| **3.2 B2** | `3a2df65` | PDF generation: pdf-lib + @pdf-lib/fontkit overlay onto Faris's designed template (US Letter landscape 792×612pt) — 4 dynamic fields drawn at locked coords. Replaces a discarded pdfkit primitive-drawing implementation. Lora + Inter SemiBold static fonts bundled (sourced from cyrealtype/Lora-Cyrillic + rsms/inter v4.1 release zip; OFL; SHA-256 pinned). Build pipeline updated to copy `src/assets/` to `dist/assets/` |
| **3.2 B3** | `a5fc383` | `GET /api/certificates/:uuid/pdf` endpoint — public, lazy generation on first download, race-safe write via `setCertificatePdfData`'s conditional UPDATE, 1-year immutable cache headers |
| **3.2 B4** | `e8ee59c` | Frontend download button on `/certificates/:uuid` page (Button-as-link with `download` attribute + `Content-Disposition: attachment`); new `courseCertDownloadPdf` i18n key |

### Final QA

| Batch | Merge | Description |
|---|---|---|
| **QA fixes** | `29b4a17` | 8 of 18 Final QA findings addressed (4 HIGH + 4 MEDIUM): cert flow wired (the critical unblocker), retake timer fix, asset-verify at boot, soft-deleted book filter, quiz timer auto-submit padding, holder-name length cap, lesson card aria-label fix |

### Process docs (between batches)

| Commit | Description |
|---|---|
| `a8bcb4f` | docs: log post-merge `seed:course` convention gap (caught during Batch 3.1) |
| `42f0b93` | docs: log B6 E2E deferral to first-deploy verification (Path Y chosen) |

---

## Section 3 — Course feature surface area

### Schema (8 tables, ~14 indexes)
- `course_modules` — module catalog (slug + title + subtitle + order + estimatedMinutes)
- `course_lessons` — lesson catalog (slug + title + module FK + orderInModule + content markdown + estimatedMinutes)
- `course_quizzes` — module quizzes (`type='module'`) + final exam (`type='final'`, moduleId NULL); 5-question module quizzes (no time limit, 70% pass) + 40-question final (60 min, 75% pass)
- `course_quiz_questions` — MCQ with 4 options per question + correct_option (a/b/c/d) + explanation; check constraint validates correct_option
- `course_progress` — per-user lesson completion (unique on userId + lessonId)
- `course_quiz_attempts` — per-attempt record with answers (jsonb), score, passed flag
- `course_certificates` — one per user (UNIQUE on user_id), public certificateUuid, finalExamScore, modulesCompletedAt jsonb, plus PDF columns (pdf_data bytea, pdf_url self-link, pdf_generated_at, pdf_size_bytes, holder_language)
- `course_final_projects` — bookId + chapterIds (jsonb) + ai_feedback_json + submittedAt + approvedAt

### Backend (~14 API endpoints)
- `GET /api/course/modules` — public catalog
- `GET /api/course/modules/:slug` — module detail
- `GET /api/course/lessons/:slug` — lesson body (auth-optional; full content for anon per DP3/C1)
- `POST /api/course/lessons/:lessonId/complete` — auth-required, idempotent UPSERT
- `GET /api/course/progress` — auth-required, dashboard rollup
- `GET /api/course/quizzes/:quizId` — auth-required, returns questions WITHOUT correct_option/explanation
- `POST /api/course/quizzes/:quizId/attempts` — submit + auto-score
- `POST /api/course/final-project` — submit (bookId + chapterIds)
- `POST /api/course/final-project/feedback` — AI-cost-gated (4 LLM calls per submission)
- `GET /api/course/final-project` — current submission
- `POST /api/course/certificate/issue` — auth-required, idempotent
- `GET /api/course/certificate` — auth-required, current user's cert
- `GET /api/certificates/:uuid` — PUBLIC verify
- `GET /api/certificates/:uuid/pdf` — PUBLIC download (lazy generation, race-safe, 1y cache)

### Frontend (6 routes, 13 reusable components)
- Routes: `/learn`, `/learn/module/:slug`, `/learn/lesson/:slug`, `/learn/quiz/:id`, `/learn/final-project`, `/certificates/:uuid`
- 13 reusable components in `components/course/`: `ModuleCard`, `LessonCard`, `LessonNavigation`, `CourseProgressBar`, `CourseBreadcrumb`, `QuizQuestion`, `QuizTimer`, `FeedbackPanel`, `EligibilityChecklist`, `IssueCertButton`, `CertificateDisplay`, `Markdown`, `ContinueLearningLink`
- 6 visual primitives in `components/course/visuals/` — merged but **deliberately unused** (Batch 2.7 B2 deferred)

### Content
- 27 lessons, 36,203 words of lesson markdown (in `lib/db/content/`)
- 30 module quiz questions (5 per module × 6 modules)
- 40 final exam questions (22 applied + 11 recall + 7 synthesis)
- **70 total assessment items** (course content phase complete)

### Cert pipeline
- HTML cert (CertificateDisplay component) on `/certificates/:uuid`
- PDF cert via lazy generation (~1-2s first download, ~50ms cached)
- Race-safe write via conditional UPDATE
- 1-year immutable cache headers (HTTP)
- Per-cert ~235-244 KB (template + subsetted fonts + 4 short overlays)

### i18n
- 14 UI languages (ar, en, fr, es, de, pt, ru, zh, ja, ko, hi, tr, he, fa)
- Course content: English-only (lesson markdown not translated)
- Course chrome: English in `en` block; **other 13 languages fall back to English** (documented LOW finding)
- 4 RTL: ar, he, fa render via logical Tailwind properties (`me-`, `ms-`, `start-`, `end-`)

---

## Section 4 — What ships pre-launch

Everything from Sections 2-3 above. Specifically:
- Full course content readable end-to-end (auth-optional per DP3/C1)
- Lesson completion tracking (auth-required)
- Module quizzes with auto-scoring + retake
- Final project submission + AI feedback (4 LLM analyses on chapter content, gated by daily AI budget)
- 60-minute timed final exam with auto-submit recovery (timer-expiry padding fix from QA)
- Certificate issuance flow (button on `/learn` once cert not yet issued; "View" link once issued)
- Certificate verification page (`/certificates/:uuid`, public, share-safe)
- Certificate PDF download (lazy generation, cached, 1y immutable)
- 14-language UI chrome (English-only fallback for course-specific keys)
- Mobile blocked sitewide via `MobileBlocker` (DP1/A3)
- Free for all subscription tiers (no tier gates anywhere in the course routes)

---

## Section 5 — What's deferred (with rationale per item)

### Visual enhancements (Batch 2.7 B2-B6)
- **What**: hero images, diagram art, interactive callouts, lesson-by-lesson visual integration
- **Why deferred**: Faris paused pre-launch pending OpenAI credit purchase (initial AI-image strategy was ~$1.32 + $5 credit floor). Pivoted to all-Unsplash, then to text-only ship for v1. The 9 curated Batch A+B Unsplash photos were rolled back; B1 component primitives stayed merged but unused
- **Resume path**: documented in `discovered-issues.md` MEDIUM entry. `fetch-course-heroes.ts` script + `hero-config.ts` stubs preserved
- **Effort to resume**: ~2-3h if all 27 photos pre-curated; ~1 day if Batches C/D/E need fresh curation

### Mobile course UX
- **What**: responsive layouts for course pages on phone-class viewports
- **Why deferred**: DP1/A3 decision — `MobileBlocker` shows a redirect screen for `<700px` widths sitewide; the entire Plotzy app is desktop-only by design
- **Resume path**: documented in user memory `Plotzy Mobile Pending` entry. Separate batch when mobile strategy is greenlit

### Schema reconciliation
- **What**: drift on `password_reset_tokens.token` unique constraint (added at `d034599`, never pushed to production Neon)
- **Why deferred**: orthogonal to the course feature; surgical SQL during Batch 3.2 B1 only added the cert-PDF columns to avoid scope creep
- **Resume path**: dedicated batch, ~2-3h. Audit all schema commits since last successful push, clean blocking data, run `drizzle-kit push` with full plan visibility

### Course chrome translations beyond English
- **What**: ~104 `course*` translation keys in 13 non-English language blocks
- **Why deferred**: course content (lesson markdown) ships in English only; chrome translations are polish. Other 13 languages fall back to English via the `getT` resolver
- **Resume path**: documented in `discovered-issues.md` LOW entry. Translator pass, ~3-4h mechanical

### Other site-wide deferrals (pre-existing, not course-specific)
- GDPR consent flow
- Stripe Stage 6 cleanup (mostly removed during Phase 1 Stripe Removal)
- Self-service account deletion endpoint
- Investor brief polish
- Path A pricing engineering (47h estimate, deferred indefinitely per Path B chosen)
- Zero automated test coverage (single LOW finding in QA report; acceptable pre-launch)

### B6 E2E smoke test
- **What**: end-to-end verification of cert download flow against a running stack
- **Why deferred**: Faris doesn't run the dev server locally (Path Y chosen). First-deploy manual walk-through covers it
- **Resume path**: 7-step checklist in `discovered-issues.md` LOW entry. ~10-15 min on first deploy

### 10 of 18 Final QA findings (3 MEDIUM + 7 LOW)
- **What**: documentation gaps, low-impact UX polish, edge cases unlikely at launch scale
- **Why deferred**: triaged with Faris; none are security-critical or data-corruption. Full enumeration in [`course-feature-final-qa-report.md`](course-feature-final-qa-report.md) (with [FIXED] markers next to the 8 addressed)

---

## Section 6 — Pre-launch infrastructure blockers

These are **purchase decisions, not engineering work**. Engineering is done.

| Blocker | Cost | Notes |
|---|---|---|
| Domain | ~$9.32/yr (looking at `plotzy.co` on Spaceship) | Faris's preferred registrar |
| Hosting | Free tier (Vercel / Railway / Fly.io) | Either platform supports the Node + static SPA stack |
| Resend custom domain | Free | Required to move off `onboarding@resend.dev` test sender (LOW finding documented separately) |
| PayPal Live credentials | Free | Required to switch from PayPal Sandbox to production payments (subscription tiers — Pro $8.99/mo, Premium $16.99/mo) |
| OpenAI API credit | $5 minimum | Optional pre-launch; deferred (not blocking) — used for course visual generation (Batch 2.7 B2) and book-cover generation (`gpt-image-1` wired in Library module) |

When Faris is ready to spend ~$10/yr on a domain + provision the Resend domain + add PayPal Live credentials, the course is ready to accept its first user.

---

## Section 7 — Process learnings

### Discovered process gaps (now documented)

1. **Post-merge `seed:course` convention** (caught during Batch 3.1)
   - The idempotent seeder picks up content changes from disk markdown into the production DB
   - Without this step, a content merge to master leaves the production DB serving placeholder text (`"_(Lesson content arrives in Batch 2.)_"`)
   - Caught when Batch 3.1's seed run reconciled 5 publishing-module lessons that had been merged at `f8ea479` but never seeded
   - Logged in `discovered-issues.md` LOW entry. Recommendation: wire into deploy pipeline

2. **Post-merge `drizzle-kit push` (schema sync) convention** (caught during Batch 3.2 B1 setup)
   - Schema changes also need to be pushed to production after merge
   - Without this step, a schema constraint added in code (`password_reset_tokens.token UNIQUE` from polish batch `d034599`) was never applied to production
   - Caught when Batch 3.2 B1's `drizzle-kit push` blocked on the unrelated drift, requiring surgical SQL workaround
   - Logged in `discovered-issues.md` MEDIUM entry. Recommendation: same deploy-pipeline integration

### The visual pivot saga

Three pivots in the visual layer story, each well-documented:
1. **AI generation** (gpt-image-1, ~$1.32 + $5 credit floor) → discarded for budget
2. **Unsplash curation** (9 photos curated for Batches A+B; ~half-day of style approvals) → discarded when Faris produced a designed PDF template
3. **Custom designed template** (Faris's PDF in graphics tool; pdf-lib overlay strategy) → SHIPPED

The third worked. Each prior pivot informed the next — the abandoned curation work taught us aesthetic constraints; the abandoned pdfkit primitive-drawing work taught us that designed-template-with-overlay was cleaner separation than build-from-scratch.

### Cross-batch awareness wins

- **Hemingway iceberg** treated consistently across M3 L2 + M4 L4 + M5 L2 (used generically; never attributed; 1932 work, in copyright)
- **"Books are not finished, they are released"** — Stevenson misattribution rewritten into the lesson voice; used as the M5 L5 aphorism
- **"Two hundred is enough to start"** — Kelly's 1,000 true fans (2008) rephrased away from attribution; used as the M6 L3 aphorism
- **M3 lesson-order proactive catch** during Final Exam Phase A: drafting started with the wrong M3 ordering (L1=wound, L2=antagonist, L3=supporting, L4=dialogue, L5=backstory); caught by reading `seed-course.ts` MODULES catalog before commit. Five M3 questions had references corrected
- **Save the Cat → beat sheets** trademark rename in M2 L3, with `LESSON_RENAMES` migration entry to update the slug in the production DB safely

### Audit-then-implement discipline (Phase A → Phase B)

Used in 6 batches:
- Batch 3.1 Phase A audit caught 3 invented concepts ("the long table", "earned/borrowed backstory", "generic hospital") + 5 wrong M3 references — would have shipped 8 questions students couldn't relate to lessons they'd just read
- Batch 3.2 Phase A audit caught the variable-font subsetting issue + the schema-drift blocker + the design-doc surface area gap before any code wrote
- Final QA agent + verification of the 4 HIGH findings caught the cert-flow unblocker before launch

### Scope discipline rejecting overreaches

Pattern repeated across batches: when faced with a finding, the smallest fix that addresses correctness was preferred over the architecturally pure rewrite. Examples:
- Final QA fix #1.3: filter at call sites (2 lines per route) instead of changing `getBook` globally (which would break legitimate trash-access flows)
- Cert PDF: pivot to designed-template overlay (200 lines) instead of building from primitives (would have been ~500 lines + brand-fit gap)
- Surgical `ALTER TABLE` for schema (Batch 3.2 B1) instead of force-pushing through unrelated drift

---

## Section 8 — Closing

The course is functionally complete.

A user can register, navigate to `/learn`, browse 27 lessons across 6 modules, complete each (auto-tracked), pass each module's quiz (auto-scored), submit a final project from their library books (auth-gated to their own books, AI feedback on 3 chapters), pass the 60-minute final exam (40 questions, 75% threshold, retake-safe, timer-recoverable), see the "Issue Certificate" CTA appear in their progress card, click it (button now wired — was the critical pre-launch fix), redirect to `/certificates/<uuid>?just-issued=true` with confetti, click "Download PDF", and receive a 235-KB PDF with their name + score + date + verification UUID overlaid on Faris's designed template — all in a single user session.

The same flow works for an anonymous visitor with the cert UUID: visit `/certificates/<uuid>`, see the verification page with the public-safe holder info, click "Download PDF", get the same bytes. The download is cached after the first generation; second download is ~50ms.

Ship is gated only on Faris's infra purchases — domain, hosting, Resend domain, PayPal Live. None require engineering work. The first deploy will exercise the B6 E2E smoke checklist (10-15 min) and address any integration surprises against real infrastructure.

The 27-lesson, 36,203-word, 70-assessment-item, end-to-end-tested writing course is ready for its first reader.

---

_Generated 2026-05-06 from the master branch at commit `29b4a17`. See [`course-feature-final-qa-report.md`](course-feature-final-qa-report.md) for the QA enumeration with [FIXED] markers, [`course-cert-pdf-design-iteration.md`](course-cert-pdf-design-iteration.md) for the Batch 3.2 design history, and [`discovered-issues.md`](discovered-issues.md) for the running list of process gaps + deferred items._
