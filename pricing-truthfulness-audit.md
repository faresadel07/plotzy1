# Pricing Page Truthfulness Audit

**Date:** 2026-05-04
**Master tip:** `628f7c1` (after fresh fix at `454db5d`)
**Scope:** Verify every advertised feature/limit on `/pricing` against actual code in
`artifacts/api-server/src` and `artifacts/plotzy/src`. 37 individual claims across
Free / Pro / Premium tiers. No code changes — audit only.

Source files of record:

- Pricing UI: `artifacts/plotzy/src/pages/pricing.tsx`
- Plan metadata: `artifacts/plotzy/src/lib/checkout-plans.ts`
- Tier limit constants: `lib/db/src/schema/index.ts:765-790`
- Tier gate helpers: `artifacts/api-server/src/lib/tier-limits.ts`
- AI rate-limit middleware: `artifacts/api-server/src/middleware/rate-limit.ts`

---

## 1. Executive Summary

| Verdict | Count |
|---|---|
| VERIFIED | 12 |
| PARTIAL | 7 |
| MISSING | 14 |
| AMBIGUOUS | 4 |
| **Total** | **37** |

**Two-line state:** The pricing page is heavily aspirational. The constants
`FREE_MAX_*`, `PRO_MAX_*`, `PREMIUM_MAX_*` exist and the helper module
`tier-limits.ts` defines a complete `TierLimits` interface — but the boolean
gates (`canExportPdf`, `canExportEpub`, `canUseAudiobook`, `canUseAdvancedAI`,
`canUseVersionHistory`) and most numeric limits (`maxBooks`,
`maxChaptersPerBook`, `maxPublishedBooks`, `maxAudiobookExportsPerMonth`,
`maxImagesPerDay`) are **defined but never read by any route handler**. Daily
AI count and monthly Marketplace count are the only tier limits actually
enforced. The "1 / 20 / Unlimited published books", "no PDF/EPUB for Free",
"no Audiobook for Free", "3 / 10 audiobook exports per month", and audiobook
voice count claims are all currently unenforced — Free users can hit the
endpoints today.

---

## 2. CRITICAL FINDINGS (MISSING claims, ordered by launch severity)

These are the launch blockers. A claim being unenforceable on the server is
the same as a lie — anyone with curl can bypass the frontend hide-logic.

### Severity 1 — Premium-only paid features that are not gated

1. **No "Premium-only" enforcement at all** (claim 31, 32, 33, 34, 35).
   `prioritySupport` and the higher numeric limits are never checked.
   Premium ($16.99/mo) buys nothing the API enforces beyond what Pro
   ($8.99/mo) gets, except: monthly Marketplace cap (9 vs 3) and daily AI
   cap (200 vs 100). Every other Premium-distinct claim (unlimited books,
   200 AI/day enforced, 10 audiobook exports, unlimited publishing,
   priority support, early access) has zero enforcement code.

2. **Audiobook export — claim 19 (3/mo) and 33 (10/mo).**
   `checkAudiobookLimit()` is defined at
   `artifacts/api-server/src/lib/tier-limits.ts:193-205` but is **never
   imported or called** anywhere. The `/api/books/:id/audiobook/export`
   route (`artifacts/api-server/src/routes.ts:2384`) only attaches
   `aiLimiter` (per-minute) and `tierAiLimiter` (daily AI count). A Pro
   user can export 100 audiobooks in a day until their daily AI count
   runs out; a Premium user can export 200. The advertised monthly caps
   (3 / 10) do not exist.

### Severity 2 — Pro features paid users expect but Free can also access

3. **PDF export — claim 13 ("No PDF/EPUB export" for Free) and 21 (Pro
   feature).** `canExportPdf` is defined in `tier-limits.ts:21,41,60,79`
   but is **never read**. The PDF endpoint
   (`artifacts/api-server/src/routes/books.routes.ts:492` inside
   `/api/books/:id/download?format=pdf`) only requires `requireBookOwner`.
   A Free user can download their book as PDF today.

4. **EPUB export — claim 13 / 21.** Same problem as PDF. EPUB endpoint at
   `artifacts/api-server/src/routes/books.routes.ts:741` (`format=epub`)
   has no tier check. `canExportEpub` is defined and unused.

5. **Audiobook studio for Free — claim 14 ("No Audiobook studio" for
   Free).** `canUseAudiobook` is defined (`tier-limits.ts:23,43,62,81`)
   but **never read**. Both
   `/api/books/:id/audiobook/preview` and `.../audiobook/export` routes
   (`routes.ts:2351`, `:2384`) only check ownership + AI daily cap. Free
   users CAN call these endpoints.

6. **AI Marketplace access for Free — claim 15 ("No AI Marketplace
   access").** `POST /api/marketplace/analyze` (`routes.ts:783`) does
   NOT call `checkMarketplaceLimit`. Only the *bookkeeping* endpoint
   `POST /api/marketplace/record` (`misc.routes.ts:1247-1257`) calls it.
   Result: Free users can call `/api/marketplace/analyze` directly with
   curl and never hit `/record`. The analysis itself is unrestricted —
   only client-side hides the page from Free.

7. **Book count limit — claim 1 (2), 16 (50), 31 (unlimited).** No
   enforcement anywhere. `maxBooks` is defined in `TierLimits` but
   `POST /api/books` (`books.routes.ts:102`) has no count check. Free
   users can create unlimited books today.

8. **Chapters-per-book limit — claim 1 (3), 16 (100), 31 (unlimited).**
   Chapter creation enforces a TOTAL chapter count via
   `getUserChapterCount(userId)` (chapters across ALL books) against
   `FREE_TRIAL_MAX_CHAPTERS = 3`, not chapters-per-book. So a Free user
   is capped at 3 chapters across their entire library — much harsher
   than advertised "3 chapters per book" (which suggests 2 books * 3
   chapters = 6). Pro and Premium have NO chapter limit enforced at
   all.
   Source: `chapters.routes.ts:43-56`,
   `storage.ts:324-330`.

9. **Published book limit — claim 5 (1), 20 (20), 34 (unlimited).** No
   enforcement. `POST /api/books/:id/publish` (`books.routes.ts:171`)
   has no `maxPublishedBooks` check. `maxPublishedBooks` field is
   defined and unused.

10. **AI cover generator front/back/SPINE — claim 23.** Spine is fiction.
    `api.books.generateCover.input` (`lib/shared/src/routes.ts:78`)
    is `z.enum(['front', 'back']).default('front')`. There is no
    "spine" code path. The schema column `spineColor`
    (`lib/shared/src/schema-types.ts:42`) is a manual user-picked color
    in the cover designer, not AI-generated.

11. **AI analysis tools — claim 24 (Pro-only).** The 4 endpoints exist
    (plot-holes, dialogue-coach, pacing, voice-consistency at
    `routes.ts:2088, 2119, 2150, 2187`) but use only `tierAiLimiter`
    (daily AI count). `canUseAdvancedAI` is defined and unused. Free
    users can call them.

12. **Word limit per tier — claim 2 (5,000), 17 (500,000), 31
    (unlimited).** Free's 5,000-word limit IS enforced
    (`chapters.routes.ts:97-110`) — but as a SINGLE-CHAPTER limit, not
    a total-across-all-chapters limit. "5,000 words total" is
    misleading. Pro & Premium have no word enforcement anywhere
    (`PRO_MAX_WORDS` and `PREMIUM_MAX_WORDS` are never imported by any
    route).

### Severity 3 — Aspirational claims with zero infrastructure

13. **Priority support (< 2 hour response) — claim 36.** No SLA system.
    `supportMessages` table has no priority field. Tickets are
    indistinguishable by tier in `/api/support/messages`,
    `/api/support/my-tickets`, `/api/support/tickets/:id/thread`
    (`misc.routes.ts:265-410`). `prioritySupport: true` for Premium is
    a dead config.

14. **Early access to new features — claim 37.** No feature-flag system
    exists. Grep for `featureFlag|earlyAccess|beta` returns zero
    matches. There is no admin-side flag table, no per-user beta
    toggle, no rollout group. The claim is pure marketing.

---

## 3. PARTIAL FINDINGS

### Free tier

- **Claim 1 — "2 books, 3 chapters per book."** PARTIAL: 3-chapter
  limit IS enforced (`chapters.routes.ts:48`), but as `userChapterCount`
  (across all books, not per-book). 2-book limit is not enforced at
  all. Net effect: Free user is capped at 3 chapters TOTAL — harsher
  per-book than advertised, with no book count cap.

- **Claim 2 — "5,000 words total."** PARTIAL: enforced per-chapter on
  PUT (`chapters.routes.ts:101`), not across the whole book or
  account. A Free user could in theory have multiple chapters each at
  exactly 5,000 words. (The 3-chapter cap dampens this in practice.)

### Pro tier

- **Claim 22 — "Audiobook studio with 10 AI voices."** PARTIAL/AMBIGUOUS:
  the studio UI exposes exactly 10 voices
  (`audiobook-studio.tsx:35-46`: nova, alloy, shimmer, onyx, echo,
  fable, coral, ash, ballad, sage). Backend
  `artifacts/api-server/src/lib/edge-tts.ts:31-51` has 16 voices (10
  "OpenAI personality" + 6 Arabic). Claim is technically true for the
  studio UI, but there is NO server-side tier gating on the audiobook
  endpoints, so the "10 AI voices" benefit is the same for Free. (See
  finding 5.)

- **Claim 18 — "100 AI assists per day (improve, expand, continue,
  translate)."** PARTIAL: daily count IS enforced via `tierAiLimiter`
  + `checkAiLimit` and `PRO_MAX_AI_CALLS_PER_DAY = 100`. But
  `tierAiLimiter` is attached to ~20 endpoints (image gen, blurb,
  translate, cover, voice, transcribe, all 4 analysis tools, plot
  proposal, marketplace analysis, audiobook preview/export, lore
  generate, chapters voice, legacy import). Each one of those debits
  the same daily counter. So "100 AI assists per day" really means
  "100 of any AI-flavored API call across a much wider surface than
  improve/expand/continue/translate." Calling `/audiobook/preview`
  consumes from the same 100. The wording overstates how generous it
  is.

- **Claim 25 — "3 AI Marketplace analyses per month."** PARTIAL: limit
  IS defined (`tier-limits.ts:65`) and `checkMarketplaceLimit` is
  called from `POST /api/marketplace/record`
  (`misc.routes.ts:1255`). But the actual `/api/marketplace/analyze`
  endpoint that does the LLM work (`routes.ts:783`) does NOT enforce
  this limit. It runs the analysis first; a malicious client can
  simply skip the bookkeeping `/record` call. Effectively
  unenforceable.

### Premium tier

- **Claim 32 — "200 AI assists per day."** PARTIAL: `PREMIUM_MAX_AI_CALLS_PER_DAY = 200`
  is enforced via `tierAiLimiter`. Same caveat as claim 18 about
  endpoint surface.

- **Claim 35 — "9 AI Marketplace analyses per month."** PARTIAL: same
  bypass as claim 25 (only `/record` enforces, not `/analyze`).

---

## 4. VERIFIED CLAIMS

These have a real working server-side enforcement OR a real working
implementation that matches the pricing copy.

| # | Claim | Evidence |
|---|---|---|
| 4 | AI book cover generator (Free) | `routes.ts:726`, `books.routes.ts:333-384`. Front + back endpoints work for any owner. |
| 6 | Basic cover designer | `pages/cover-designer.tsx` exists; manual layout/text/color picker, no AI required. |
| 7 | Community library access with likes | `social.routes.ts:262-298` (`POST/DELETE/GET /api/books/:bookId/like`). Comments via `bookComments` table (`schema/index.ts:393`). |
| 8 | Author profile page | `pages/author-profile.tsx` exists. |
| 9 | Follow authors & direct messaging | `social.routes.ts` has follow endpoints + `/api/messages/*` (lines 361-449). |
| 10 | Notifications center | `social.routes.ts:306-358` (`GET /api/notifications`, unread-count, mark-read, mark-all-read). |
| 11 | Ambient writing sounds | `components/AmbientSoundscape.tsx`, `lib/procedural-ambient.ts`. 12 presets. Available to all tiers — `canUseAmbientSounds: true` for Free, Pro, Premium. |
| 26 | Version history & auto-snapshots | `routes.ts:1360-1390` auto-snapshots on every chapter PUT. Manual save endpoint `routes.ts:1440`. List/restore/delete endpoints exist. 30-snapshot cap. (NOT tier-gated — ALL users including Free get snapshots.) |
| 27 | Story Bible & Research board | Lore endpoints `routes.ts:1646-1706`; Research endpoints `misc.routes.ts:1008-1062`. (NOT tier-gated — Free users have access too.) |
| 28 | Book collaboration | `misc.routes.ts:826-879` (invite + join), middleware `auth.ts:177` enforces collaborator access. (NOT tier-gated.) |
| 29 | Writing streaks, calendar & analytics | `storage.ts:558-590` (`updateWritingStreak`), `dailyProgress` table queries `storage.ts:210-237`, `userStats` table tracks streaks. |
| 30 | Voice dictation & transcription | `chapters.routes.ts:290-`; `routes.ts:1614-1625` (`POST /api/transcribe`). Whisper-based via Groq `whisper-large-v3-turbo`. |

---

## 5. AMBIGUOUS CLAIMS

- **Claim 12 — "45+ languages & RTL support."** AMBIGUOUS. The phrasing
  doesn't say UI vs book content. `BOOK_LANGUAGES` in `i18n.ts:3-49`
  has 45 entries (en + 44 others), 4 of which are RTL (ar, he, fa, ur,
  matching `RTL_LANGUAGES` at `i18n.ts:1`). `UI_LANGUAGES` has 14
  entries. The "45+" number is true ONLY for book-content language
  selection (genre tags / blurb / story translations). UI is 14
  languages. Recommendation: clarify the copy to "45 supported book
  languages and 14 UI languages" or pick the lower number for
  honesty.

- **Claim 11 — "Ambient writing sounds."** Verified the feature exists
  but ambiguous about "ambient" vs "writing." The 12 presets are real
  audio loops (rain, wind, ocean, thunderstorm, fireplace, crickets,
  birds, cafe, snow, train, white noise, brown noise) — generic
  ambient, not writing-specific. Fine, just slight marketing puffery
  on "writing".

- **Claim 24 — "AI analysis tools (plot holes, pacing, dialogue,
  voice)."** AMBIGUOUS in pricing context. The 4 endpoints exist and
  work — verified. But "Pro-only" is the implicit claim and that part
  is not enforced (see finding 11).

- **Claim 18 / 32 — "100 / 200 AI assists per day (improve, expand,
  continue, translate)."** AMBIGUOUS. The named actions debit the
  daily counter, but so do ~16 other AI endpoints. The phrasing
  implies those four specific actions get a 100 / 200-call budget.
  In reality the budget is shared with image gen, audiobook preview,
  marketplace analysis, etc. Recommendation: drop the parenthetical
  or expand it.

---

## 6. Per-Tier Detailed Audit

### 6.1 Free Tier

| # | Claim | Verdict | Evidence / Gap |
|---|---|---|---|
| 1 | 2 books, 3 chapters per book | PARTIAL | Book count limit not enforced at all (`books.routes.ts:102` has no check). Chapter limit IS enforced but as USER-TOTAL chapter count: `chapters.routes.ts:48` checks `getUserChapterCount(userId) >= FREE_TRIAL_MAX_CHAPTERS` (3). So Free users get 3 chapters across all books, not 3 per book × 2 books = 6. |
| 2 | 5,000 words total | PARTIAL | `chapters.routes.ts:101` enforces `wordCount > FREE_TRIAL_MAX_WORDS` PER UPDATED CHAPTER, not aggregate. Each chapter independently capped at 5,000 words. |
| 3 | 10 AI assists per day | VERIFIED | `tier-limits.ts:140-145` `checkAiLimit` against `FREE_MAX_AI_CALLS_PER_DAY = 10` (`schema/index.ts:769`). Wired via `tierAiLimiter` middleware on ~20 AI routes. |
| 4 | AI book cover generator | VERIFIED | `routes.ts:726` `POST /api/books/:id/generate-cover`, accessible to any book owner. |
| 5 | 1 published book in Community Library | MISSING | `POST /api/books/:id/publish` (`books.routes.ts:171`) does no `maxPublishedBooks` check. `incrementUserPublished` is bookkeeping only. `FREE_MAX_PUBLISHED_BOOKS = 1` is dead config. |
| 6 | Basic cover designer | VERIFIED | `pages/cover-designer.tsx` exists; pure-frontend manual designer. |
| 7 | Community library access with likes & comments | VERIFIED | `/api/public/books`, `/api/books/:bookId/like`, `bookComments` table + endpoints. |
| 8 | Author profile page | VERIFIED | `pages/author-profile.tsx`. |
| 9 | Follow authors & direct messaging | VERIFIED | `follows` table + `/api/messages/*` endpoints (`social.routes.ts:361-449`). |
| 10 | Notifications center | VERIFIED | `/api/notifications` family of endpoints (`social.routes.ts:306-358`). |
| 11 | Ambient writing sounds | VERIFIED | `components/AmbientSoundscape.tsx`. 12 presets. `canUseAmbientSounds: true` for Free. |
| 12 | 45+ languages & RTL support | AMBIGUOUS | `BOOK_LANGUAGES` = 45 entries (`i18n.ts:3-49`); `UI_LANGUAGES` = 14 (`i18n.ts:53-68`). RTL via `RTL_LANGUAGES` set. The "45+" is true only for book content language; UI is 14. |
| 13 | No PDF/EPUB export | MISSING | Free CAN export PDF and EPUB. `books.routes.ts:447-490` (txt), `:492` (pdf), `:741` (epub) have no tier check. `canExportPdf`/`canExportEpub` defined and unused. |
| 14 | No Audiobook studio | MISSING | Free CAN call `/api/books/:id/audiobook/preview` and `.../audiobook/export` (`routes.ts:2351, :2384`). Only `tierAiLimiter` (daily AI count) blocks them. `canUseAudiobook` defined and unused. |
| 15 | No AI Marketplace access | MISSING | Free CAN call `POST /api/marketplace/analyze` (`routes.ts:783`). The tier check is only on the bookkeeping `/record` endpoint. Bypassable by skipping `/record`. |

### 6.2 Pro Tier ($8.99/mo)

| # | Claim | Verdict | Evidence / Gap |
|---|---|---|---|
| 16 | 50 books, 100 chapters per book | MISSING | Same root cause as claim 1: book count never checked; chapter count enforced as user-total only (`getUserChapterCount`), and the 100-chapter Pro cap (`PRO_MAX_CHAPTERS_PER_BOOK`) is never checked at all. Pro users hit no limit. |
| 17 | 500,000 words | MISSING | `PRO_MAX_WORDS = 500000` is never imported by any route. Pro users have no word enforcement. (The Free 5K cap doesn't apply once subscribed because of `isSubscriptionActive(dbUser)` short-circuit at `chapters.routes.ts:99`.) |
| 18 | 100 AI assists per day (improve, expand, continue, translate) | PARTIAL | Daily count enforced (`PRO_MAX_AI_CALLS_PER_DAY = 100`). But the budget is debited by ~16 other AI endpoints, not just the four named. |
| 19 | 3 audiobook exports per month | MISSING | `PRO_MAX_AUDIOBOOK_EXPORTS_PER_MONTH = 3` is defined; `checkAudiobookLimit` is defined; **neither is wired**. Audiobook export route has no monthly cap. |
| 20 | 20 published books in Community Library | MISSING | Same as claim 5: no `maxPublishedBooks` check anywhere. |
| 21 | PDF & EPUB professional export | PARTIAL | The endpoints exist and work (`books.routes.ts:492` PDF, `:741` EPUB) — but they work for everyone including Free, so this is not actually a Pro perk. |
| 22 | Audiobook studio with 10 AI voices | PARTIAL | UI shows 10 voices (`audiobook-studio.tsx:35-46`). Backend supports 16 (10 + 6 Arabic). Audiobook studio is not Pro-gated, so "Pro perk" framing is false. |
| 23 | AI cover generator (front, back & spine) | MISSING | Only "front" and "back" supported (`lib/shared/src/routes.ts:78`: `z.enum(['front', 'back'])`). No spine endpoint or AI prompt for spine. The `spineColor` schema column is a manual color picker. |
| 24 | AI analysis tools (plot holes, pacing, dialogue, voice) | PARTIAL | All 4 endpoints exist (`routes.ts:2088, 2119, 2150, 2187`). But not Pro-gated server-side; `canUseAdvancedAI` defined and unused. |
| 25 | 3 AI Marketplace analyses per month | PARTIAL | Limit defined and checked in `/api/marketplace/record`, but the actual `/analyze` endpoint that does the LLM work doesn't check it. Bypassable. |
| 26 | Version history & auto-snapshots | VERIFIED (but not Pro-gated) | `routes.ts:1360-1390` auto-snapshots on chapter PUT for all users; 30-snapshot cap. `canUseVersionHistory` field is defined and unused. Free users get snapshots too. |
| 27 | Story Bible & Research board | VERIFIED (but not Pro-gated) | Lore: `routes.ts:1646-1706`. Research: `misc.routes.ts:1008-1062`. No tier check; Free can access. |
| 28 | Book collaboration (invite co-writers) | VERIFIED (but not Pro-gated) | `misc.routes.ts:826-879` (invite, join, list). No tier check; Free can invite. |
| 29 | Writing streaks, calendar & analytics | VERIFIED | `storage.ts:558-590` `updateWritingStreak`, `dailyProgress` table, `userStats`. |
| 30 | Voice dictation & transcription | VERIFIED | `routes.ts:1616` `POST /api/transcribe`, `chapters.routes.ts:290+` `POST /api/chapters/:id/voice`. Whisper via Groq. (Behind `tierAiLimiter` only — not Pro-gated.) |

### 6.3 Premium Tier ($16.99/mo)

| # | Claim | Verdict | Evidence / Gap |
|---|---|---|---|
| 31 | Unlimited books, chapters & words | MISSING | Premium technically has `PREMIUM_MAX_BOOKS = 9999`, `_CHAPTERS = 9999`, `_WORDS = 99999999` defined as ceilings — but since none of these are read by enforcement code, "unlimited" is true only because nothing is enforced for any tier. There is no Premium-distinguishing logic. |
| 32 | 200 AI assists per day | PARTIAL | `PREMIUM_MAX_AI_CALLS_PER_DAY = 200` IS enforced via `tierAiLimiter`. Same caveat as claim 18. |
| 33 | 10 audiobook exports per month | MISSING | `PREMIUM_MAX_AUDIOBOOK_EXPORTS_PER_MONTH = 10` defined, `checkAudiobookLimit` defined — neither wired into the export route. |
| 34 | Unlimited publishing to Community Library | MISSING | No `maxPublishedBooks` check anywhere. (Technically "unlimited" for everyone.) |
| 35 | 9 AI Marketplace analyses per month | PARTIAL | Limit (`maxMarketplacePerMonth: 9`) IS in `tier-limits.ts:84`. `checkMarketplaceLimit` IS called from `/record` — but as noted, `/analyze` itself does no check. Bypassable. |
| 36 | Priority support (< 2 hour response) | MISSING | No SLA system. No priority field on `supportMessages`. No tier-aware ticket queue. `prioritySupport: true` is a dead boolean. |
| 37 | Early access to new features | MISSING | No feature-flag system in the repo (zero matches for `featureFlag`/`earlyAccess`/`beta` outside marketing copy). No per-tier rollout, no admin flag table. |

---

## 7. Recommendations

For each MISSING / PARTIAL claim: implement, remove, reword, or document as
aspirational. Numbers below are the claim numbers from section 6.

| # | Recommendation |
|---|---|
| 1 | **Implement** book-count enforcement in `POST /api/books`, and **rework** chapter enforcement to be per-book using `getChapters(bookId).length` against `getTierLimits(tier).maxChaptersPerBook`. Otherwise, **reword** the pricing card to "3 chapters total" (which is the truth today). |
| 2 | **Implement** an aggregate word-count check (sum of all chapters of all books) before allowing a chapter PUT, and use the per-tier `maxWords`. Otherwise **reword** "5,000 words total" → "5,000 words per chapter". |
| 5, 20, 34 | **Implement** publishedBooks enforcement in the `publish` route: query `userStats.publishedBooks` (already maintained by `incrementUserPublished`), reject when `>= maxPublishedBooks`. |
| 13, 21 | **Implement** `if (!getTierLimits(tier).canExportPdf) return 403` in the PDF download branch (`books.routes.ts:492`); same for EPUB at `:741`. |
| 14, 22 | **Implement** `if (!getTierLimits(tier).canUseAudiobook) return 403` at the top of `/audiobook/preview` and `/audiobook/export`. |
| 15, 25, 35 | **Move** `checkMarketplaceLimit` into `POST /api/marketplace/analyze` itself (before doing the LLM work), or have `/record` happen synchronously inside `/analyze`. |
| 16, 17, 31 | Numerical Pro/Premium book/chapter/word claims need real enforcement OR remove the numbers ("Pro plan" / "Premium plan" with feature differentiation but no quantified limits). |
| 19, 33 | **Wire `checkAudiobookLimit`** into `POST /api/books/:id/audiobook/export` BEFORE running TTS. Currently only `tierAiLimiter` blocks. |
| 23 | **Remove "& spine"** from the pricing copy. Spine is a manual color picker, not AI-generated. |
| 24 | **Implement** `if (!getTierLimits(tier).canUseAdvancedAI) return 403` on the 4 analysis endpoints. |
| 26, 27, 28 | These features work, but advertising them as Pro-only is false. Either **gate** Story Bible / Research / Collaboration / Version History server-side using `canUseVersionHistory` (and add equivalent flags for the others), OR **move them to the Free feature list** since Free already has them. |
| 30 | Voice dictation works for any tier with AI budget. Move it to Free or gate it. |
| 32 | OK as-is once you decide whether to gate the wider AI surface. Consider clarifying the parenthetical "(improve, expand, continue, translate)" — it understates how the daily counter is debited. |
| 36 | **Remove** "< 2 hour response" — there is no SLA infrastructure to deliver it. Reword to "Email support" or "Priority email support" only after building a tagged-ticket queue. |
| 37 | **Remove** "Early access to new features" until there is a feature-flag system. Aspirational claim with no machinery. |

---

## 8. Effort Estimate

### Path A: implement-everything

Wire up the missing enforcement so the pricing copy becomes truthful.

| Task | Hours |
|---|---|
| Add tier checks to `POST /api/books` (book count) | 1 |
| Rework `POST /api/chapters/:bookId` to check per-book chapter count and total word count | 3 |
| Add tier checks to PDF + EPUB download endpoints | 1 |
| Add `canUseAudiobook` gate + monthly count to audiobook preview/export | 3 |
| Move `checkMarketplaceLimit` into `/api/marketplace/analyze` | 1 |
| Add `maxPublishedBooks` enforcement to publish endpoint | 1 |
| Add `canUseAdvancedAI` gate to 4 analysis endpoints | 1 |
| Build basic feature-flag system (table + admin toggle + tier-aware read) for "early access" | 8 |
| Build support-ticket priority field + admin queue UI for "priority support" | 12 |
| Implement "spine" AI cover endpoint (or remove the claim) | 4 |
| Test all of the above end-to-end with Free / Pro / Premium accounts | 8 |
| **Total** | **~43 hours (~5–6 days for one engineer)** |

### Path B: rewrite-claims

Edit the pricing page copy to match what the code actually does. Much
faster.

| Task | Hours |
|---|---|
| Edit `FEATURES_FREE` to remove "No PDF/EPUB export", "No Audiobook studio", "No AI Marketplace access" lines (they're not enforced — these are lies of omission); reword "2 books, 3 chapters per book" → "3 chapters total" | 0.5 |
| Edit `FEATURES_PRO` to drop "& spine" from cover claim, drop monthly audiobook export count or document non-enforcement, drop "3 AI Marketplace analyses per month" or document partial enforcement, move snapshot/research/collab/streak claims to Free section since they're available there too | 1 |
| Edit `FEATURES_PREMIUM` to drop "Priority support (< 2 hour response)" and "Early access to new features" until built; drop "10 audiobook exports per month" until enforced; drop "Unlimited publishing" since not enforced anywhere | 0.5 |
| Update `PLAN_DETAILS` (`checkout-plans.ts`) feature arrays to match | 0.5 |
| Update FAQ data file (`faq-data.ts`) to match | 1 |
| Visual regression check on /pricing | 0.5 |
| **Total** | **~4 hours (half a day)** |

### Recommended path

Path B (rewrite) for an immediate launch, then Path A in the next sprint
to actually deliver tier differentiation. Shipping Path A first risks
delaying launch; shipping pricing copy that makes claims the code can't
back risks consumer-protection / refund problems if any user notices the
gap.
