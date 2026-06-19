# Certificate PDF Design — Batch 3.2 Phase A

Design audit before any implementation. Covers storage, library choice,
template, API surface, generation flow, i18n, and the decision points
that need Faris's call before Phase B begins.

Audit date: 2026-05-06.
Master tip at audit time: `a8bcb4f` (post-Batch-3.1 docs commit).

---

## Existing certificate ecosystem (audit findings)

These already exist and constrain the v1 design. Worth listing first
so the design doesn't accidentally rebuild what's already shipped.

**Schema** (`courseCertificates` table, [lib/db/src/schema/index.ts:875](lib/db/src/schema/index.ts#L875)):
- `id`, `userId` (unique FK to users), `certificateUuid` (unique), `issuedAt`, `finalExamScore`, `modulesCompletedAt` (jsonb), `pdfUrl` (text, nullable)
- Schema comment line 874: **"`pdfUrl` is populated lazily on first download."** — design intent for lazy generation was set at schema time

**API endpoints** ([artifacts/api-server/src/routes/course.routes.ts](artifacts/api-server/src/routes/course.routes.ts)):
- `POST /api/course/certificate/issue` — auth required, idempotent, line 716
- `GET  /api/course/certificate` — auth required, current user's cert, line 762
- `GET  /api/certificates/:uuid` — **PUBLIC** verification (no auth), line 787

**Storage methods** ([artifacts/api-server/src/storage.ts](artifacts/api-server/src/storage.ts)):
- `issueCourseCertificate` (line 1361)
- `getCertificateByUserId` / `getCertificateByUuid` (lines 1374-1392)
- **MISSING**: `setCertificatePdfUrl` — explicitly deferred per storage.ts:193 comment ("PDF generation deferred to Batch 3 — pdf_url stays NULL on issue")

**Frontend**:
- [`CertificateDisplay.tsx`](artifacts/plotzy/src/components/course/CertificateDisplay.tsx) — HTML cert layout. Uses `Award` + `ShieldCheck` lucide icons, decorative corner ornaments (border-l/t and border-r/b), `bg-card` + `border-primary/30`, font-serif title, font-mono UUID. Comment explicitly states: PDF deferred to Batch 3, one canonical layout for v1, viewer's language (not holder's) drives in-browser cert text.
- [`certificate-verify.tsx`](artifacts/plotzy/src/pages/certificate-verify.tsx) — public verify page, includes `?just-issued=true` confetti behavior (DP7/G3 from earlier batches).

**i18n keys already shipped** (English in [lib/i18n.ts:206-282](artifacts/plotzy/src/lib/i18n.ts)):
- `courseCertSubhead` = "Plotzy Writing Course"
- `courseCertTitle` = "Certificate of Completion"
- `courseCertAwarded` = "Awarded to"
- `courseCertCompletionLine` = "for successfully completing"
- `courseCertScore` = "Final exam score"
- `courseCertIssued` = "Issued"
- `courseCertVerifiedBadge` = "Verified by Plotzy"
- `courseCertAnonymousHolder` = "Author"
- (Per `discovered-issues.md`: course chrome translations are English-only outside `navCourse` — same deferred translation work.)

**Brand assets in [`artifacts/plotzy/public/`](artifacts/plotzy/public/)**:
- `plotzy-logo.png` — primary brand logo
- `plotzy-book-burgundy.png`, `plotzy-book-terracotta.png` — book mockups (likely too marketing-y for cert)
- `favicon.png`, `hero-bg.png`, `library-hero.png`

**Dependency audit**:
- ❌ NO PDF library installed (no pdfkit, @react-pdf/renderer, puppeteer, playwright, jspdf, pdf-lib)
- ❌ NO cloud-storage SDK (no @vercel/blob, AWS, Cloudflare R2, GCS, Azure)
- ✅ `multer` installed for upload parsing (won't help for our gen flow but useful to know)
- Existing binary storage pattern: book covers stored as `text("cover_image")` in postgres (likely base64 data URIs — see books.routes.ts:757 `os.tmpdir()` + base64 decode pattern). Plotzy already uses **DB-as-blob for binary content**.

---

## Part 1: Storage strategy

### Options considered

| Option | Pros | Cons |
|---|---|---|
| A. Local filesystem (`storage/certificates/*.pdf`) | Simplest, no SDK, no DB bloat | **Fatal for serverless deploys**: Vercel / Railway / Fly.io have ephemeral filesystems on container restarts. Files lost. |
| B. DB BLOB (`pdfData bytea` column) | Durable, transactional, no infra dep, matches Plotzy's existing book-cover pattern, public URL is just an API route | DB bloat — but at scale: 1k users × 80KB = 80MB, 10k × 80KB = 800MB (fine for Neon paid plan). Migration to blob storage later is a one-shot move. |
| C. Cloud blob (Vercel Blob / R2 / S3) | Scales infinitely, CDN-cacheable | Adds SDK dep + env vars + bucket setup + signed-URL or public-bucket decision. Pre-launch, no budget for new infra. |
| D. Generate every download (no storage) | Simplest, no storage decision | Wasteful for an immutable cert. Per-download CPU cost grows linearly with traffic. |

### Recommendation: B — DB BLOB

**Why**:
- Pre-launch with 0 users — no scale concerns for several years
- Plotzy already does DB-as-blob for book covers — consistent pattern, no new mental model
- Public URL is `GET /api/certificates/:uuid/pdf` — no signed-URL complexity, no bucket-policy concerns
- The schema field `pdfUrl: text` was designed for an **external URL**, but with DB-as-blob the "URL" is just our own API path — the column doubles as a "generated yet?" flag
- Migration to (C) when scale demands is a **single backfill script** + endpoint redirect — not a v1 concern

**Schema change required** (one new column):
```sql
ALTER TABLE course_certificates
  ADD COLUMN pdf_data BYTEA;
```
Plus optionally:
```sql
ALTER TABLE course_certificates
  ADD COLUMN pdf_generated_at TIMESTAMP;
```

**The existing `pdfUrl` column**: I see two reasonable handlings — see Decision Point 1.

### Naming & retention

- Public URL: `/api/certificates/:uuid/pdf` (uuid is already the public-shareable slug)
- Filename in `Content-Disposition`: `plotzy-certificate-<first-8-chars-of-uuid>.pdf` (short, identifiable, no PII)
- Retention: forever — certificates are immutable and small. No GC.
- Public endpoint, no auth (matches the existing `GET /api/certificates/:uuid` verification endpoint's threat model: anyone with the UUID can verify or download — that's the point of a shareable cert)

---

## Part 2: Generation library

### Options considered

| Library | Bundle | Approach | Typography | RTL | Verdict |
|---|---|---|---|---|---|
| **pdfkit** | ~3MB | Imperative drawing API (move cursor, draw text/lines) | Excellent | Manual workaround needed | ✅ Recommended |
| @react-pdf/renderer | ~6MB | Declarative JSX-style components | Good (Flexbox-like) | Slightly better than pdfkit but still manual | Viable alternative |
| puppeteer / playwright | ~150-300MB (Chromium) | Render existing HTML→PDF | Best (full browser CSS) | Native | **Killed**: bundle size impossible for serverless |
| pdf-lib | ~1MB | Modify existing PDF templates | N/A (fills forms) | N/A | Wrong tool — we're generating, not templating |
| jspdf | ~1MB | Browser-first, simple | Limited fonts | Limited | Mediocre Node-side |

### Recommendation: pdfkit

**Why**:
- Smallest bundle of the viable options (~3MB vs 6MB for @react-pdf, 150MB+ for puppeteer)
- Mature, battle-tested, npm-weekly ~1M downloads
- Manual layout fits a single-page cert with fixed structure
- Custom font registration is straightforward (point to `.ttf` / `.otf`, register, use)
- Works in any Node environment (no headless browser, no native deps beyond the bundle)

**Trade-off**: imperative API (we position elements with explicit coordinates) vs @react-pdf's JSX. For a single static layout that won't change often, imperative is fine — we write the layout once, never touch it. For complex per-cert variations, @react-pdf would win; we don't have those.

**Alternative if Faris prefers JSX**: @react-pdf/renderer. Adds 3MB and gives us shareable React-style components. Worth the extra weight only if we plan to render many PDF types (invoices, summaries, etc.) in the future. For v1's single cert layout, pdfkit is leaner.

---

## Part 3: Template design

### Layout

**Orientation**: Landscape A4 (842pt × 595pt at 72dpi). Traditional certificate orientation; matches what people print and frame.

**Margins**: 60pt all sides → printable area 722pt × 475pt.

**Visual structure** (top to bottom, all centered horizontally):

```
┌──────────────────────────────────────────────────────────┐
│  ╔═     [decorative gold border ornament]            ═╗  │ ← 2pt double-line frame inset 30pt from edge
│ ║                                                     ║  │
│ ║                  [Plotzy logo, 60pt]                ║  │ ← top, 90pt from top edge
│ ║                                                     ║  │
│ ║              PLOTZY WRITING COURSE                  ║  │ ← 9pt, tracking widely, sans, muted
│ ║                                                     ║  │
│ ║         Certificate of Completion                   ║  │ ← 32pt serif, primary color
│ ║                                                     ║  │
│ ║                  Awarded to                         ║  │ ← 11pt, muted
│ ║                                                     ║  │
│ ║                   Jane Doe                          ║  │ ← 26pt, sans, semi-bold, foreground
│ ║                                                     ║  │
│ ║       for successfully completing                   ║  │ ← 11pt, muted
│ ║       How to Write Your First Book                  ║  │ ← 14pt sans, semi-bold, foreground
│ ║                                                     ║  │
│ ║   ─────────────────────────────────────────         ║  │ ← thin divider line
│ ║                                                     ║  │
│ ║   FINAL EXAM SCORE        ISSUED                    ║  │ ← 8pt tracking-wider, muted
│ ║         88%             May 6, 2026                 ║  │ ← 12pt foreground
│ ║                                                     ║  │
│ ║              ⛨ Verified by Plotzy                   ║  │ ← 9pt with tiny shield mark
│ ║         abc12345-def6-7890-1234-567890abcdef        ║  │ ← 8pt mono
│ ║                                                     ║  │
│ ║         Verify at plotzy.<tld>/certificates/abc12345 ║  │ ← 8pt, muted
│ ║                                                     ║  │
│  ╚═                                                  ═╝  │
└──────────────────────────────────────────────────────────┘
```

### Color palette

Match Plotzy brand without locking to specific Tailwind tokens (PDF can't read CSS variables). Hex values approximated from existing brand:

- **Background**: `#FAFAF7` (warm off-white, not pure white — matches the "library / paper" register of the course)
- **Primary text**: `#1A1A2E` (deep navy — readable, formal)
- **Accent border**: `#8B6F47` (muted gold/burgundy — matches the brand without screaming)
- **Muted text**: `#6B6B6B` (neutral grey)

### Typography

Two-font system:

- **Headers** ("Certificate of Completion", course title): **Lora** (serif, free Google Fonts, OFL license). Has full Latin + Cyrillic + extended sets. Falls back to system serif if registration fails.
- **Body** (everything else): **Inter** (sans, OFL, already aesthetically aligned with Plotzy frontend). Good Latin + Cyrillic.
- **UUID**: **JetBrains Mono** or system mono.

Font files to bundle (download from Google Fonts repo, ship in `artifacts/api-server/src/assets/fonts/`):
- `Lora-Regular.ttf` (~80KB)
- `Lora-SemiBold.ttf` (~80KB)
- `Inter-Regular.ttf` (~300KB — large because Inter has many glyphs; can use the subsetted version)
- `Inter-SemiBold.ttf` (~300KB)
- Total: ~760KB added to repo / bundle

### Decorative elements

- **Frame**: 2pt rule rectangle inset 30pt from page edge, accent gold color
- **Corner ornaments**: simple 4pt L-shapes at each corner of the inner frame, accent gold (matches the existing CertificateDisplay corner brackets)
- **Logo**: render `plotzy-logo.png` at top center, 60pt height, original aspect ratio
- **Shield mark**: small SVG-traced shield (drawn with pdfkit primitives, ~10pt) next to "Verified by Plotzy" — avoids needing a separate image

### Single-page constraint

Hard-coded — no overflow logic needed. If the holder name overflows, truncate with ellipsis at the storage layer (cap displayName to ~60 chars during issuance).

---

## Part 4: API integration

### New endpoint

```
GET /api/certificates/:uuid/pdf
```

- **Auth**: PUBLIC (matches `GET /api/certificates/:uuid` — same threat model)
- **Rate limit**: `publicReadLimiter` (same as the verification endpoint)
- **Lookup**: by `certificateUuid` (matches the existing path param)
- **Logic**:
  1. Lookup cert by uuid. 404 if not found.
  2. If `pdf_data IS NOT NULL`: serve cached bytes. ✓
  3. Else: fetch holder's display name + course title, generate PDF, write back to DB (`UPDATE ... SET pdf_data = ... WHERE id = ... AND pdf_data IS NULL`), then serve. The conditional `WHERE pdf_data IS NULL` handles the concurrent-first-download race (one INSERT wins; re-fetch on the loser).
- **Response headers**:
  - `Content-Type: application/pdf`
  - `Content-Disposition: inline; filename="plotzy-certificate-<uuid-prefix>.pdf"` (browser shows inline; "Save as" still available)
  - `Cache-Control: public, max-age=31536000, immutable` (1 year, immutable — cert content never changes once generated)
  - `Content-Length: <bytes>`

### New storage methods

```typescript
// Returns PDF bytes for the cert with this uuid, or null if not yet generated.
getCertificatePdfData(uuid: string): Promise<Buffer | null>

// Stores PDF bytes for the cert. Conditional on existing pdf_data IS NULL
// to avoid overwriting concurrent generation. Returns true if this call
// won the race (was the one that wrote), false if a concurrent call beat us.
setCertificatePdfData(uuid: string, pdfBuffer: Buffer): Promise<boolean>
```

(Renamed from `setCertificatePdfUrl` per Decision Point 1.)

### Frontend integration

Add a "Download PDF" button to [`certificate-verify.tsx`](artifacts/plotzy/src/pages/certificate-verify.tsx) — links directly to `/api/certificates/:uuid/pdf` with `download` attribute. Tiny change, one button + one i18n key (`courseCertDownloadPdf` = "Download PDF").

No download button on the in-app `/learn` cert preview (the preview uses `CertificateDisplay` which renders inline) — but we could add one. Decision Point 6 covers this.

---

## Part 5: Generation flow

### Options considered

| Option | Pros | Cons |
|---|---|---|
| A. At-issuance (generate + store when user passes final exam) | PDF instantly available on first download. Generation failure surfaces during issuance flow, can retry. | Slows the issuance API response by ~1-2s. Wasted CPU + storage if user never downloads. |
| B. Lazy on first download (current schema design) | Issuance API stays fast. Zero waste for users who never download. | First download has gen-time latency (~500ms-2s). Concurrent first-downloads need conflict-handling. |

### Recommendation: B (lazy)

**Why**:
- Schema comment at [index.ts:874](lib/db/src/schema/index.ts#L874) explicitly says "`pdfUrl` is populated lazily on first download" — matches the existing design intent
- 1-2s extra latency on the **issuance** API (which fires from the final-exam-pass flow with confetti redirect to `/certificates/:uuid?just-issued=true`) is more disruptive than 1-2s on **first download** (a deliberate user action where some wait is expected)
- The concurrent-generation race is solved by the conditional `UPDATE ... WHERE pdf_data IS NULL` in `setCertificatePdfData` — both calls succeed at generation, only one wins the write, the other's bytes are discarded. Wasteful, but only on the first concurrent request — every subsequent request hits the cached version.

### Failure handling

If PDF generation throws (font load fails, pdfkit error, etc.):
- The endpoint logs the error with structured context
- Returns 500 with a generic message
- Cert row stays with `pdf_data NULL` — next download attempt re-tries
- Issuance was unaffected — the cert exists, the in-browser HTML cert (`CertificateDisplay`) still works, only the PDF download is broken

This is the right failure mode for a "nice-to-have" feature — the cert itself is never broken by PDF problems.

---

## Part 6: i18n considerations

### Per-language complexity tiers

| Tier | Languages | Font requirement | RTL needed | Shaping complexity |
|---|---|---|---|---|
| 1 (trivial) | en, fr, es, de, pt, tr | Standard Latin (Inter + Lora cover) | no | none |
| 1b (Cyrillic) | ru | Latin + Cyrillic (Inter + Lora cover) | no | none |
| 2 (CJK) | zh, ja, ko | Noto Sans CJK SC/TC/JP/KR (~10MB each) | no | minimal |
| 3 (Arabic family) | ar, fa | Noto Naskh Arabic / Amiri (~500KB) | **yes** | complex (joining, ligatures) |
| 4 (Hebrew) | he | Noto Sans Hebrew (~500KB) | **yes** | minimal |
| 5 (Devanagari) | hi | Noto Sans Devanagari (~500KB) | no | complex (conjuncts) |

### Per-tier costs

- **Tier 1+1b** (en + fr + es + de + pt + tr + ru): **free** — Inter + Lora already chosen and small. Ship together. ~7 languages, 1 font registration block.
- **Tier 2** (zh + ja + ko): adds ~30MB to bundle (one Noto Sans CJK per script). Probably load lazily based on locale. Significant bundle hit.
- **Tier 3** (ar + fa): ~500KB font + manual RTL handling in pdfkit. Pdfkit has `features` and `rtl` options on `text()` but full Arabic shaping requires a font with proper joining behavior; needs testing per glyph. Estimated ~half-day of testing per language to confirm acceptable rendering.
- **Tier 4** (he): ~500KB font + RTL toggle. Simpler than Arabic.
- **Tier 5** (hi): ~500KB font + Devanagari shaping (works mostly out of the box with Noto + pdfkit's font rendering, but conjuncts need verification).

### Recommendation: English-only for v1 → add tiers post-launch

**Why**:
- Holder count at launch will be small; majority will be English-speaking based on initial marketing
- The PDF is the "official keepsake" — having ONE high-quality English PDF beats having 14 mediocre PDFs with rendering issues
- The in-browser cert via `CertificateDisplay` still respects the viewer's language for in-app viewing — users see localized cert in browser, English when downloaded
- Adding tiers later is additive — no breaking change, just register more fonts and pick translation per `holder.language` (or per accept-language header)

**Pre-launch deliverable**: ship Tier 1 English-only. Capture `holder.language` at issuance time (added to schema) so future-us can render in the holder's language at download time without needing to ask.

---

## Part 7: i18n fallback strategy

When tiers 2-5 ship later:

- If a font for the user's language fails to load (file missing, registration error): **fall back to English** (default font registration always succeeds because Inter + Lora are bundled).
- Don't try a "mixed" rendering (some text in user lang, fallback for missing fonts) — produces uncanny-valley output that looks broken.
- Log the font-load failure with structured context for diagnosis.

For v1 (English-only), **no fallback needed** — all paths render in English.

---

## Part 8: Decision points

These need your call before Phase B begins.

### DP1 — schema column for the PDF bytes

**Question**: How do we wire the new `bytea` column relative to the existing `pdfUrl: text` column?

**Options**:
- **A.** Add `pdfData bytea` only. Drop `pdfUrl` entirely (it was a placeholder for an external URL we're no longer using). Use `pdf_data IS NOT NULL` as the "is generated?" check.
- **B.** Add `pdfData bytea`, keep `pdfUrl text` (re-purpose as "self-link to /api/certificates/:uuid/pdf" populated when data exists). Doubles as "is generated?" flag without loading the bytes.
- **C.** Add `pdfData bytea` + `pdfGeneratedAt timestamp`. Keep or drop `pdfUrl` separately. Timestamp is useful for diagnostic but not strictly needed.

**My recommendation**: **B** with optional addition of `pdfGeneratedAt`. Re-purposing `pdfUrl` as the "ready" flag avoids loading the bytes just to check existence. `pdfGeneratedAt` is cheap and useful for "regenerate any cert older than X" cleanup later.

### DP2 — generation library

**Question**: pdfkit (recommended) vs @react-pdf/renderer (JSX)?

**Options**:
- **A. pdfkit** — 3MB, imperative, manual layout. Recommended for v1's single static cert.
- **B. @react-pdf/renderer** — 6MB, declarative JSX. Easier to iterate if we expect to add more PDF types later (invoices, course summaries, etc.).
- **C. Other** (e.g., pdf-lib + custom template) — unlikely viable; flagged for completeness.

**My recommendation**: **A**.

### DP3 — i18n scope for v1

**Question**: How many languages does the v1 PDF support?

**Options**:
- **A. English-only** — simplest, ships fastest. Recommended.
- **B. Tier 1+1b** (7 languages: en, fr, es, de, pt, tr, ru) — free addition since Inter + Lora cover them.
- **C. All 14** — significantly delays v1 (font weight + RTL testing for ar/fa/he + CJK fonts).

**My recommendation**: **A**, with `holder.language` captured at issuance time so we can add tiers post-launch without breaking existing certs.

### DP4 — generation timing

**Question**: Generate at issuance (Option A) or lazily on first download (Option B)?

**Options**:
- **A. At-issuance** — PDF instantly ready after final exam pass.
- **B. Lazy on first download** — matches schema design intent; faster issuance flow.

**My recommendation**: **B** — matches the explicit schema comment.

### DP5 — fonts: ship in repo or download at runtime?

**Question**: Do we commit the .ttf font files (~760KB total for Tier 1) into the repo, or download them at server startup?

**Options**:
- **A. Commit fonts** (`artifacts/api-server/src/assets/fonts/`) — adds 760KB to git. Server startup is faster. No runtime network dependency.
- **B. Download at startup** from Google Fonts mirror — keeps repo lean. Adds startup latency + a runtime dependency on the font CDN.
- **C. Download at first PDF generation** — same as B but lazier.

**My recommendation**: **A**. 760KB once-only repo cost vs ongoing runtime risk. Fonts are versioned content; pin via repo.

### DP6 — frontend download button placement

**Question**: Where does the "Download PDF" button appear?

**Options**:
- **A. Public verify page only** ([certificate-verify.tsx](artifacts/plotzy/src/pages/certificate-verify.tsx)) — anyone with the UUID (including the holder via the just-issued redirect) can download.
- **B. Public verify page + an in-app button** somewhere in `/learn` after issuance.
- **C. Public verify page + a button in the user's profile / settings.**

**My recommendation**: **A**. The redirect-with-confetti to `/certificates/:uuid?just-issued=true` already takes the holder there immediately after issuance. Adding the button on that page covers both the holder's first download and any subsequent visitor. Other surfaces are easy to add later.

---

## Phase B sub-batches (preview, contingent on Phase A approval)

Numbers are estimates contingent on the decisions above (assumes my recommendations).

| Sub-batch | Work | Estimate |
|---|---|---|
| **B1** | Install `pdfkit`. Add `pdfData bytea` + `pdfGeneratedAt` columns + `holder_language` column. Drizzle push. Update storage interface + add `getCertificatePdfData` / `setCertificatePdfData` methods. | ~1.5h |
| **B2** | Bundle 4 font files (Lora-R, Lora-SB, Inter-R, Inter-SB) into `artifacts/api-server/src/assets/fonts/`. Build the PDF generation function (single-page A4 landscape, layout per Part 3). Verify with a CLI smoke script that produces a sample cert PDF on disk. | ~2.5h |
| **B3** | Add `GET /api/certificates/:uuid/pdf` route. Lazy generation flow. Cache headers. Concurrent-write race handling. | ~1h |
| **B4** | Add download button to `certificate-verify.tsx` + i18n key. | ~30 min |
| **B5** | Defer (post-launch): Tier 1+1b multi-language fonts + RTL handling. | (deferred) |
| **B6** | End-to-end smoke test via deployed UI: pass final exam → cert issued → redirect to verify page → click download → PDF opens correctly. | ~1h |

**Total v1 (B1-B4 + B6)**: ~6.5 hours, well under the original ~8h estimate.

---

## Summary of decisions needed (recap)

| DP | Question | My recommendation |
|---|---|---|
| 1 | Schema column wiring | B + optional `pdfGeneratedAt` |
| 2 | Library | pdfkit |
| 3 | i18n scope v1 | English-only (capture `holder.language` for later) |
| 4 | Generation timing | Lazy on first download |
| 5 | Fonts: ship in repo or download | Ship in repo (760KB) |
| 6 | Download button placement | Public verify page only (v1) |

After your call on these 6, I'll proceed to Phase B starting with B1 (install + schema). I'll show diffs before each commit.
