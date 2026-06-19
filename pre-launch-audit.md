# Plotzy Pre-Launch Audit

**Date**: 2026-05-03
**Auditor**: Claude Code (Opus 4.7, 1M context)
**Scope**: Everything except domain purchase, hosting setup, DNS configuration, and going live
**Master tip at audit time**: `d64224a` (post feat/faq-page merge)

---

## Summary

| Severity | Count |
|---|---:|
| **CRITICAL** (blocks launch) | 4 |
| **HIGH** (should fix before launch) | 11 |
| **MEDIUM** (fix soon after launch) | 12 |
| **LOW** (nice to have) | 5 |
| **Decisions needed from Faris** | 8 |
| **Total** | **40** |

The codebase is in remarkably good shape after 11 merges. The auth pipeline, payment integrity, internationalization scaffolding, and error handling are at a quality bar most pre-Series-A products do not reach. The launch-blocking gaps are concentrated in two areas: **legal documents containing false claims** (Stripe references in Privacy Policy and Terms of Service that contradict the actual PayPal-only payment integration) and **two production-infrastructure prerequisites already known and documented** (Resend custom domain, PayPal Live credentials).

The HIGH cluster is dominated by SEO and accessibility gaps that any modern web app needs, plus a cluster of missing transactional emails (password-changed confirmation, account-suspension notification) that are five-minute additions individually but represent a real polish gap collectively.

Test coverage is the most concerning systemic gap — there are zero tests anywhere in the repo, including for payment-capture amount verification which handles real money.

---

## Findings by Severity

### CRITICAL (blocks launch)

#### C-1. Privacy Policy and Terms of Service falsely list Stripe as a payment processor

**Location**:
- `artifacts/plotzy/src/pages/privacy-policy.tsx:150` — "all payment processing is handled securely by Stripe and PayPal"
- `artifacts/plotzy/src/pages/privacy-policy.tsx:176` — "Stripe and PayPal may share transaction status and billing information with us"
- `artifacts/plotzy/src/pages/privacy-policy.tsx:222` — "Stripe / PayPal — payment processing"
- `artifacts/plotzy/src/pages/terms-of-service.tsx:228` — "All payments are processed securely through Stripe or PayPal"

**Evidence of contradiction**: Plotzy uses PayPal exclusively. There is no Stripe SDK initialized in the backend (no `import Stripe` in route handlers), no Stripe checkout endpoint, no Stripe webhook handler that processes captures. The webhook-handlers.ts file at `artifacts/api-server/src/webhook-handlers.ts:36` mentions `charge.refunded` for completeness but does not handle Stripe-initiated charges. The single source of truth at `artifacts/plotzy/src/data/faq-data.ts:181-187,199` says "Plotzy uses PayPal as its payment processor."

**Why CRITICAL**: Privacy Policy and Terms of Service are legal documents users contractually agree to. False claims about which third parties process their payment data are a material misstatement, exposing the founder to consumer-protection complaints in jurisdictions like California (Consumer Legal Remedies Act) and the EU (UCPD).

**Recommendation**: Remove all four Stripe references. Replace with "Payments are processed by PayPal" / "PayPal — payment processing." Estimated effort: 10 minutes.

---

#### C-2. Resend testing domain restriction (production gate)

**Location**: `artifacts/api-server/src/lib/email.ts:40` — `DEFAULT_FROM = "Plotzy <onboarding@resend.dev>"`

**Evidence**: Resend's `onboarding@resend.dev` testing domain only delivers to the email address registered with the Resend account. Sends to all other recipients are silently rejected (the SDK returns success from the app's perspective; the rejection is visible only in the Resend dashboard).

**Already documented**: discovered-issues.md "LOW — Resend onboarding@resend.dev testing domain blocks all sends" (severity is LOW for dev, **HIGH for production**).

**Why CRITICAL for launch**: Without verifying a custom domain in Resend (typically `noreply@plotzy.com` or similar), zero verification emails, password resets, welcome emails, cancel confirmations, or notification emails will reach real users. Email is silently broken for everyone except the Resend account owner.

**Recommendation**: Verify a custom domain in Resend Dashboard, update `DEFAULT_FROM` (or read from `process.env.EMAIL_FROM`), and run an end-to-end signup→verify→cancel test on a non-merchant email address. Estimated effort: 30 minutes including DNS propagation wait.

---

#### C-3. PayPal Sandbox credentials in production environment

**Location**: `.env` (PayPal client ID + secret) and the active PayPal merchant account.

**Evidence**: All payment testing during development used PayPal Sandbox. Sandbox transactions are fictional and only the merchant-registered email receives capture emails.

**Already documented**: HIGH-severity production gate carried across all 11 merges.

**Recommendation**: Switch to PayPal Live credentials, verify merchant account, run end-to-end paid-flow test on a non-merchant email. Estimated effort: 30 minutes including PayPal merchant verification.

---

#### C-4. No cookie consent / GDPR consent gate exists

**Location**: Searched `artifacts/plotzy/src/components/` and `artifacts/plotzy/src/pages/` for "cookie", "consent", "CookieBanner", "CookieConsent" — zero matches outside the privacy policy text itself.

**Evidence**: The privacy policy at `pages/privacy-policy.tsx:276` mentions GDPR ("For Users in the European Union") but the application does not present a consent banner before setting session cookies, tracking page views (the `pageViews` table at `lib/db/src/schema/index.ts` is populated for every visit), or running analytics. Under GDPR Articles 6 + 7 and the ePrivacy Directive, prior consent is required for non-essential cookies and tracking.

**Why CRITICAL**: EU users cannot legally use the service without an explicit consent surface. The risk is not theoretical — the French CNIL and Spanish AEPD have issued five- and six-figure fines for this exact pattern.

**Recommendation**: Decision-required (see Decisions section, D-1) on whether to launch with EU-blocked geofence or implement a consent banner. If a banner is the path, common patterns are a sticky bottom drawer with Accept All / Reject All / Customize. Estimated effort if implementing: 2 hours including a minimal preference store.

---

### HIGH (should fix before launch)

#### H-1. No per-page meta descriptions

**Location**: No `react-helmet`, `react-helmet-async`, or `<Helmet>` usage anywhere in `artifacts/plotzy/src/`.

**Evidence**: Every route shares the single `<meta name="description">` tag from `artifacts/plotzy/index.html`. Library, Discover, Author Profile, Pricing, FAQ, Read Book, etc. all serve the same generic description to crawlers and social-share previews.

**Recommendation**: Add `react-helmet-async` and per-page descriptions. Critical pages: /pricing, /faq, /library, /discover, /authors/:userId, /read/:id. Estimated effort: 2-3 hours for all routes plus a `<PageMeta>` helper.

---

#### H-2. No per-page document.title

**Location**: Only 4 of ~25 routes set `document.title` dynamically: `account-subscription.tsx`, `author-profile.tsx`, `checkout.tsx`, `messages.tsx`.

**Evidence**: 20+ routes default to the root title "Plotzy — Write Your Story" in browser tabs, bookmarks, and history.

**Recommendation**: Same fix as H-1; the same react-helmet-async helper handles both. Estimated effort: bundled with H-1.

---

#### H-3. Icon-only buttons missing aria-label

**Location**:
- `artifacts/plotzy/src/components/notification-bell.tsx:48` — bell icon trigger has no aria-label.
- `artifacts/plotzy/src/components/layout.tsx` — avatar dropdown trigger has no aria-label (the trigger is a styled button with avatar inside, no text).

**Evidence**: Screen readers announce these as unlabeled buttons. WCAG 2.1 Success Criterion 4.1.2 requires accessible names for interactive elements.

**Recommendation**: Add `aria-label="Notifications"` and `aria-label="Account menu"` respectively. Estimated effort: 5 minutes.

---

#### H-4. 21 of 46 `<img>` tags have empty alt attributes

**Location**: Sampled across `pages/admin.tsx`, author profiles, book covers, and avatars. The avatar component at `components/ui/avatar.tsx` is from shadcn, so the alt-text gap is at the call sites, not the primitive.

**Evidence**: Screen readers skip empty-alt images entirely. For book covers and user avatars this means the entire visual content of the page is invisible to assistive tech.

**Recommendation**: Sweep `pages/library.tsx`, `pages/author-profile.tsx`, `pages/read-book.tsx`, `pages/admin.tsx`. Use `alt={book.title + " cover"}` and `alt={user.displayName + " avatar"}` patterns. Decorative-only images can keep `alt=""` but should add `aria-hidden="true"`. Estimated effort: 1-2 hours.

---

#### H-5. No password-changed confirmation email

**Location**: `artifacts/api-server/src/routes/auth.routes.ts:680` — `POST /api/auth/reset-password` consumes the reset token, updates the password hash, but sends no confirmation email.

**Evidence**: Standard security UX dictates a "your password was just changed" email so a user whose account was compromised can react. Plotzy's competitors all do this.

**Recommendation**: Add a `sendEmail` call after `storage.updateUser({ passwordHash })`. Estimated effort: 5 minutes.

---

#### H-6. No account-suspension notification email

**Location**: `artifacts/api-server/src/routes/misc.routes.ts:623` — `PATCH /api/admin/users/:id/suspend` updates the suspended flag but the user receives no email.

**Evidence**: A suspended user attempting to log in or post will see access blocked with no explanation. The admin took a deliberate action against them; transparency requires an email saying so and pointing them to the support email if they want to appeal.

**Recommendation**: Add a `sendEmail` call inside the suspend handler. Template should include a brief reason field (admin can set it during suspension) and a contact email. Estimated effort: 30 minutes including a small reason-field UI in the admin panel.

---

#### H-7. No JSON-LD structured data on book or author pages

**Location**: Searched for `application/ld+json` across the entire frontend — zero matches.

**Evidence**: For a book platform, the `Book` and `Person` schemas at schema.org are exactly the kind of structured metadata Google uses to render rich snippets (star ratings, author photos, book covers in search results). Without them, Plotzy book listings appear as plain blue links in search.

**Recommendation**: Add JSON-LD scripts to `pages/read-book.tsx` (Book schema with title, author, datePublished, image, aggregateRating) and `pages/author-profile.tsx` (Person schema with name, image, sameAs for social handles). Estimated effort: 1-2 hours.

---

#### H-8. Stripe webhook missing amount verification

**Location**: Documented in `discovered-issues.md` as MEDIUM ("Stripe webhook handler doesn't verify amount/plan match"). Re-flagging here as HIGH for launch.

**Evidence**: Even though Plotzy uses PayPal as the primary processor, the codebase has a Stripe webhook handler that processes `charge.succeeded` events and trusts `metadata.plan` without verifying the captured amount matches the plan price. This mirrors the bug we already fixed for PayPal in `fix/payment-amount-verification`.

**Why HIGH for launch**: If Stripe is wired up at any point post-launch (or if a misconfigured Stripe key is in production env), the same amount-tampering exploit that PayPal had is open via Stripe.

**Recommendation**: Either disable the Stripe webhook entirely (since Plotzy doesn't use Stripe per C-1), or apply the same server-side amount-verification pattern. Estimated effort: 30 minutes (apply existing pattern).

---

#### H-9. Mobile UX intentionally blocked at <700px viewport

**Location**: `artifacts/plotzy/src/components/MobileBlocker.tsx`, mounted in `App.tsx:272`.

**Evidence**: Screens narrower than 700px see an overlay reading "Open on a larger device" with a bilingual EN+AR message. This is intentional and documented (per session memory: "Plotzy blocks phones via MobileBlocker (<700px); mobile UX fix is a deferred follow-up").

**Why HIGH**: Roughly 60% of global web traffic is mobile. Blocking that segment at the door is a serious launch decision, not a bug. Even if the intent is desktop-first, a "we're optimizing for mobile, sign up for early access" gateway would be more growth-friendly than the current hard block.

**Recommendation**: Decision-required (D-2). Either (a) ship with the blocker and acknowledge the launch is desktop-only, (b) replace the blocker with a degraded but functional mobile shell for read-only browsing (Library + Discover + Author Profile + FAQ), or (c) defer launch until mobile UX is built out.

---

#### H-10. Zero test coverage including for payment-capture amount verification

**Location**: No `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`, or `__tests__/` directories anywhere in the repo.

**Evidence**: The most security-critical code in the application is `artifacts/api-server/src/routes/payments.routes.ts:506-549`, which re-derives the expected payment amount on the server and refuses captures that don't match. This was added in `fix/payment-amount-verification` precisely because the prior version trusted the client. With no tests, a future refactor could re-introduce the same exploit and nothing would catch it.

**Recommendation**: Decision-required on test framework (Vitest is the natural fit given Vite). Even a minimal suite covering (a) amount-mismatch rejection, (b) duplicate-orderId idempotency, (c) email-verified gating on social actions would be high-leverage. Estimated effort: 1 day for a meaningful starter suite.

---

#### H-11. No self-service account deletion endpoint

**Location**: Documented in `discovered-issues.md` as LOW. Re-flagging here as HIGH for launch UX.

**Evidence**: Users wanting to delete their account must email faresadel@gmail.com and request manual deletion. The /faq page documents this honestly. While GDPR/CCPA compliance is technically maintained via the manual path, modern user expectations are that a Settings page has a Danger Zone with self-service delete.

**Recommendation**: Decision-required (D-3). Implementing self-service deletion is a single endpoint plus a confirmation modal — about 2 hours of work. The current FAQ answer is accurate; if Faris is comfortable shipping with email-only deletion, this stays at LOW. If he wants the modern UX before launch, it becomes a 2-hour task.

---

### MEDIUM (fix soon after launch)

#### M-1. Skip-to-content link missing in layout

**Location**: `artifacts/plotzy/src/components/layout.tsx` — no `<a href="#main">Skip to main content</a>` at the top of the DOM.

**Recommendation**: WCAG 2.4.1. Add one anchor and one `id="main"` on the content wrapper. Estimated effort: 5 minutes.

---

#### M-2. Many onClick handlers on `<div>` instead of `<button>`

**Location**: 25 instances in `pages/home.tsx` alone, more across the codebase.

**Evidence**: Keyboard users cannot tab to or activate `<div onClick>` interactive regions without explicit `tabIndex={0}` and `onKeyDown` handlers. The layout dropdowns and shadcn Radix primitives are correct; the issues are in custom landing-page components.

**Recommendation**: Sweep `pages/home.tsx` and any landing components. Convert to `<button>` where the element is genuinely interactive. Estimated effort: 1-2 hours.

---

#### M-3. Sitemap.xml is static (no dynamic routes)

**Location**: `artifacts/plotzy/public/sitemap.xml` exists with 9 hard-coded routes but no entries for `/blog/:id`, `/authors/:userId`, `/read/:id`, or any user-generated content.

**Recommendation**: Add a backend endpoint at `/sitemap.xml` that streams a dynamic XML response generated from the books, articles, and active author tables. Estimated effort: 2 hours.

---

#### M-4. No explicit chunk splitting in Vite config

**Location**: `artifacts/plotzy/vite.config.ts` — uses default Rollup chunking.

**Evidence**: Prior frontend builds emit warnings about chunks >500kB (the production bundle is ~1.97MB). A vendor chunk for React + framer-motion + recharts would significantly reduce initial-load time.

**Recommendation**: Add `build.rollupOptions.output.manualChunks` with `react`, `framer-motion`, `recharts`, `@tiptap/*`, and `@radix-ui/*` as separate vendor chunks. Estimated effort: 30 minutes including build verification.

---

#### M-5. TypeScript not in full strict mode

**Location**: `tsconfig.base.json` enables `noImplicitAny`, `strictNullChecks`, `strictBindCallApply`, `strictPropertyInitialization`, but does NOT enable `strictFunctionTypes`, `noImplicitOverride`, `noUnusedLocals`, or set `"strict": true`.

**Recommendation**: Enable `strictFunctionTypes` and `noUnusedLocals` and fix the cascade (likely 10-30 errors). Estimated effort: 2-4 hours.

---

#### M-6. 389 `any` type usages (heavy in misc.routes.ts and storage.ts)

**Location**: `misc.routes.ts` has 36, `routes.ts` 33, `storage.ts` 24, `chapter-editor.tsx` 16.

**Evidence**: Heavy `any` casting reflects legacy untyped API shapes and Passport profile deserialization. Most are justified (external library types) but the misc.routes.ts cluster is internal code that could be typed.

**Recommendation**: Schedule a focused cleanup group post-launch. Estimated effort: 1-2 days for misc.routes.ts and storage.ts.

---

#### M-7. No "new login from device" notification email

**Location**: `auth.routes.ts:212` — login handler. No email sent on successful login.

**Evidence**: Many apps (Google, Facebook, GitHub) send a "we noticed a new sign-in" email when login geo or user-agent changes meaningfully. Plotzy does not.

**Recommendation**: Defer to post-launch; requires user-agent + IP heuristics. Estimated effort: 2-4 hours.

---

#### M-8. No subscription expiry/renewal notification emails

**Location**: PayPal one-time captures with manual `subscriptionEndDate` tracking; no recurring webhook handling.

**Evidence**: When a subscription period ends, the user transitions to Free with no warning email. They notice only when they hit Pro/Premium gates again.

**Recommendation**: Add a daily cron job (or scheduled task) that scans `users` for `subscriptionEndDate` falling in the next 7 days and sends a renewal-reminder email. Estimated effort: 4 hours.

---

#### M-9. Engagement notifications: comments and likes don't trigger emails

**Location**: `social.routes.ts` — follows and direct messages send emails (lines 235 and 439). Comments and likes do not.

**Evidence**: This is asymmetric. The notifications inbox shows all four event types in-app, but only two trigger email.

**Recommendation**: Add email sends in the comment-create and like-create handlers. Should respect a (currently nonexistent) per-user "email me when..." preference. Estimated effort: 1 hour for the basic version.

---

#### M-10. No email-change endpoint for logged-in users

**Location**: No `PATCH /api/auth/email` exists in `auth.routes.ts`.

**Recommendation**: Defer. Users with email-change needs can email support today. Estimated effort: 2 hours when prioritized (requires double-verification of old + new addresses).

---

#### M-11. No password-change endpoint for logged-in users

**Location**: Only password reset via the forgot-password flow exists. No "change password while logged in" endpoint.

**Recommendation**: Defer. Users can change password via the forgot-flow today. Estimated effort: 30 minutes when prioritized.

---

#### M-12. /api/admin/support/unread-count returns 500

**Location**: Documented in `discovered-issues.md` as LOW. Re-flagging here.

**Evidence**: The bare `catch (err)` in `misc.routes.ts:647-655` swallows the underlying error. The admin nav badge silently fails to populate.

**Recommendation**: Add `logger.error({ err }, ...)` inside the catch and re-investigate once the actual exception is visible. Estimated effort: 15 minutes for the diagnostic fix; full fix depends on root cause.

---

### LOW (nice to have)

#### L-1. 14 frontend console.log/warn/error calls in production source

**Location**: Sampled in `lib/text-offsets.ts`, `pages/checkout.tsx`, `hooks/use-zod-logger.ts`, `components/error-boundary.tsx`, `pages/audiobook-studio.tsx`.

**Evidence**: Most are `console.error()` for legitimate error instrumentation. A handful look like leftover debug.

**Recommendation**: Sweep for non-error console calls and remove. Estimated effort: 30 minutes.

---

#### L-2. One TODO comment in dev-only artifact config

**Location**: `artifacts/api-server/.replit-artifact/artifact.toml:2` — "TODO - should be excluded from preview in the first place"

**Recommendation**: Informational. No action needed.

---

#### L-3. Tutorial content database is empty (or unverified)

**Location**: `pages/tutorial.tsx` fetches from `GET /api/tutorials`. The tutorials table exists at `lib/db/src/schema/index.ts` but production population is a content task, not a code task.

**Recommendation**: Decision-required (D-4) on whether to launch with the tutorials tab populated, hidden, or empty.

---

#### L-4. Default tab fallthrough on 404

**Location**: `pages/not-found.tsx` is well-designed but doesn't log the 404 anywhere. For analytics, knowing which routes 404 most is useful.

**Recommendation**: Add a `fetch("/api/_404", { method: "POST", body: JSON.stringify({ path }) })` fire-and-forget call. Estimated effort: 30 minutes including the backend collector endpoint.

---

#### L-5. Bundle size warning

**Location**: Vite build emits ">500kB chunks" warning per session prior reads. Same root cause as M-4.

**Recommendation**: Fix via M-4. Same effort.

---

### DECISIONS NEEDED FROM FARIS

These are not bugs. They are product/scope decisions that determine whether other findings are blockers or deferrals.

#### D-1. Cookie consent / GDPR banner

Does Plotzy launch with EU traffic enabled? If yes, a consent banner is required (under GDPR + ePrivacy). If no (geofenced launch), C-4 downgrades to MEDIUM. The privacy policy already mentions GDPR rights, which makes the absence of a consent gate more conspicuous if EU users land on the site.

**Options**:
- (a) Implement banner now (~2 hours)
- (b) Geofence EU at the CDN/hosting layer until banner is built
- (c) Launch and accept regulatory risk

#### D-2. Mobile launch strategy (related to H-9)

Three paths:
- (a) Ship with `MobileBlocker` and position the launch as desktop-only (lose ~60% of global web traffic)
- (b) Build a degraded mobile shell for browse-only surfaces (Library, Discover, FAQ, Author Profile, Read) and keep the editor/cover/audiobook desktop-only
- (c) Delay launch until mobile responsive

#### D-3. Self-service account deletion (related to H-11)

The current FAQ truthfully says deletion is via support email. Faris's call:
- (a) Ship as-is (FAQ promise matches code)
- (b) Implement self-service before launch (~2 hours)

#### D-4. Tutorial content population (related to L-3)

Tutorials backend is wired but the database is unverified for production content. Decisions:
- (a) Populate with a starter set (5-10 tutorials) before launch — content task, not code
- (b) Hide the Tutorial nav item until content is ready
- (c) Show the empty state with "Coming soon"

#### D-5. Apple Pay support

The /faq currently says "Apple Pay support is on the roadmap for the production launch." If launch happens without it, the FAQ statement should change to "is on the roadmap" without the "for production launch" qualifier.

#### D-6. Refund policy explicit window

Current FAQ says "case-by-case via faresadel@gmail.com." A more user-friendly version names a window, e.g., "We review refund requests within 14 days of purchase." Risk: setting a window creates a contractual expectation. Risk of NOT setting one: users feel uncertain and bounce at the pricing page.

#### D-7. Email change (related to M-10)

Should logged-in users be able to change their email? Without it, a user who loses access to their original email also loses account access. Workaround: they email support.

#### D-8. Premium AI Marketplace asymmetry

PLAN_DETAILS lists "9 AI Marketplace analyses per month" for Premium and 0 for Pro. Pro users have access to the Marketplace surface but cannot run analyses. Is this intentional? If yes, the Pro card on /pricing should explicitly say "View-only access" or "0 analyses included."

---

## What's Actually Done Well

Plotzy is in much better shape than most pre-launch products at this stage. The following are areas the audit found in solid condition:

**Auth pipeline** — Email verification gating on social actions, brute-force protection (5 attempts / 15 min per IP+email), three OAuth providers (Google, Apple, LinkedIn) plus Google One Tap, secure session cookies, CSRF defense, rate limiting on every sensitive endpoint, atomic password-reset tokens.

**Payment integrity** — Server-side amount verification on PayPal capture (the most common indie-tier billing exploit, blocked), idempotency keyed on `paypal_order_id` against the `subscription_payments` audit table, transaction-wrapped capture+record, payment_method detection working for both PayPal account and PayPal card flows.

**Email pipeline** — HTML escaping for all user-supplied data, header sanitization against CRLF injection, fire-and-forget pattern with try/catch swallowing, idempotency via `welcomeEmailSentAt` timestamp, five trigger points wired for the welcome email.

**Database integrity** — Drizzle parameterized queries throughout (zero raw string concatenation in user-controlled paths), foreign-key cascades, transactional `deleteUser` that orphans books rather than deleting them (preserving community engagement), composite indexes on hot paths.

**Admin tooling** — Fourteen-tab dashboard with real-cash analytics from `subscription_payments`, audit log of every privileged action, payment-history-backed revenue analytics with month-over-month delta, conversion rate, and churn rate, content moderation, support inbox, banner management, social links, CSV export, bulk operations.

**Internationalization** — 14 UI languages, 45 book languages, native RTL support for Arabic/Hebrew/Persian/Urdu, Arabic-tuned AI system prompts (not just English-default translated), language selector in checkout.

**Code quality** — Zero commented-out code blocks >5 lines, zero empty try/catch blocks, no deprecated dependency TODOs, single TODO comment (in dev config), production secrets gated behind env vars with sane fallbacks, invisible-character scanner blocking U+2028/U+2029 supply-chain attacks at typecheck time.

**Error handling** — Production-grade React error boundary with Sentry integration, polished 404 page with home CTA, lazy-route Suspense fallback with spinner, error-tolerant PayPal capture with idempotent retry path.

**SEO basics** — Comprehensive root index.html with title, description, viewport, OG tags, Twitter cards, favicon, theme color, Apple touch icon. PWA manifest fully configured. robots.txt present and correctly disallows /admin, /messages, /api/. Static sitemap.xml present.

**Honesty** — The recently-merged `feat/faq-page` removed 9 false claims that had been live on /support. The new /faq is the single source of truth with 45 answers all verifiable in code. Every plan limit cited matches the schema constants. Sensitive answers (refunds, marketplace, account deletion, AI training) use founder-approved wording that does not over-promise.

**Library empty state** — `pages/library.tsx:566` renders a polished empty state with a BookOpen icon and either "No results found" (with filter) or "No stories published yet — Be the first to share your story with the community" (without filter).

---

## Recommended Next Steps

Prioritized order, with effort estimates. Aim for the CRITICAL block first; everything else can be split across post-launch sprints.

### Pre-launch (must-do before any users)

1. **C-1**: Remove 4 Stripe references from Privacy Policy + Terms of Service. **(10 minutes)**
2. **C-2**: Verify Resend custom domain, update DEFAULT_FROM, end-to-end test email delivery on a non-merchant address. **(30 minutes)**
3. **C-3**: Switch PayPal to Live credentials, end-to-end test paid flow on non-merchant email. **(30 minutes)**
4. **D-1 + C-4**: Decide cookie/GDPR strategy. If banner: implement. **(2 hours if implementing)**
5. **D-2 + H-9**: Decide mobile strategy.
6. **H-3**: Add aria-labels to NotificationBell + avatar dropdown. **(5 minutes)**
7. **H-5**: Add password-changed confirmation email. **(5 minutes)**
8. **H-6**: Add account-suspension email. **(30 minutes)**
9. **H-8**: Disable or fix Stripe webhook amount verification. **(30 minutes)**
10. **D-3 + H-11**: Decide self-service deletion strategy.
11. **D-5**: Update Apple Pay FAQ language if needed. **(2 minutes)**
12. **D-8**: Decide Pro Marketplace messaging if asymmetry is intentional.

**Total CRITICAL+HIGH pre-launch effort if all implemented: ~6 hours plus the two infrastructure swaps.**

### First post-launch sprint (within 2 weeks)

13. **H-1 + H-2**: Per-page meta and titles via react-helmet-async. **(2-3 hours)**
14. **H-4**: Alt text sweep for images. **(1-2 hours)**
15. **H-7**: JSON-LD Book + Person schemas. **(1-2 hours)**
16. **H-10**: Test suite starter with payment + auth coverage. **(1 day)**
17. **M-1**: Skip-to-content link. **(5 minutes)**
18. **M-3**: Dynamic sitemap. **(2 hours)**
19. **M-4**: Vite chunk splitting. **(30 minutes)**

### Second post-launch sprint

20. **M-2**: onClick-on-div sweep. **(1-2 hours)**
21. **M-5**: Enable strictFunctionTypes + noUnusedLocals. **(2-4 hours)**
22. **M-6**: Type-cleanup pass on misc.routes.ts. **(1-2 days)**
23. **M-7 through M-12**: The remaining email and endpoint gaps. **(~1 day total)**

### Long tail

24. **L-1 through L-5**: Polish.

---

## Cross-references

This audit complements `discovered-issues.md`, which catalogs in-flight issues found during prior audits. The most important entries there for launch readiness:

- HIGH: Resend testing-domain restriction (this audit C-2)
- HIGH: PayPal Sandbox restriction (this audit C-3)
- MEDIUM: Stripe webhook amount-verification gap (this audit H-8)
- MEDIUM: Silent payment_method column drop on PayPal subscription activation
- LOW: /api/admin/support/unread-count 500 (this audit M-12)
- LOW: No self-service account deletion (this audit H-11)

The 9 false claims previously on /support (now removed) are documented as INFO in discovered-issues.md.

---

_End of audit. No code was modified during this audit; everything documented here is observation, not action._
