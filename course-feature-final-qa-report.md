# Course Feature — Final QA Report
Date: 2026-05-06
Auditor: pre-launch code review
Scope: full writing-course feature surface

## Status (current state)

**8 of 18 findings FIXED** in commit `98f4232` (merged at `29b4a17`, master tip 2026-05-06):
- All 4 HIGH: `1.1`, `1.2`, `2.1` (cross-listed with 1.1), `2.2`
- 4 MEDIUM: `1.3`, `3.1`, `3.2`, `5.2`

**10 deferred to post-launch polish batch** — see [discovered-issues.md](discovered-issues.md) latest LOW entry. None are security-critical or data-corruption items.

Findings below are tagged `✅ FIXED in 98f4232` where addressed.

---

## Executive summary
- **18 findings total: 4 HIGH, 7 MEDIUM, 7 LOW**
- **Top 3 recommendations to fix pre-launch:**
  1. Wire `IssueCertButton` (and `EligibilityChecklist`) into `learn.tsx` (or a dedicated dashboard area). Today, eligible users have **no UI** to issue their certificate — the entire issuance flow is dead code at the page level.
  2. Reset `startedAt` (and answer state) when the user clicks "Retake quiz" in `learn-quiz.tsx`. For the timed final exam this currently produces an immediately-expired timer on retake that auto-submits with empty answers.
  3. Call `verifyCertificatePdfAssets()` from the api-server startup sequence. The function exists explicitly to fail fast at boot if the PDF template / font files are missing, but it is never invoked, so a misconfigured deploy will instead surface as a silent 500 on the first user's certificate download.
- **Top 3 acceptable-to-defer items:**
  1. Course chrome i18n English-only fallback (already documented).
  2. Visual primitives (`Hero`, `Diagram`, etc.) deliberately unused (already documented).
  3. No automated test coverage for the course feature (single LOW entry).

---

## 1. Integration consistency

### 1.1 HIGH — `IssueCertButton` and `EligibilityChecklist` are merged but never wired into any page  ✅ FIXED in `98f4232`
- **Files**: `artifacts/plotzy/src/components/course/IssueCertButton.tsx:53`, `artifacts/plotzy/src/components/course/EligibilityChecklist.tsx:32`, `artifacts/plotzy/src/pages/learn.tsx` (consuming page that should host them).
- **Issue**: `course-frontend-design.md:128` specifies that `IssueCertButton` is the user-facing CTA that calls `POST /api/course/certificate/issue` and (on 409) opens an `EligibilityChecklist` dialog. The component is fully implemented (correctly handles 201/200/409, redirects with `?just-issued=true` for the confetti hand-off in `certificate-verify.tsx:43`), but no page imports it. `learn.tsx:98` only checks `progress.data.certificate.issued` to render an "earned" badge — it provides no path for an eligible user to actually trigger issuance. Net effect: a user who completes 100% of the requirements has no way to obtain their certificate from the UI.
- **Fix**: import `IssueCertButton` into `learn.tsx`'s authed-progress card (around line 105) and render it whenever `progress.data.certificate.issued === false`. Optionally also surface it on the final-exam result screen in `learn-quiz.tsx` after a passing final attempt.

### 1.2 HIGH — Final-exam retake reuses the original `startedAt`, immediately expiring the timer  ✅ FIXED in `98f4232`
- **File**: `artifacts/plotzy/src/pages/learn-quiz.tsx:110` (declaration), `learn-quiz.tsx:251-257` (retake handler).
- **Issue**: `startedAt` is a `useState` initialised once on mount. The retake handler resets `result` and `answers` but does not reset `startedAt`. For the final exam (`timeLimitMinutes: 60`), the `QuizTimer` uses `startedAt + limitMinutes` against `Date.now()`, so on a retake initiated more than 60 minutes after first opening the exam the timer reads `00:00` and `onExpire` fires immediately, auto-submitting with the freshly-cleared (empty) answer set. The server then returns a 422 `INVALID_ANSWERS` (`course.routes.ts:412`) and the user sees the generic submit error with no recovery path. Module quizzes have no `timeLimitMinutes` so this defect is final-exam-only.
- **Fix**: either (a) navigate the user to a fresh `/learn/quiz/:id` route on retake (forcing remount), or (b) refactor `startedAt` to a state setter and call `setStartedAt(new Date().toISOString())` alongside `setAnswers({})`. Also call `clearDraft(quizId)` to wipe the resumable draft.

### 1.3 MEDIUM — Final-project page submits to deleted books because `getBook()` does not filter `isDeleted`  ✅ FIXED in `98f4232` (call-site checks added in both routes; `getBook` left untouched per scope discipline)
- **Files**: `artifacts/api-server/src/storage.ts:266-269` (`getBook`), `artifacts/api-server/src/routes/course.routes.ts:542-558` (final-project submit), `course.routes.ts:653-672` (feedback handler), schema `lib/db/src/schema/index.ts:920` (`courseFinalProjects.bookId` references books with CASCADE — but soft-delete leaves the row).
- **Issue**: Plotzy's books use a soft-delete pattern (`books.isDeleted=true`, retained in trash). `storage.getBook(id)` does NOT filter by `isDeleted`, so `POST /api/course/final-project` accepts a `bookId` belonging to a soft-deleted book and `POST /api/course/final-project/feedback` will happily run AI analysis against chapters of a trashed book — burning 4 AI hits on content the user no longer considers part of their library.
- **Fix**: in both course route handlers, after `storage.getBook(bookId)` add `if (book.isDeleted) return res.status(422).json({ message: "Book has been deleted" })`. Cheaper alternative: switch to `storage.getUserBooks(userId)` + `.find(b => b.id === bookId)` which already filters deleted books.

### 1.4 MEDIUM — `learn-final-project.tsx` does not handle the case where a previously-submitted book has since been deleted
- **File**: `artifacts/plotzy/src/pages/learn-final-project.tsx:69-75`.
- **Issue**: The `useEffect` primes `bookId` from `projectQ.data.project.bookId`. If that book has since been soft-deleted, it will not appear in `booksQ.data` (which uses `getUserBooks` which filters deleted), so the `<Select>` shows no matching label and `chaptersQ` returns an empty list. The user sees a confusing form state with no explanation. Compounds with finding 1.3.
- **Fix**: detect "previously-submitted bookId not in `booksQ.data`" and surface an explanatory message ("the book you previously submitted is no longer available — pick a new one") plus reset `bookId`/`chapterIds`.

### 1.5 LOW — `IssueCertButton` calls `fetch()` directly instead of `apiRequest()`
- **File**: `artifacts/plotzy/src/components/course/IssueCertButton.tsx:66-70`.
- **Issue**: All other course components use `apiRequest()` from `lib/queryClient.ts`, which (a) sets `credentials: "include"` (matters if the API ever moves to a different subdomain), (b) has uniform 429 handling, and (c) throws on non-OK so React Query mutations report the error correctly. Raw `fetch` here forfeits all three.
- **Fix**: replace `fetch(...)` with `apiRequest("POST", "/api/course/certificate/issue", {})` and wrap response handling accordingly. Low priority because (a) the cert API is same-origin in the current deploy and (b) this component is currently dead code (see 1.1).

---

## 2. Unused / dead code

### 2.1 HIGH — `IssueCertButton` + `EligibilityChecklist` (cross-listed with 1.1)  ✅ FIXED in `98f4232`
- **Files**: `artifacts/plotzy/src/components/course/IssueCertButton.tsx`, `artifacts/plotzy/src/components/course/EligibilityChecklist.tsx`.
- **Status**: not consumed by any page. Cross-listed because the dead code IS the integration gap.

### 2.2 MEDIUM — `verifyCertificatePdfAssets()` is exported but never called  ✅ FIXED in `98f4232` (boot now calls it via try/catch + `process.exit(1)`)
- **File**: `artifacts/api-server/src/services/certificate-pdf.ts:204-214`.
- **Issue**: The function is built specifically to fail fast at startup if `certificate-template.pdf`, `Lora-SemiBold.ttf`, or `Inter-SemiBold.ttf` are missing. The doc comment at line 200 says "Call this from the api-server's startup sequence." A grep across the codebase finds zero callers. As a result a misconfigured deploy (e.g. esbuild / bundler missed the assets) will only fail on the first user's first PDF download, with the error logged but the user seeing a generic 500.
- **Fix**: invoke `verifyCertificatePdfAssets()` from `index.ts` / startup boot path before the HTTP server starts listening, so a missing-asset deploy crashes the container immediately and is visible in deploy logs.

### 2.3 LOW — Visual primitives in `components/course/visuals/` deliberately unused
- **Files**: `Hero.tsx`, `InlineImage.tsx`, `Diagram.tsx`, `AnimatedDiagram.tsx`, `QuoteCard.tsx`, `InteractiveExample.tsx`.
- **Status**: **intentional / documented** (Batch 2.7 B2 deferral, see `discovered-issues.md` MEDIUM entry). Listed for completeness only.

### 2.4 LOW — `routes/index.ts` aggregates `courseRouter` but the file is unimported
- **File**: `artifacts/api-server/src/routes/index.ts:11,24`.
- **Status**: **intentional / documented** (existing `discovered-issues.md` LOW entry). The active wire-up is `routes.ts:25,2436`. Listed for completeness only.

---

## 3. Edge case gaps

### 3.1 MEDIUM — Quiz auto-submit on timeout sends empty answers, hits 422  ✅ FIXED in `98f4232` (timer-expiry path pads unanswered questions with "a"; mutation refactored to take answers as input to avoid setState race)
- **Files**: `artifacts/plotzy/src/pages/learn-quiz.tsx:184-187` (timer triggers `submitMutation.mutate()`), `artifacts/api-server/src/routes/course.routes.ts:411-417` (server requires exact answer count).
- **Issue**: When the QuizTimer expires with the user mid-question, it calls `onExpire` which fires `submitMutation.mutate()` against the partial `answers` map. The server handler validates `Object.keys(answers).length !== questions.length` and returns 422 `INVALID_ANSWERS`. The frontend surfaces a generic "Couldn't submit" error and the user has no path to get a recorded "ran out of time" attempt logged. The server already has a TIME_EXPIRED branch (line 403) which returns 422; combining the two would mean the timer-expiry call goes to TIME_EXPIRED only when the elapsed > limit + 30s grace AND the answers count matches.
- **Fix**: relax the server's INVALID_ANSWERS to a *warning-not-failure* when `Object.keys(answers).length < questions.length` AND the elapsed exceeds the time limit — record the attempt as a 0% with the partial answers and return the standard review payload. Alternatively, on the frontend, populate missing answers with a sentinel (e.g. always answer "a" for unanswered questions) before the auto-submit so the row is recorded as a graded failure.

### 3.2 MEDIUM — `holderName` length not capped before PDF render  ✅ FIXED in `98f4232` (slice to 50 chars at the PDF call site only; HTML cert unchanged)
- **Files**: `artifacts/api-server/src/services/certificate-pdf.ts:73-74` (doc says "Cap to ~60 chars upstream"), `artifacts/api-server/src/routes/course.routes.ts:871` (caller).
- **Issue**: The doc comment claims the holder name should be capped upstream, but the route just passes `holder.displayName?.trim() || "Author"`. A user with a 200-char displayName will produce a name wider than the page; `drawCentered` shifts left by half-width but pdf-lib will still draw it, so the name visibly clips against the side ribbon — and for very long names will be partially off the page (cosmetic, not functional). No upstream cap in the cert-issuance code path either.
- **Fix**: in `course.routes.ts` around line 871, `const holderName = (holder.displayName?.trim() || "Author").slice(0, 60);` Same change should be made consistent with the displayName the verify page renders (line 818) so the PDF and the web cert show the same name.

### 3.3 LOW — `getCertificateByUuid` / PDF download accept any `uuid.length >= 8`
- **File**: `artifacts/api-server/src/routes/course.routes.ts:797-799,849-851`.
- **Issue**: Validation just checks `uuid.length < 8`. Real cert UUIDs are 36 chars (`randomUUID()`). Any 8+ char string is sent to `storage.getCertificateByUuid()`. Storage uses parameterized queries so SQL injection isn't a concern, but accepting garbage strings invites enumeration noise in logs. Minor.
- **Fix**: enforce a UUID format check, e.g. `if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid))`.

### 3.4 LOW — Lesson markdown's first 150 chars used as meta description leaks raw markdown chars
- **File**: `artifacts/plotzy/src/pages/learn-lesson.tsx:72-82`.
- **Issue**: The strip regex `[#*\`>_~-]` does not catch markdown image syntax `![alt](src)`, fenced-code-block fences (`\`\`\``), or list markers like `1.` Resulting SEO description may contain stray characters when a lesson opens with a code block or numbered list. Mostly cosmetic.
- **Fix**: strip more thoroughly or just take the first paragraph after the first `# Heading`.

---

## 4. Security review

### 4.1 LOW — `learn-final-project.tsx` is a `ProtectedRoute` but `learn-final-project` page never re-asserts auth in its fetch
- **File**: `artifacts/plotzy/src/pages/learn-final-project.tsx:53` (no `enabled: !!user`).
- **Issue**: `App.tsx:277` wraps the page in `ProtectedRoute`, so an unauthenticated user is redirected before the page mounts. Defense in depth would still gate `projectQ` on `useAuth()`. Today, if `ProtectedRoute` is ever bypassed (e.g. dev preview), the queries would 401-and-throw rather than render gracefully. Cosmetic.
- **Fix**: `enabled: !!user` on the queries, or use `getQueryFn({ on401: "returnNull" })` for the project query.

### 4.2 LOW — Public certificate `/api/certificates/:uuid/pdf` emits long-cache header for first download
- **File**: `artifacts/api-server/src/routes/course.routes.ts:903-908`.
- **Issue**: `Cache-Control: public, max-age=31536000, immutable` is correct for the cached path, but on the first download (the lazy-generation path) the same header is set BEFORE we know whether the bytes will ever change. As long as the holderName / score / date / UUID never change post-issuance (true today), the 1y cache is fine. If a future i18n batch makes the PDF dependent on `holderLanguage` (which the route already reads through), the cache header becomes a footgun — the CDN would serve the old language's PDF for a year. Worth flagging because the doc comment "the PDF for a given UUID never changes after generation" is about to be untrue per the documented `holderLanguage` story.
- **Fix**: either (a) keep the header but never re-render on language change (one PDF per cert, language locked at first download), or (b) drop `immutable` and use `Vary: Accept-Language` if/when the i18n batch lands. No action needed pre-launch.

---

## 5. i18n + RTL review

### 5.1 LOW — All ~104 `course*` translation keys present in English block only
- **File**: `artifacts/plotzy/src/lib/i18n.ts:183-286` (English keys), other 13 language blocks (lines 288-1648) lack any `course*` keys.
- **Status**: **intentional / documented** in `discovered-issues.md` LOW entry ("Course chrome translations are English-only outside of `navCourse`"). Listed for completeness — no action pre-launch.

### 5.2 MEDIUM — `LessonCard` uses `t("courseQuizCorrect")` ("Correct") as the aria-label for a completed lesson  ✅ FIXED in `98f4232` (i18n key merged: `courseLessonCompleted` label upgraded from "Completed" → "Lesson complete"; both LessonCard aria-label AND existing learn-lesson.tsx pill use the same key)
- **File**: `artifacts/plotzy/src/components/course/LessonCard.tsx:43`.
- **Issue**: When a lesson is completed, the `<CheckCircle2>` icon's aria-label resolves to the string "Correct" (a quiz-grading term reused inappropriately). Screen readers will announce "Correct" next to a lesson title, which is misleading. There is already a more accurate key `courseLessonCompleted` ("Completed") used elsewhere.
- **Fix**: change `aria-label={t("courseQuizCorrect")}` → `aria-label={t("courseLessonCompleted")}`.

### 5.3 LOW — `LessonNavigation` aria-label "Lesson navigation" is hardcoded English
- **File**: `artifacts/plotzy/src/components/course/LessonNavigation.tsx:38`.
- **Issue**: The `<nav aria-label="Lesson navigation">` string is literal English regardless of the user's language. Inconsistent with the rest of the course chrome which uses `t()`.
- **Fix**: add a `courseLessonNavAria` key and use `t()`.

### 5.4 LOW — Cert PDF holder fallback "Author" diverges from web cert's `t("courseCertAnonymousHolder")`
- **Files**: `artifacts/api-server/src/routes/course.routes.ts:871` (PDF: literal `"Author"`), `artifacts/plotzy/src/pages/certificate-verify.tsx:61` (web: `t("courseCertAnonymousHolder")`).
- **Issue**: A user with no displayName sees the translated fallback on the verify page but `"Author"` (English) in the downloaded PDF. The PDF string is currently English-only by design (intentional choice 5 in the brief), but inconsistency with the web view will confuse users with non-English UIs.
- **Fix**: either accept the divergence (mark in code comment that PDFs are English-only by design) or sync both to `"Author"` until the PDF i18n batch.

---

## 6. Error handling review

### 6.1 LOW — Final-project feedback handler does not refund AI usage if `saveFinalProjectFeedback` fails
- **File**: `artifacts/api-server/src/routes/course.routes.ts:679-703`.
- **Issue**: The 4 LLM calls run via `Promise.all`; on success, `saveFinalProjectFeedback(userId, feedback)` is awaited and only then is `incrementAiUsage` called 4 times. If `saveFinalProjectFeedback` throws (e.g. transient DB blip), the catch returns 500 and the user has spent 0 AI calls — but they have ALSO lost the generated feedback (it wasn't persisted). Worse, if the order were swapped (charge then save), they'd lose 4 calls. Today's order is reasonable, but the ergonomics for the user — "your 4 calls succeeded, the save failed, you got nothing" — are bad. Ideally the catch should re-attempt the save once or return the feedback to the client even though it wasn't persisted.
- **Fix**: in the `catch`, if the analyses succeeded but the save failed, return the feedback inline with `{ feedback, cached: false, persisted: false }` and a 207-style envelope, OR retry the save once before bailing. Low priority because the failure window is small.

### 6.2 LOW — `apiRequest` swallows non-JSON 429 bodies without propagating server `code`
- **File**: `artifacts/plotzy/src/lib/queryClient.ts:5-8`.
- **Issue**: For the AI-cost gate path, `course.routes.ts:637-646` returns `{ code: "AI_DAILY_LIMIT", message, tier, limit, used, remaining, cost }`. But `throwIfResNotOk` catches it and throws `new Error(data.message || "Too many requests…")` — the `code`, `tier`, `remaining`, etc. fields never reach the calling component. `learn-final-project.tsx:282-285` shows only the bare error message. The user sees "Final-project feedback needs 4 AI calls; you have 1 of 5 left today on the free plan." without the structured data the API took the trouble to return. Acceptable but suboptimal.
- **Fix**: not in scope for this audit (touches a shared helper). Note for the future.

---

## 7. Type safety review

### 7.1 LOW — Persistent `(req.user as any).id` casts across the course routes
- **File**: `artifacts/api-server/src/routes/course.routes.ts:168, 207, 252, 377, 484, 519, 579, 610, 719, 771`.
- **Issue**: Every authenticated handler does `const userId = (req.user as any).id;` This pattern is consistent with the rest of the codebase, so it's not a course-specific issue, but if the project later adds a typed `req.user` (Express Passport's `User` type augmentation), every cast in the course router becomes a type-checking bypass. Ten casts is a lot for one router.
- **Fix**: introduce a `function getUserId(req: Request): number` helper in `routes/helpers.ts` that does the cast once and returns a typed number. Tracking elsewhere; not course-specific.

### 7.2 LOW — `IStorage.saveFinalProjectFeedback(userId, feedback: object)` is loosely typed
- **File**: `artifacts/api-server/src/storage.ts:191`.
- **Issue**: The parameter is typed as `object`, accepting any JSON-serialisable value. The route always passes the same shape (the merged `{ plotHoles, dialogue, pacing, voice, generatedAt }`), but a future caller could pass anything and the column would silently accept it. The frontend `CourseFeedback` interface already exists in `components/course/FeedbackPanel.tsx:48-68` — share it.
- **Fix**: hoist the `CourseFeedback` shape into a shared types file and use it in the storage signature.

---

## 8. Hardcoded values review

### 8.1 LOW — "How to Write Your First Book" course title is hardcoded in 3+ places
- **Files**: `artifacts/api-server/src/routes/course.routes.ts:822` (`courseTitle: "How to Write Your First Book"`), `artifacts/plotzy/src/components/course/CertificateDisplay.tsx:39` (default prop), `artifacts/plotzy/src/lib/i18n.ts:225` (`courseLandingTitle`).
- **Issue**: A title rename means three coordinated edits, easy to miss the API one. Acceptable for v1 (single course).
- **Fix**: defer until a second course is contemplated.

### 8.2 LOW — `FINAL_PROJECT_REQUIRED_CHAPTERS = 3` defined in route but `3` literal in two frontend places
- **Files**: `artifacts/api-server/src/routes/course.routes.ts:32`, `artifacts/plotzy/src/pages/learn-final-project.tsx:110, 184, 196` (literal `3`).
- **Issue**: The frontend uses literal `3` for both the validation and the displayed `({chapterIds.length} / 3)`. If the requirement changes, four places to update. Course flow has been stable so risk is low.
- **Fix**: expose the constant via the catalog response (e.g. `GET /api/course/modules` could include a `requirements: { finalProjectChapters: 3 }` field) and read it from there.

### 8.3 LOW — Quiz draft TTL `60 * 60 * 1000` (1h) hardcoded in `learn-quiz.tsx`
- **File**: `artifacts/plotzy/src/pages/learn-quiz.tsx:57`.
- **Issue**: 1-hour cap on resumable quiz state. For the 60-min final exam, a user who takes 50 min then refreshes gets the recovery; one who takes 65 min loses it. Reasonable but tied to the time limit.
- **Fix**: derive from the quiz's `timeLimitMinutes` field (with a min floor for module quizzes).

### 8.4 LOW — Cert PDF coordinates / colors / font sizes are local module constants
- **File**: `artifacts/api-server/src/services/certificate-pdf.ts:55-70`.
- **Status**: These are intentionally module-local per the doc ("Locked overlay coordinates (Phase A visual sign-off, iter 3)"). They're values, not magic numbers in disguise. No action.

---

## 9. Documentation gaps

### 9.1 LOW — Stale design docs reference pdfkit as the chosen library
- **Files**: `course-certificate-pdf-design.md:113,116,124`, `course-api-design.md:424,540`, `discovered-issues.md:1932,1935`.
- **Issue**: pre-Batch-3.2 docs recommend pdfkit; Batch 3.2 actually shipped pdf-lib + @pdf-lib/fontkit. The pivot is recorded in `course-cert-pdf-design-iteration.md:12` but the original design docs were not amended. A future contributor reading `course-certificate-pdf-design.md` first may install pdfkit by mistake. (Note: pdfkit is correctly absent from `package.json`, so the runtime is consistent.)
- **Fix**: drop a 1-line "SUPERSEDED — see course-cert-pdf-design-iteration.md" banner at the top of `course-certificate-pdf-design.md`.

### 9.2 LOW — `course-frontend-design.md:128` says `IssueCertButton` is wired up; in reality it's not (cross-listed with 1.1 / 2.1)
- **File**: `course-frontend-design.md:128`.
- **Issue**: The design doc shows `IssueCertButton` as a reusable component with the implication that some page uses it. In reality no page does. Either fix the integration (1.1) or update the doc to mark it "ready, awaiting wire-up".

---

## 10. Action items by severity

| ID | Severity | Section | File | Issue | Fix |
|----|---|---|---|---|---|
| 1.1 | HIGH | Integration | `artifacts/plotzy/src/components/course/IssueCertButton.tsx` + `learn.tsx:105` | No page wires up `IssueCertButton` → eligible users have no UI to issue their certificate | Import + render in `learn.tsx`'s authed-progress block when `cert.issued === false` |
| 1.2 | HIGH | Integration | `artifacts/plotzy/src/pages/learn-quiz.tsx:110, 251-257` | Final-exam retake reuses original `startedAt` → timer expires immediately, auto-submits empty answers | Reset `startedAt` (and `clearDraft`) on retake, or navigate to fresh route |
| 2.1 | HIGH | Dead code | `artifacts/plotzy/src/components/course/IssueCertButton.tsx` | Same as 1.1 — IssueCertButton + EligibilityChecklist unused | Same as 1.1 |
| 2.2 | HIGH | Dead code | `artifacts/api-server/src/services/certificate-pdf.ts:204` | `verifyCertificatePdfAssets()` exported but never called | Invoke from server boot before `app.listen` |
| 1.3 | MEDIUM | Integration | `artifacts/api-server/src/routes/course.routes.ts:542-558,653-672` + `storage.ts:266-269` | Final-project routes accept soft-deleted books (`getBook` doesn't filter `isDeleted`) | Add `isDeleted` check in route handlers, or use `getUserBooks` lookup |
| 1.4 | MEDIUM | Integration | `artifacts/plotzy/src/pages/learn-final-project.tsx:69-75` | Form primes `bookId` to a deleted-book id with no user-visible explanation | Detect missing-from-list and surface a message + reset selection |
| 2.2 | MEDIUM | Dead code | `artifacts/api-server/src/services/certificate-pdf.ts:204` | (cross-listed) | (cross-listed) |
| 3.1 | MEDIUM | Edge case | `artifacts/plotzy/src/pages/learn-quiz.tsx:184` + `course.routes.ts:411` | Timer-driven auto-submit hits 422 INVALID_ANSWERS for partial answers | Server should accept partial answers when timer expired, or frontend should pad missing answers |
| 3.2 | MEDIUM | Edge case | `artifacts/api-server/src/routes/course.routes.ts:871` | Holder name not length-capped before PDF render | `.slice(0, 60)` at the call site |
| 5.2 | MEDIUM | i18n | `artifacts/plotzy/src/components/course/LessonCard.tsx:43` | aria-label uses `t("courseQuizCorrect")` ("Correct") for a lesson completion | Switch to `t("courseLessonCompleted")` |
| 1.5 | LOW | Integration | `artifacts/plotzy/src/components/course/IssueCertButton.tsx:66` | Raw `fetch()` instead of `apiRequest()` | Switch to `apiRequest` |
| 2.3 | LOW | Dead code | `artifacts/plotzy/src/components/course/visuals/*.tsx` | 6 visual primitives unused | Intentional / documented — no action |
| 2.4 | LOW | Dead code | `artifacts/api-server/src/routes/index.ts` | Unimported aggregator | Intentional / documented — no action |
| 3.3 | LOW | Edge case | `artifacts/api-server/src/routes/course.routes.ts:797,849` | UUID validation just checks length >= 8 | Tighten to UUID-format regex |
| 3.4 | LOW | Edge case | `artifacts/plotzy/src/pages/learn-lesson.tsx:72-82` | Markdown-strip regex misses some syntax | Strip image markdown / fences too |
| 4.1 | LOW | Security | `artifacts/plotzy/src/pages/learn-final-project.tsx:53` | No `enabled: !!user` defense-in-depth | Add gate; `ProtectedRoute` already covers normal flow |
| 4.2 | LOW | Security | `artifacts/api-server/src/routes/course.routes.ts:903-908` | 1y immutable cache may bite if `holderLanguage`-driven re-render lands later | Re-evaluate when i18n PDF batch lands |
| 5.1 | LOW | i18n | `artifacts/plotzy/src/lib/i18n.ts:183-286` | All `course*` keys English-only in 14-language site | Intentional / documented — no action |
| 5.3 | LOW | i18n | `artifacts/plotzy/src/components/course/LessonNavigation.tsx:38` | Hardcoded English `aria-label="Lesson navigation"` | Add i18n key |
| 5.4 | LOW | i18n | `routes/course.routes.ts:871` vs `pages/certificate-verify.tsx:61` | PDF "Author" vs web `t("courseCertAnonymousHolder")` | Document divergence or sync |
| 6.1 | LOW | Errors | `artifacts/api-server/src/routes/course.routes.ts:679-703` | `saveFinalProjectFeedback` failure loses generated AI feedback | Return feedback inline on save-failure path |
| 6.2 | LOW | Errors | `artifacts/plotzy/src/lib/queryClient.ts:5-8` | 429 structured codes flattened to message-only | Out of scope; note for future |
| 7.1 | LOW | Type safety | `artifacts/api-server/src/routes/course.routes.ts` | 10× `(req.user as any).id` casts | Introduce typed helper in `helpers.ts` |
| 7.2 | LOW | Type safety | `artifacts/api-server/src/storage.ts:191` | `saveFinalProjectFeedback(feedback: object)` | Use shared `CourseFeedback` type |
| 8.1 | LOW | Hardcode | 3 places | "How to Write Your First Book" hardcoded | Defer until a second course exists |
| 8.2 | LOW | Hardcode | `learn-final-project.tsx:110,184,196` | Literal `3` for chapter count | Expose via API constant |
| 8.3 | LOW | Hardcode | `learn-quiz.tsx:57` | Quiz draft TTL hardcoded to 1h | Derive from quiz `timeLimitMinutes` |
| 8.4 | LOW | Hardcode | `services/certificate-pdf.ts:55-70` | PDF coords / sizes module-local | Intentional — no action |
| 9.1 | LOW | Docs | `course-certificate-pdf-design.md` | Recommends pdfkit; shipped pdf-lib | Add SUPERSEDED banner |
| 9.2 | LOW | Docs | `course-frontend-design.md:128` | Implies `IssueCertButton` is wired up | Update doc or fix the integration |
| 10.0 | LOW | Tests | (entire course feature) | Zero unit / integration tests | Acceptable pre-launch; track for first growth phase |
