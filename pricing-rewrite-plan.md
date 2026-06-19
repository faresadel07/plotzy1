# Pricing Rewrite Plan — Path B (refined)

**Date:** 2026-05-05
**Branch:** `feat/pricing-honesty-rewrite`
**Master tip:** `628f7c1`
**Reference:** [pricing-truthfulness-audit.md](pricing-truthfulness-audit.md)

> **Prices stay unchanged this batch:** Pro **$8.99/mo**, Premium **$16.99/mo**.
> Path B is a copy/wording fix, not a pricing change.

---

## Reality check before any wording

The honest answer the audit forces is structural: in the current
codebase **almost nothing is tier-gated server-side**. The only
real, enforced differences between tiers today are:

| What's actually different | Free | Pro | Premium |
|---|---|---|---|
| AI calls per day (`tierAiLimiter`) | 10 | 100 | 200 |
| AI Marketplace analyses per month *(after Stage B1 fix)* | 0 | 3 | 9 |
| Chapter creation total cap (`chapters.routes.ts:48`) | 3 total | unlimited | unlimited |
| Per-chapter word cap (`chapters.routes.ts:101`) | 5,000 | unlimited | unlimited |
| Published-book count (`MAX_PUBLISHED_FREE`) | 1 | unlimited | unlimited |

Every other "Pro feature" (PDF/EPUB export, audiobook studio,
voice dictation, analysis tools, story bible, version history,
collaboration) **works for Free users today**. The current page
promises gates that aren't there.

This plan re-bases the page on those five enforcement points and
adds the framing/transparency refinements you specified.

---

## Summary of dispositions

For 37 advertised claims:

- **REMOVE:** 7 claims (no infrastructure, no path to truth without code)
- **REWRITE:** 8 claims (numbers wrong, wording wrong, scope wrong)
- **MOVE to Free:** 9 claims (currently work for Free; honest move)
- **KEEP verbatim or near-verbatim:** 13 claims (verified in audit, plus 2 "Unlimited" Premium lines kept per directive)

Counts add to 37 ✓.

---

## New Free Tier Copy

### Tagline
**"Everything you need to write your first book — for free."**

### Feature list
```
- AI book cover generator (front and back)
- Basic cover designer
- Community library: like, comment, follow, message
- Author profile page
- Notifications center
- Ambient writing sounds
- Voice dictation & transcription
- PDF & EPUB export
- Audiobook studio with 10 AI voices
- AI analysis tools (plot holes, pacing, dialogue, voice)
- Story Bible & Research board
- Book collaboration (invite co-writers)
- Auto-snapshots & version history
- 45+ book languages · 14 UI languages
```

### Free tier limits (clearly labeled subsection on the card)

**Heading:** "Free tier limits" (simple subsection header — no decorative dashes; styled to match other subheaders in `pricing.tsx`)

```
• 3 chapters total (across all books)
• 5,000 words per chapter
• 10 AI assists per day
• 1 published book in Community Library
```

### Why each line is honest

| Free line | Verified by |
|---|---|
| AI book cover (front+back) | `routes.ts:726`, `books.routes.ts:333-384`. Spine removed (was untrue). |
| Basic cover designer | `pages/cover-designer.tsx` exists, no AI dependency |
| Community library | `social.routes.ts:262-298` likes; `bookComments` table |
| Author profile | `pages/author-profile.tsx` exists |
| Notifications center | `social.routes.ts:306-358` |
| Ambient sounds | `components/AmbientSoundscape.tsx`, 12 presets |
| Voice dictation | `chapters.routes.ts:290`, Whisper transcription |
| PDF & EPUB export | export endpoints exist; not currently tier-gated |
| Audiobook studio | 10-voice studio exists; not currently tier-gated |
| AI analysis tools | 4 endpoints work; not currently tier-gated |
| Story Bible & Research | `loreEntries` + `researchItems` tables; endpoints work |
| Book collaboration | `misc.routes.ts:826-879` invite/join; not tier-gated |
| Auto-snapshots | `routes.ts:1360-1390` on every chapter PUT |
| 45+ book languages · 14 UI | `i18n.ts:3-49` BOOK_LANGUAGES (45) + UI_LANGUAGES (14) |
| 3 chapters total | `chapters.routes.ts:48` enforces 3-chapter total cap |
| 5,000 words/chapter | `chapters.routes.ts:101` enforces per-chapter word cap |
| 10 AI assists/day | `tierAiLimiter` + `FREE_MAX_AI_CALLS_PER_DAY=10` |
| 1 published book | `MAX_PUBLISHED_FREE=1` enforced |

---

## New Pro Tier Copy ($8.99/mo — unchanged)

### Tagline
**"For serious writers"**

### Headline benefits (per directive)
- 10× more AI assists daily (100 per day)
- 3 professional marketplace analyses monthly
- Everything in Free included

### Feature list
```
Everything in Free, plus:
- 100 AI requests per day
    └─ small caption: "Shared across all AI features (writing, audiobook, cover, etc.)"
- 3 AI Marketplace analyses per month
- Unlimited chapters
- Unlimited words per chapter
- Unlimited published books in Community Library
```

### Why each line is honest

| Pro line | Verified by |
|---|---|
| 100 AI requests/day | `PRO_MAX_AI_CALLS_PER_DAY=100` enforced via `tierAiLimiter` |
| Disclaimer "shared across all AI features" | audit finding #18: 16+ endpoints debit the same counter |
| 3 AI Marketplace analyses/month | `tier-limits.ts:65`; Stage B1 closes the bypass |
| Unlimited chapters | Pro tier passes `chapters.routes.ts:48` |
| Unlimited words/chapter | Pro tier passes `chapters.routes.ts:101` |
| Unlimited published books | Pro tier passes the published-count check |

### What's NOT in Pro any more (and why)
- ~~50 books, 100 chapters/book~~ — REMOVED (numbers not enforced)
- ~~500,000 words~~ — REMOVED (no aggregate word counter)
- ~~3 audiobook exports/month~~ — REMOVED (`maxAudiobookExportsPerMonth` defined but never read)
- ~~20 published books~~ — REWRITE → "Unlimited published books"
- ~~PDF & EPUB professional export~~ — MOVED to Free
- ~~Audiobook studio with 10 AI voices~~ — MOVED to Free
- ~~AI cover generator (front, back & spine)~~ — MOVED to Free, "spine" REMOVED
- ~~AI analysis tools~~ — MOVED to Free
- ~~Version history & auto-snapshots~~ — MOVED to Free
- ~~Story Bible & Research board~~ — MOVED to Free
- ~~Book collaboration~~ — MOVED to Free
- ~~Writing streaks, calendar & analytics~~ — exists for all users; folded into Free
- ~~Voice dictation & transcription~~ — MOVED to Free

---

## New Premium Tier Copy ($16.99/mo — unchanged)

### Tagline
**"For full-time writers and authors"**

### Headline benefits (per directive)
- 20× more AI assists daily (200 per day)
- 9 professional marketplace analyses monthly
- Everything in Pro included

### Feature list
```
Everything in Pro, plus:
- 200 AI requests per day
    └─ small caption: "Shared across all AI features (writing, audiobook, cover, etc.)"
- 9 AI Marketplace analyses per month
- No book, chapter, or word limits
- No limits on Community Library publishing
```

> **Wording note (Tweak A):** "No limits" is honest about current state without making the absolute "Unlimited" promise. If Path A introduces a Pro cap later, "Unlimited" would have become a stronger marketing promise that misleads users hitting the new technical cap. "No limits" stays correct.

### Why each line is honest

| Premium line | Verified by | Note |
|---|---|---|
| 200 AI requests/day | `PREMIUM_MAX_AI_CALLS_PER_DAY=200` enforced | real differentiator |
| Same disclaimer as Pro | audit finding #18 | transparency |
| 9 AI Marketplace/month | `tier-limits.ts`; Stage B1 closes bypass | real after B1 |
| Unlimited books, chapters & words | All tiers pass these checks today | **Path A note**: kept per directive; honestly Pro is also effectively unlimited here. Path A would re-introduce a Pro cap so Premium's "Unlimited" becomes a genuine uplift. |
| Unlimited publishing | All tiers pass the publishing check today | **Path A note**: same — Pro has no published cap currently. Path A re-introduces a Pro cap. |

### What's NOT in Premium any more
- ~~10 audiobook exports / month~~ — REMOVED (no enforcement, no monthly counter)
- ~~Priority support (< 2 hour response)~~ — REMOVED (no SLA infrastructure, no priority queue)
- ~~Early access to new features~~ — REMOVED (no feature-flag system)

---

## Disposition per claim (37 claims)

| # | Original claim | Tier | Audit | Disposition | Notes |
|---|---|---|---|---|---|
| 1 | 2 books, 3 chapters per book | Free | PARTIAL | REWRITE → "3 chapters total" (in Free limits subsection) | 2-book limit not enforced; 3 is total not per-book |
| 2 | 5,000 words total | Free | PARTIAL | REWRITE → "5,000 words per chapter" (in Free limits subsection) | per-chapter, not total |
| 3 | 10 AI assists per day | Free | ✅ | KEEP (in Free limits subsection); drop misleading parenthetical |
| 4 | AI book cover generator | Free | ✅ | KEEP, add "(front and back)" |
| 5 | 1 published book | Free | ✅ | KEEP (in Free limits subsection) |
| 6 | Basic cover designer | Free | ✅ | KEEP |
| 7 | Community library + likes/comments | Free | ✅ | KEEP, combined with #9 |
| 8 | Author profile | Free | ✅ | KEEP |
| 9 | Follow + DM | Free | ✅ | KEEP, combined with #7 |
| 10 | Notifications | Free | ✅ | KEEP |
| 11 | Ambient sounds | Free | ✅ | KEEP |
| 12 | 45+ languages & RTL | Cross | 🤔 | REWRITE → "45+ book languages · 14 UI languages" |
| 13 | No PDF/EPUB export | Free | ❌ | MOVE: drop the negative; ADD "PDF & EPUB export" to Free |
| 14 | No Audiobook studio | Free | ❌ | MOVE: drop the negative; ADD "Audiobook studio with 10 AI voices" to Free |
| 15 | No AI Marketplace access | Free | ❌ | MOVE: drop the negative; after B1, Free has 0 marketplace by enforcement |
| 16 | 50 books, 100 chapters/book | Pro | ❌ | REMOVE numbers; REWRITE → "Unlimited chapters" |
| 17 | 500,000 words | Pro | ❌ | REMOVE; REWRITE → "Unlimited words per chapter" |
| 18 | 100 AI assists/day | Pro | PARTIAL | REWRITE → "100 AI requests per day" + transparency disclaimer |
| 19 | 3 audiobook exports/month | Pro | ❌ | REMOVE | constant defined but never read |
| 20 | 20 published books | Pro | ❌ | REWRITE → "Unlimited published books" | no cap exists at Pro |
| 21 | PDF & EPUB export | Pro | ❌ | MOVE to Free |
| 22 | Audiobook studio with 10 voices | Pro | PARTIAL | MOVE to Free |
| 23 | AI cover (front, back & spine) | Pro | PARTIAL | MOVE to Free; REWRITE drop "spine" |
| 24 | AI analysis tools | Pro | ✅ | MOVE to Free |
| 25 | 3 AI Marketplace analyses/month | Pro | PARTIAL | KEEP after Stage B1 fix |
| 26 | Version history & auto-snapshots | Pro | ✅ | MOVE to Free |
| 27 | Story Bible & Research board | Pro | ✅ | MOVE to Free |
| 28 | Book collaboration | Pro | ✅ | MOVE to Free |
| 29 | Writing streaks/calendar/analytics | Pro | ✅ | MOVE to Free (or fold into Free implicitly) |
| 30 | Voice dictation & transcription | Pro | ✅ | MOVE to Free |
| 31 | Unlimited books/chapters/words | Premium | ❌ | REWRITE → **"No book, chapter, or word limits"** (per Tweak A) | "No limits" is honest about current state without making absolute future promises |
| 32 | 200 AI assists/day | Premium | PARTIAL | REWRITE → "200 AI requests per day" + transparency disclaimer |
| 33 | 10 audiobook exports/month | Premium | ❌ | REMOVE |
| 34 | Unlimited publishing | Premium | ❌ | REWRITE → **"No limits on Community Library publishing"** (per Tweak A) | Same rationale as #31 |
| 35 | 9 AI Marketplace analyses/month | Premium | PARTIAL | KEEP after Stage B1 fix |
| 36 | Priority support (< 2 hour) | Premium | ❌ | REMOVE | no SLA infrastructure |
| 37 | Early access to new features | Premium | ❌ | REMOVE | no feature-flag system |

---

## Path A follow-ups (deferred to a future batch)

For each removed/moved/kept-but-unenforced claim, the engineering
work needed to re-enable it as a real per-tier benefit:

| Claim | Severity | Effort | Code path |
|---|---|---|---|
| Per-tier book count (claim 16, also re-justifies Premium claim 31) | MEDIUM | 1h | wire `MAX_BOOKS_PER_TIER` check on `POST /api/books` |
| Per-tier chapter cap upgrade (claim 16) | MEDIUM | 1h | extend `chapters.routes.ts:48` to use Pro/Premium limits |
| Aggregate word count (claim 17) | MEDIUM | 3h | new `userWordCount` aggregator + check on chapter PUT |
| Audiobook export monthly limit (claims 19, 33) | MEDIUM | 2h | wire `maxAudiobookExportsPerMonth`, add `audiobookExports` counter table |
| Published-book cap on Pro (claim 20, also re-justifies Premium claim 34) | LOW | 30m | extend `MAX_PUBLISHED_*` enforcement to Pro |
| PDF/EPUB tier gate (claim 21) | MEDIUM | 1h | wire `canExportPdf`/`canExportEpub` |
| Audiobook tier gate (claim 22) | MEDIUM | 1h | wire `canUseAudiobook` |
| AI cover spine (claim 23) | LOW | 4h | extend cover-gen prompt + UI for spine |
| AI analysis tier gate (claim 24) | MEDIUM | 1h | wire `canUseAdvancedAI` to 4 analysis endpoints |
| Version history tier gate (claim 26) | LOW | 30m | wire `canUseVersionHistory` |
| Voice dictation tier gate (claim 30) | LOW | 30m | wire transcribe endpoint to Pro+ |
| Priority support (claim 36) | HIGH | ~16h | priority queue, tier-based SLA, admin triage UI |
| Early access feature flags (claim 37) | HIGH | ~16h | feature-flag system with tier-based gating |

**Total Path A effort estimate:** ~47 hours of engineering work.

---

## Marketing-tone reframings

The honest page is shorter and less differentiated than the
current one. The framing refinements you specified keep it appealing:

### Free framing (suggested tagline)
"Everything you need to write your first book — for free." The
expanded Free tier is genuinely generous; lean into that as a
**user-acquisition** lever, not a weakness.

### Pro framing
**Tagline:** "For serious writers."
**Headline benefits:**
- 10× more AI assists daily (100 per day)
- 3 professional marketplace analyses monthly
- Everything in Free included

### Premium framing
**Tagline:** "For full-time writers and authors."
**Headline benefits:**
- 20× more AI assists daily (200 per day)
- 9 professional marketplace analyses monthly
- Everything in Pro included

### What we don't say
- "Most popular" / "Best value" badges only if backed with metrics
- "Save X%" on yearly is fine — that math is real
- Avoid "professional" qualifiers on features Free can also access

---

## Files that need updating in Phase B

When this plan is approved, the implementation phase touches:

1. [pricing.tsx:25-69](artifacts/plotzy/src/pages/pricing.tsx) — three feature arrays + render new tagline blocks + render Free limits subsection + render AI disclaimer
2. [checkout-plans.ts:31-47](artifacts/plotzy/src/lib/checkout-plans.ts) — `PRO_FEATURES` and `PREMIUM_FEATURES` (the smaller list shown in checkout)
3. [faq-data.ts](artifacts/plotzy/src/data/faq-data.ts) — entries that reference "10 voices Pro-only", "20 books on Pro", "audiobook export limits", etc.
4. [discovered-issues.md](discovered-issues.md) — new section logging all 13 Path A follow-ups
5. **Stage B1 (separate first commit):** [misc.routes.ts](artifacts/api-server/src/routes/misc.routes.ts) — move `checkMarketplaceLimit` from `/record` to `/analyze`

---

## Approval gate

Before any code change, please confirm:

1. **Approve the new Free copy** — 14 features + 4-line "Free tier limits" subsection?
2. **Approve the lean Pro copy** — tagline "For writers building seriously" + 5-line feature list with the "shared across AI features" disclaimer below the 100/day line?
3. **Approve the lean Premium copy** — tagline "For full-time writers and authors" + 4-line feature list (incl. "Unlimited books, chapters & words" and "Unlimited publishing" kept per your directive, with Path A notes)?
4. **Confirm Stage B1** (marketplace `/analyze` gate) ships first as a critical fix?
5. **Any wording changes** before I commit?

Awaiting your approval before any code edits.
