# Course Frontend Design — Batch 1.3

**Date:** 2026-05-05
**Branch:** `feat/course-batch-1-3-frontend` (will fork from master `96056b9`)
**Reference:** [course-api-design.md](course-api-design.md), [course-schema-design.md](course-schema-design.md), Batch 1.1 + 1.2 already on master.

---

## Reality check upfront

**Note on the SKILL.md reference:** the user's instructions include "Read /mnt/skills/public/frontend-design/SKILL.md before any component work." That path is the Anthropic Linux-sandbox skill mount and does not exist on this Windows machine — searched filesystem, no match. I substituted with a direct audit of the existing Plotzy frontend ([artifacts/plotzy/](artifacts/plotzy/)) to extract the actual design tokens / component patterns / i18n usage instead of inventing them. Findings inform every section below.

**Stack confirmed:**
- React 19 + Vite + Tailwind v4 (CSS variables via `@theme inline` in [index.css](artifacts/plotzy/src/index.css))
- Routing: **wouter** (NOT react-router-dom) — `<Switch>` / `<Route path="/x" component={Comp} />` / `useRoute()` / `useLocation()`
- State: `@tanstack/react-query` + `LanguageProvider` context
- UI: Radix UI primitives in [components/ui/](artifacts/plotzy/src/components/ui/) (Button, Card, Badge, Progress, Dialog, Accordion, Spinner, Avatar, Breadcrumb)
- SEO: existing `<SEO>` + `<JsonLd>` from prior batch ([components/SEO.tsx](artifacts/plotzy/src/components/SEO.tsx), [components/JsonLd.tsx](artifacts/plotzy/src/components/JsonLd.tsx))
- Layout: shared [components/layout.tsx](artifacts/plotzy/src/components/layout.tsx) wraps every page; Header/Footer are inline within it. **Pages use `<Layout>...</Layout>` + `<SEO>` inside.**
- i18n: `useLanguage()` returns `{ lang, setLang, t, isRTL }`. Translations are inline in [lib/i18n.ts](artifacts/plotzy/src/lib/i18n.ts) — one file with `translations: Record<Language, Record<string, string>>`. 14 UI languages.
- RTL: handled at the `<html dir="rtl">` level by the language-context — no per-component flip needed.
- Markdown: **no library installed.** [pages/marketplace.tsx:56-93](artifacts/plotzy/src/pages/marketplace.tsx#L56-L93) has an inline `SimpleMarkdown` parser (handles headings, blockquotes, lists, bold). Generalising that is the lowest-risk option.
- Confetti: [`canvas-confetti` is already installed](artifacts/plotzy/package.json) — perfect for the certificate moment.

**The MobileBlocker conflict — needs your call (DP1 below):** [MobileBlocker.tsx](artifacts/plotzy/src/components/MobileBlocker.tsx) blocks every viewport `< 700px` globally. It is wired into [App.tsx:296](artifacts/plotzy/src/App.tsx#L296) with no per-route bypass. Memory note from 16 days ago says "Plotzy currently blocks phones; mobile UX fix is a deferred follow-up." Your batch instructions say "Mobile-first per Faris's directive (Mobile Strategy Option A chosen earlier)." Those don't reconcile — see DP1.

---

# Part 1 — Routes

All 6 routes use the existing pattern: `<Layout>` wraps every page, `<SEO>` + `<JsonLd>` go immediately inside, content fills the rest. Lazy-loaded via `React.lazy()` in [App.tsx](artifacts/plotzy/src/App.tsx) (per the existing convention — only Home is eager).

### 1. `/learn` — Course landing (public, auth-optional)

- **Component:** `pages/learn.tsx`
- **Auth:** Public. Authenticated users see a dashboard variant (continue-where-left-off + progress %); anonymous users see a marketing variant (module preview grid + "Start the course" CTA pointing at signup).
- **Data:** `GET /api/course/modules` (always); `GET /api/course/progress` (authed users only).
- **Loading:** Skeleton — 6 placeholder module cards with `animate-pulse`. Match `bg-secondary` + `rounded-xl` from existing card pattern.
- **Error:** Inline error card "Couldn't load course. Please refresh." with retry button. No full-page takeover.
- **Empty (authed, no progress):** "You haven't started yet — pick a module to begin." with arrow-pointing-down to module 1.

### 2. `/learn/module/:slug` — Module overview (public)

- **Component:** `pages/learn-module.tsx`
- **Auth:** Public.
- **Data:** `GET /api/course/modules/:slug` (also returns the lesson list).
- **Loading:** Skeleton — module header (title/subtitle) shimmer + N lesson row placeholders.
- **Error:** 404 → render the `<NotFound>` page with helpful "Back to course" link. Other errors inline.
- **Empty:** Not applicable — every module has lessons (data invariant from seed).

### 3. `/learn/lesson/:slug` — Lesson player (public, auth-optional)

- **Component:** `pages/learn-lesson.tsx`
- **Auth:** Public; `myCompletion` enriched when authed.
- **Data:** `GET /api/course/lessons/:slug` (returns content + module info + prev/next + myCompletion).
- **Loading:** Skeleton — title + content paragraphs.
- **Error:** 404 → not-found. Other errors inline; content area shows a retry message.
- **Empty:** Not applicable — every lesson has placeholder content from Batch 1.1 seed (`_(Lesson content arrives in Batch 2.)_`).
- **Note:** Initial v1 ships placeholder lesson content from the seed; real markdown lands in Batch 2. The renderer must handle both gracefully.

### 4. `/learn/quiz/:id` — Quiz UI (auth required)

- **Component:** `pages/learn-quiz.tsx`
- **Auth:** Required. Use `ProtectedRoute(LearnQuiz)` wrapper from [components/protected-route.tsx](artifacts/plotzy/src/components/protected-route.tsx).
- **Data:**
  - `GET /api/course/quizzes/:id` (questions WITHOUT `correctOption`)
  - `POST /api/course/quizzes/:id/attempts` (on submit; returns review + bestScoreSoFar)
- **Loading:** Skeleton — question card placeholder. Single skeleton card, no list.
- **Error:** 404 → not-found. 401 → redirect to home with toast "Sign in to take quizzes" (this case shouldn't happen — `ProtectedRoute` handles it). 422 (validation) → highlight the offending field with inline message.
- **Empty:** Not applicable.
- **Persistence:** in-progress answers stored in `sessionStorage` under key `quiz:<id>:answers` (DP4).

### 5. `/learn/final-project` — Submission flow (auth required)

- **Component:** `pages/learn-final-project.tsx`
- **Auth:** Required. `ProtectedRoute(LearnFinalProject)`.
- **Data:**
  - `GET /api/course/final-project` (current submission, if any)
  - `GET /api/books?...` to populate the book picker (the user picks 1 book; that book's chapters then populate the chapter picker — needs 3 chapters)
  - `POST /api/course/final-project` (submit/resubmit)
  - `POST /api/course/final-project/feedback` (request AI analysis — costs 4 daily-AI hits)
- **Loading:** Skeleton — submission form fields shimmer.
- **Error:** 422 with structured codes (`CHAPTER_COUNT`, `CHAPTER_OWNERSHIP`) — surface inline at the relevant form field. 429 `AI_DAILY_LIMIT` — modal "You've used X/Y AI calls today; the analysis needs 4 free slots. Try again tomorrow or upgrade your plan."
- **Empty:** First-time view — "Submit 3 chapters for AI analysis" with empty form. Submitted-but-no-feedback view — "Get AI feedback" CTA. With-feedback view — show the 4-section panel (DP6).

### 6. `/certificates/:uuid` — Public verification (no auth)

- **Component:** `pages/certificate-verify.tsx`
- **Auth:** Public.
- **Data:** `GET /api/certificates/:uuid`.
- **Loading:** Skeleton — cert frame with shimmer in the holder row.
- **Error:** 404 → render full-page "Certificate not found" message with link back to course landing.
- **Empty:** Not applicable.
- **Special:** Includes "Verified" badge state (the cert is real if the API returned 200). On the path coming from the user issuing it for the first time, redirect-with-confetti.

### Sitemap & SEO summary

| Route | indexable? | Sitemap entry | Notes |
|---|---|---|---|
| `/learn` | ✓ | yes — high priority | landing |
| `/learn/module/:slug` | ✓ | yes — 6 entries (1 per module slug) | static catalog |
| `/learn/lesson/:slug` | ✓ | yes — 27 entries (1 per lesson slug) | high SEO value |
| `/learn/quiz/:id` | NO (`noindex`) | not in sitemap | requires auth, no public utility |
| `/learn/final-project` | NO | not in sitemap | requires auth |
| `/certificates/:uuid` | partial (`noindex`, follow) | not in sitemap | shareable but per-user; user-promoted via social, not crawled |

---

# Part 2 — Component Inventory

All new components live in [components/course/](artifacts/plotzy/src/components/course/) (new folder) unless noted. Naming uses PascalCase + `.tsx`. Every component is i18n-aware via `useLanguage()` and RTL-aware via the global `dir` attribute.

### Reusables (Commit 1)

| Component | Path | Purpose | Reuses |
|---|---|---|---|
| `Markdown` | `components/course/Markdown.tsx` | Render lesson markdown content. Generalised from [marketplace.tsx:56-93](artifacts/plotzy/src/pages/marketplace.tsx#L56-L93). Supports headings, blockquotes, lists, bold, links. | nothing — vanilla TSX |
| `ModuleCard` | `components/course/ModuleCard.tsx` | Card on /learn module grid. Title/subtitle/lesson count/estimated minutes/progress bar. | `Card`, `Progress`, `Badge` |
| `LessonCard` | `components/course/LessonCard.tsx` | Row on module overview. Title, est-minutes, completion checkmark. | `Card` (compact variant), Lucide icons |
| `ProgressBar` | `components/course/ProgressBar.tsx` | Tinted progress with a percentage label and optional caption. | `Progress` |
| `LessonNavigation` | `components/course/LessonNavigation.tsx` | Prev / next at the bottom of every lesson. Arrow-left / arrow-right per RTL. | `Button`, Lucide |
| `QuizQuestion` | `components/course/QuizQuestion.tsx` | Single question display with 4 radio options. Disabled / correct / incorrect states. | `RadioGroup` (Radix), `Card` |
| `QuizResult` | `components/course/QuizResult.tsx` | Post-attempt review. Score banner + per-question grid with green/red ticks + explanation reveal. | `Card`, `Badge`, Lucide |
| `QuizTimer` | `components/course/QuizTimer.tsx` | Countdown for time-limited quizzes (final exam). | `useEffect`, no UI lib |
| `FeedbackPanel` | `components/course/FeedbackPanel.tsx` | 4 collapsible sections (plot holes / dialogue / pacing / voice). Each sub-section renders the structured JSON from the helper. | `Accordion`, `Markdown` for narrative bits |
| `CertificateDisplay` | `components/course/CertificateDisplay.tsx` | The visual certificate. Used both on /certificates/:uuid (public) and inline on /learn after issuance. | none — custom rendering |
| `CourseBreadcrumb` | `components/course/CourseBreadcrumb.tsx` | Course → Module → Lesson breadcrumb. | `Breadcrumb` (existing primitive) |
| `IssueCertButton` | `components/course/IssueCertButton.tsx` | Self-contained CTA that pops the eligibility modal (or fires confetti + cert reveal on success). | `Dialog`, `Button`, canvas-confetti |
| `EligibilityChecklist` | `components/course/EligibilityChecklist.tsx` | The 4-criteria checklist surfaced when /certificate/issue returns 409. Lessons / module quizzes / final / project — green ticks for done, neutral for pending. | `Card`, Lucide |

13 components total in the reusables bucket.

### Page-specific helpers

These live next to their owning page (not exported from `components/course/`):
- `LearnLandingDashboard` (in `pages/learn.tsx`) — the auth'd-user variant of the landing page.
- `BookChapterPicker` (in `pages/learn-final-project.tsx`) — book + chapters picker form.

---

# Part 3 — State Management

**Pattern: React Query as the single source of truth for catalog/progress, with selective sessionStorage for in-flight UI.**

### React Query setup

- Existing `queryClient` in [lib/queryClient.ts](artifacts/plotzy/src/lib/queryClient.ts) — reuse, no changes.
- New query keys, all under the `["course", ...]` namespace:
  - `["course", "modules"]` — landing catalog (immutable for v1; `staleTime: Infinity`)
  - `["course", "module", slug]` — single module (immutable)
  - `["course", "lesson", slug]` — single lesson (immutable for v1; revisit when Batch 2 ships real content)
  - `["course", "progress"]` — per-user dashboard (`staleTime: 0`, refetch on window focus)
  - `["course", "quiz", id]` — quiz definition (immutable)
  - `["course", "quiz", id, "attempts"]` — attempt history (refetch after a new attempt)
  - `["course", "final-project"]` — current user's submission (refetch after submit/feedback)
  - `["course", "certificate"]` — current user's cert (refetch after issuance)
  - `["course", "certificate-public", uuid]` — public verification fetch (cache-forever; cert content never changes)

### Optimistic updates

- **Lesson complete (`POST /api/course/lessons/:id/complete`):** optimistic — flip the lesson's `myCompletion` to non-null immediately, bump the progress percentage. On failure, rollback + toast. The endpoint is idempotent (UPSERT) so retry is safe.
- **Quiz submit:** NOT optimistic — wait for the score response. Score reveal is the user's payoff moment.
- **Final project submit:** NOT optimistic — surface success toast after the round-trip.
- **Certificate issue:** NOT optimistic — the eligibility check is server-side; pre-issuing the cert UI before the response could mislead the user.

### sessionStorage usage (DP4)

- `quiz:<id>:answers` — user's in-progress quiz answers, persisted across tab refreshes within the session. Cleared on submit or after 1 hour of inactivity. **Not** localStorage — answers shouldn't survive into the next browser session.
- `quiz:<id>:startedAt` — ISO timestamp when the user opened the quiz (used for the time-limit logic on the final exam).

### Cache invalidation cascade

After successful `POST /lessons/:id/complete`:
- Invalidate `["course", "progress"]`
- Optimistically patch `["course", "lesson", currentSlug]` to add `myCompletion`

After successful `POST /quizzes/:id/attempts`:
- Invalidate `["course", "progress"]`
- Invalidate `["course", "quiz", id, "attempts"]`

After successful `POST /final-project`:
- Invalidate `["course", "final-project"]` and `["course", "progress"]`

After successful `POST /certificate/issue`:
- Invalidate `["course", "certificate"]` and `["course", "progress"]`
- Trigger confetti (DP5)

---

# Part 4 — SEO Integration

The existing prior-batch SEO scaffolding ([SEO.tsx](artifacts/plotzy/src/components/SEO.tsx), [JsonLd.tsx](artifacts/plotzy/src/components/JsonLd.tsx), [lib/seo-schema.ts](artifacts/plotzy/src/lib/seo-schema.ts)) covers per-page meta + JSON-LD. We extend it with course schemas.

### Per-page SEO

| Page | `<title>` | description | noindex |
|---|---|---|---|
| `/learn` | "How to Write Your First Book — Free 6-Module Course" | Marketing copy emphasizing free + 27 lessons + cert | no |
| `/learn/module/:slug` | "{module.title} — Plotzy Writing Course" | module.subtitle | no |
| `/learn/lesson/:slug` | "{lesson.title} — {module.title}" | first ~150 chars of lesson content (markdown-stripped) | no |
| `/learn/quiz/:id` | "Quiz — {module.title}" | n/a | **noindex** |
| `/learn/final-project` | "Final Project — Plotzy Writing Course" | n/a | **noindex** |
| `/certificates/:uuid` | "Course Certificate — {holder.displayName}" | "Verified completion of How to Write Your First Book" | **noindex** (per-user content) |

### JSON-LD additions to `lib/seo-schema.ts`

| Builder | Used by | Schema |
|---|---|---|
| `buildCourseSchema()` | `/learn` | `Course` — name, description, provider (Plotzy), educationalLevel: "Beginner", numberOfCredits: 0 (free), about |
| `buildLearningResourceSchema(lesson, module)` | `/learn/lesson/:slug` | `LearningResource` — name, learningResourceType: "Lecture", educationalLevel, isPartOf: Course |
| `buildEducationalCredentialSchema(cert, holder)` | `/certificates/:uuid` | `EducationalOccupationalCredential` (NOT `CredentialDocument`, which schema.org deprecated; the educational variant is the right one for course certs) — name, recognizedBy: Plotzy, dateCreated |
| `buildBreadcrumbSchema()` (already exists) | every course page | extend with course-aware paths |

### Sitemap additions

The existing sitemap is at [`artifacts/plotzy/public/sitemap.xml`](artifacts/plotzy/public/sitemap.xml) — verifying its existence in Phase B before drafting. Additions:
- `/learn` (priority 0.8, changefreq monthly)
- 6 × `/learn/module/<slug>` (priority 0.7, changefreq monthly)
- 27 × `/learn/lesson/<slug>` (priority 0.6, changefreq weekly — lesson content updates more often)
- Total: 34 new entries.

Slugs are static for v1 (no programmatic catalog fetch) — listed verbatim in the sitemap.

### `robots.txt`

Existing `robots.txt` likely permits `/`. Verify in Phase B that:
- `/learn/*` is allowed.
- `/certificates/*` is allowed (the public verification page should be crawlable when user shares).
- `/api/*` remains disallowed.

---

# Part 5 — Navigation Integration

### Header (`components/layout.tsx`)

Add one entry to `NAV_ITEMS` (currently 7 entries):

```tsx
const NAV_ITEMS = [
  { href: "/", key: "myLibrary" },
  { href: "/tutorial", key: "navTutorial" },
  { href: "/writing-guide", key: "navGuide" },
  { href: "/learn", key: "navCourse" },         // ← NEW
  { href: "/marketplace", key: "navMarketplace" },
  { href: "/library", key: "navCommunity" },
  { href: "/pricing", key: "navPro" },
  { href: "/support", key: "navSupport" },
];
```

Position is between "Writing Guide" and "Marketplace" — logical adjacency: guide → course → marketplace (services).

### i18n keys

Add `navCourse` to `lib/i18n.ts` for all 14 languages. Translations:

| Lang | Value | Lang | Value |
|---|---|---|---|
| en | "Course" | ar | "الدورة" |
| fr | "Cours" | es | "Curso" |
| de | "Kurs" | pt | "Curso" |
| ru | "Курс" | zh | "课程" |
| ja | "コース" | ko | "코스" |
| hi | "कोर्स" | tr | "Kurs" |
| he | "קורס" | fa | "دوره" |

(I'll verify the ar/he/fa translations against the existing in-file conventions when I write the code.)

### Mobile menu

Same array drives the mobile menu (Layout uses `NAV_ITEMS` for both). Adding the entry once covers both.

### Breadcrumb structure

Per-page breadcrumb via `<CourseBreadcrumb>`:

| Page | Crumbs |
|---|---|
| `/learn` | Home › Course |
| `/learn/module/:slug` | Home › Course › {ModuleTitle} |
| `/learn/lesson/:slug` | Home › Course › {ModuleTitle} › {LessonTitle} |
| `/learn/quiz/:id` | Home › Course › {ModuleTitle} › Quiz |
| `/learn/final-project` | Home › Course › Final Project |
| `/certificates/:uuid` | Home › Certificates › {uuid (truncated)} |

---

# Part 6 — Decision Points

## DP1. **Mobile support — three options**

The MobileBlocker conflict is the biggest unresolved question. [App.tsx:296](artifacts/plotzy/src/App.tsx#L296) renders `<MobileBlocker />` globally with no per-route bypass. Memory note from 16 days ago: "mobile UX is a deferred follow-up." Your batch instructions: "Mobile-first per Faris's directive (Mobile Strategy Option A)."

The directive name "Option A" suggests a prior decision exists, but I have no record of what A vs B vs C means. Three concrete options for this batch:

| Option | What ships | Risk | Effort |
|---|---|---|---|
| **A1** | Course routes bypass MobileBlocker (per-route exception in `App.tsx`); other pages still block. Course components written mobile-first. | Low — surgical change. | +2-3h for mobile responsive polish across 6 pages |
| **A2** | Lift MobileBlocker globally; the entire app is mobile-accessible. | High — the rest of the app's mobile UX is incomplete per the memory note. Risk of regressions on home, library, etc. | +10-20h to audit and polish the rest |
| **A3** | Defer mobile to a follow-up batch; ship desktop-only course pages now. | Lowest. Matches the existing "deferred mobile" memory. | 0 |

**Recommend A1.** The course is the most-shareable feature you're building — students will hit lesson links from phones immediately. A surgical bypass with mobile-first design ships the course mobile-ready without forcing a full-app audit. If "Option A" in the prior session meant "lift entirely" (A2), I'd push back: that's two batches of work that don't belong here.

## DP2. **Markdown rendering library**

Course lessons store markdown. No library installed. Options:

| | Approach | Pros | Cons |
|---|---|---|---|
| **B1** | Generalize the inline `SimpleMarkdown` from [marketplace.tsx:56-93](artifacts/plotzy/src/pages/marketplace.tsx#L56-L93) into `components/course/Markdown.tsx`. Currently handles `#`, `##`, `###`, `>`, `-`, `1.`, `**bold**`. | No new dep. Matches existing pattern. Already tested in production. | Doesn't support tables, footnotes, code blocks, links. Would need extension. |
| **B2** | Install `react-markdown` + `remark-gfm`. | Full markdown spec + GFM (tables, task lists, etc.). | +50KB gzipped. Two new deps. |

**Recommend B1 plus links + code block + inline code support** (~30 lines of additions to the marketplace parser). Lesson content from Batch 2 is unlikely to need tables or footnotes. If/when it does, swap to B2 then — the migration is one component file.

## DP3. **Anonymous lesson access UX**

The API allows anonymous reads of lesson content. UX question: what's the prompt density for unsigned users?

| | Approach | Pros | Cons |
|---|---|---|---|
| **C1** | Full content visible. "Mark complete" button replaced with "Sign in to track progress" CTA at end of lesson. Soft conversion. | Best for SEO. Best for sharing. Matches Phase A intent. | Lower conversion vs hard paywall. |
| **C2** | Show first 30% of content + paywall. | Higher conversion. | Hurts SEO (Google reads partial content). Contradicts Phase A "public catalog reads" decision. |

**Recommend C1.** Aligns with the API design (lessons are public for SEO) and the "free for all tiers" course directive. The conversion gate is on progress tracking + cert, which both require signup.

## DP4. **Quiz state persistence**

Where do in-flight quiz answers live so the user doesn't lose them on tab refresh?

| | Approach | Pros | Cons |
|---|---|---|---|
| **D1** | `sessionStorage` keyed by quiz id. Cleared on submit. | Survives accidental refresh. Doesn't leak across browser sessions. | Lost if browser closed. |
| **D2** | `localStorage`. | Survives across sessions — user can resume tomorrow. | Stale data buildup; weird UX if questions change between sessions. |
| **D3** | In-memory only. | Simplest. | Lost on any nav. |

**Recommend D1** plus a "Last activity" timestamp; if older than 1 hour, prompt before restoring. Good middle ground.

## DP5. **Quiz timer visibility**

Final exam has `time_limit_minutes = 60`. Module quizzes have no limit.

| | Approach | Pros | Cons |
|---|---|---|---|
| **E1** | Visible countdown for the final, none for module quizzes. Auto-submit at 00:00. | Industry standard. Server is the safety net (the route already enforces with 30s grace). | Test anxiety. |
| **E2** | No visible timer; server enforces silently. User finds out at submit if expired. | Lower-pressure UX. | Confusing — user submits a 90-min attempt and gets 422 TIME_EXPIRED. |

**Recommend E1**, with a 5-minute warning at the 55-min mark.

## DP6. **Final-project AI feedback display**

The `/feedback` response has 4 nested objects (plotHoles, dialogue, pacing, voice), each with different shapes. Display options:

| | Approach | Pros | Cons |
|---|---|---|---|
| **F1** | 4 collapsible accordion sections (one per analysis), all collapsed by default. User opens what they want. | Compact. Doesn't overwhelm. Matches Plotzy's accordion-heavy pricing/FAQ patterns. | Two clicks to read everything. |
| **F2** | All 4 expanded inline as long-scroll page. | Print-friendly. Read-everything mindset. | Wall of text on first view. |
| **F3** | Tabs (Plot Holes / Dialogue / Pacing / Voice). | Familiar pattern. | One-at-a-time read; user might miss content. |

**Recommend F1.** Closest match to existing UI patterns; print/share via PDF can be a follow-up.

## DP7. **Certificate celebration moment**

When `POST /certificate/issue` returns 201 (first issuance), what's the UX?

| | Approach | Pros | Cons |
|---|---|---|---|
| **G1** | Confetti + modal showing the cert preview + share buttons. User can close to navigate away. | Memorable payoff for a multi-week effort. `canvas-confetti` already installed. | Modal might frustrate users who want to print immediately. |
| **G2** | Inline cert appears below the issue button; soft scroll into view; quiet success. | Less celebratory but no modal friction. | Wastes the moment. |
| **G3** | Redirect to `/certificates/:uuid` with `?just-issued=true` flag triggering confetti there. | Keeps the cert page as the canonical view. Shareable URL is what users want anyway. | Two-page flow; loading state in between. |

**Recommend G3.** Redirect to the public verification page with `?just-issued=true` triggers confetti and "Share your cert" prompt. The shareable URL becomes the anchor — that's the artifact users care about.

---

# Phase B — Commit shape (after your approval)

7 commits proposed. Each is independently reviewable; nothing further blocks until DP1–DP7 are answered.

| # | Title | Rough size |
|---|---|---|
| 1 | `feat(course-frontend): add reusable course components` | 13 components, ~700-900 lines |
| 2 | `feat(course-frontend): add course landing + module overview pages` | 2 pages, ~300 lines |
| 3 | `feat(course-frontend): add lesson player` | 1 page + Markdown integration, ~250 lines |
| 4 | `feat(course-frontend): add quiz UI + result display` | 1 page + timer + sessionStorage, ~350 lines |
| 5 | `feat(course-frontend): add final project submission flow` | 1 page + 4-section feedback panel, ~400 lines |
| 6 | `feat(course-frontend): add public certificate verification + celebration` | 1 page + confetti redirect, ~200 lines |
| 7 | `feat(course-frontend): wire course into header nav, sitemap, robots, JSON-LD` | Layout edit + i18n keys × 14 langs + sitemap.xml + seo-schema.ts builders | ~150 lines |

Total: ~2350-2550 lines across 7 commits. Comparable to Batch 1.2's API surface.

---

# Approval gate

Before any code, please confirm:

1. **DP1 — Mobile strategy** (A1 surgical / A2 full-lift / A3 defer). Recommend A1.
2. **DP2 — Markdown rendering** (B1 generalize SimpleMarkdown / B2 install react-markdown). Recommend B1.
3. **DP3 — Anonymous lesson UX** (C1 full content + soft CTA / C2 partial paywall). Recommend C1.
4. **DP4 — Quiz answer persistence** (D1 sessionStorage / D2 localStorage / D3 in-memory). Recommend D1.
5. **DP5 — Quiz timer visibility** (E1 visible countdown / E2 silent server-side). Recommend E1.
6. **DP6 — Feedback display** (F1 accordion / F2 long-scroll / F3 tabs). Recommend F1.
7. **DP7 — Certificate celebration** (G1 modal / G2 inline / G3 redirect-with-confetti). Recommend G3.
8. **7-commit split** above acceptable, or different shape preferred?

Awaiting your decisions before any Phase B implementation.
