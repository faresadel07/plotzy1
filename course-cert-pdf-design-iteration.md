# Certificate PDF — Design iteration (Batch 3.2 / B2 + B3)

**Status**: ✅ **B2 + B3 SHIPPED** to master 2026-05-06.

| Sub-batch | Commit | Merge | What |
|---|---|---|---|
| B1 — storage layer | `cf51107` | `819c8d5` | Schema migration, race-safe storage methods |
| **B2 — PDF generation** | `d97f629` | `3a2df65` | renderCertificatePdf() via pdf-lib + template overlay |
| **B3 — download endpoint** | `6aae4b2` | `a5fc383` | GET /api/certificates/:uuid/pdf with lazy gen + race-safe write |

**Master tip**: `a5fc383`.
**Pivot during B2** (kept as historical record below): the original pdfkit-primitive-drawing implementation was discarded mid-batch when Faris produced a designed template. The shipped B2 uses pdf-lib + @pdf-lib/fontkit to overlay 4 text fields onto the template instead. Coordinate iteration: holder name fromTopY went 290 → 360 → **325** across 3 visual review rounds.

**What's left for course launch**:
- B4 — Frontend download button on `/certificates/:uuid` page (~30 min)
- B6 — End-to-end smoke test via deployed UI (~1h)
- Then final QA across the full course flow

The original "PAUSED" notes follow as historical record — left in place because the font-sourcing diagnosis (variable fonts → fontkit subsetting issues → static .ttf from upstream) is the kind of detail a future maintainer might need.

---

## Original notes from the design-iteration pause

**Pause date**: 2026-05-06 (resolved same day).
**Resume trigger**: Faris returned with the designed template PDF (saved to `artifacts/api-server/src/assets/certificate-template.pdf` after I copied it from his OneDrive Desktop).

---

## Current implementation (working tree, uncommitted)

**Branch**: `feat/course-batch-3-2-certificate-pdf` (B1 already merged
to master at `819c8d5`; this branch carries the B2 work).

**Tracked-file modifications**:
| File | Change |
|---|---|
| `artifacts/api-server/build.mjs` | Added asset-copy step (`src/assets/` → `dist/assets/`) so fonts + logo end up in the deployed bundle. |
| `artifacts/api-server/package.json` | Added `pdfkit ^0.18.0` + `@types/pdfkit ^0.17.6` runtime deps. `@fontsource/lora` and `@fontsource/inter` were temporarily added during font-sourcing exploration and have been cleanly removed (verified in package.json). |
| `pnpm-lock.yaml` | pdfkit + transitive dep updates. |

**New untracked files**:
| Path | Purpose |
|---|---|
| [`artifacts/api-server/src/services/certificate-pdf.ts`](artifacts/api-server/src/services/certificate-pdf.ts) | The `renderCertificatePdf()` pure function + `verifyCertificatePdfAssets()` startup check. Layout follows the approved B2 design doc — landscape A4, Lora SemiBold title, Inter SemiBold holder name, two-column score/issued row, "VERIFIED BY PLOTZY" footer in caps with tracking. |
| `artifacts/api-server/src/assets/plotzy-logo.png` | Copy of `artifacts/plotzy/public/plotzy-logo.png` (2048×2048 RGBA, 317KB). Embedded at 60pt height. |
| `artifacts/api-server/src/assets/fonts/Lora-Regular.ttf` | 198KB, OFL, from cyrealtype/Lora-Cyrillic. |
| `artifacts/api-server/src/assets/fonts/Lora-SemiBold.ttf` | 219KB, OFL, from cyrealtype/Lora-Cyrillic. |
| `artifacts/api-server/src/assets/fonts/Inter-Regular.ttf` | 412KB, OFL, from rsms/inter v4.1 release zip (`extras/ttf/`). |
| `artifacts/api-server/src/assets/fonts/Inter-SemiBold.ttf` | 420KB, OFL, from rsms/inter v4.1 release zip (`extras/ttf/`). |
| `artifacts/api-server/src/assets/fonts/README.md` | Sources, SHA-256 hashes, license, why-static-not-variable rationale. |
| [`artifacts/api-server/scripts/render-test-cert.ts`](artifacts/api-server/scripts/render-test-cert.ts) | Throwaway smoke test that renders the 5 test cases. **Delete before final commit.** |
| `artifacts/api-server/tmp-cert-pdfs/01-baseline-jane-doe.pdf` etc. | 5 generated PDFs. **Faris keeping these as design references during iteration.** |

**Heads-up**: there is no `.gitignore` rule that would exclude `tmp-cert-pdfs/`. If anyone runs `git add .` from the repo root, those PDFs would be staged. Not a problem during the pause, but worth either deleting after Faris's iteration completes OR adding `tmp-cert-pdfs/` to `artifacts/api-server/.gitignore` (which doesn't exist yet) before resuming work.

---

## What works in v1 (the baseline Faris signed off on)

- Layout: A4 landscape, single page, ~263KB per generated PDF
- Logo: top center, 60pt height, sharp at print resolution
- Title: "Certificate of Completion" in 32pt Lora SemiBold, deep navy `#1A1A2E`
- Holder name: 26pt Inter SemiBold, centered
- Course title: 14pt Inter SemiBold ("How to Write Your First Book")
- Two-column row: "FINAL EXAM SCORE" + "ISSUED" with values below
- Verification footer: "VERIFIED BY PLOTZY" caps + tracking, UUID in mono, verify URL line
- Decorative gold accent (`#8B6F47`): hairline rectangle frame + 4 L-shaped corner ornaments at 16pt × 16pt
- Race-safe storage layer (B1, already merged at `819c8d5`): `pdfData bytea` + `pdfGeneratedAt` + conditional UPDATE WHERE pdf_data IS NULL

---

## What's pending Faris's input

Faris is customizing in a graphics tool. Expected deliverables on resume:

1. **Reference PDF of the final desired design** — the visual target to match
2. **Specific color hex codes** (or screenshot for color picking) — likely changes to:
   - `PRIMARY` (currently `#1A1A2E` deep navy)
   - `ACCENT` (currently `#8B6F47` muted gold)
   - `MUTED` (currently `#6B6B6B` neutral grey)
3. **Signature PNG** (transparent background) — to embed below or near the verification footer; Faris's personal signature as the course author
4. **Layout adjustments** — any spacing / sizing / alignment changes from the baseline

---

## The 5 test cases (current results)

All generated 2026-05-06 from the baseline implementation. Files in `artifacts/api-server/tmp-cert-pdfs/`.

| # | File | Holder | Bytes | Magic | Purpose |
|---|---|---|---:|---|---|
| 1 | `01-baseline-jane-doe.pdf` | Jane Doe | 269,735 | `%PDF-1.3` | Baseline visual sign-off (approved) |
| 2 | `02-long-name.pdf` | Maria Theresa Alessandra di Castellucci-Forlani | 270,424 | `%PDF-1.3` | Long-name overflow check |
| 3 | `03-single-word-cher.pdf` | Cher | 269,745 | `%PDF-1.3` | Single-word centering |
| 4 | `04-faris-hamdan.pdf` | Faris Hamdan | 269,963 | `%PDF-1.3` | Latin-script Arabic-origin name (founder profile) |
| 5 | `05-cjk-zhang-wei.pdf` | 张伟 | 269,504 | `%PDF-1.3` | CJK fallback — expected missing-glyph boxes (v1 i18n scope) |

Layout is consistent regardless of name length (~1KB variance across all 5). Embedded fonts + logo dominate the bytes; text content is a tiny fraction.

---

## Font sourcing approach (one-time, document for future-me)

Variable fonts from Google Fonts (the official upstream) hit a fontkit subsetting bug when registered with named instances in pdfkit — `TypeError: First argument to DataView constructor must be an ArrayBuffer` at PDF finalization. Solution: **static .ttf files, one per weight**.

Sources (verified 2026-05-06):
- **Lora** Regular + SemiBold: `https://raw.githubusercontent.com/cyrealtype/Lora-Cyrillic/master/fonts/ttf/Lora-{Regular,SemiBold}.ttf`
- **Inter** Regular + SemiBold: `https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip` → `extras/ttf/Inter-{Regular,SemiBold}.ttf`

Both OFL 1.1. SHA-256 hashes pinned in `src/assets/fonts/README.md`. Total bundle: ~1.22MB across 4 .ttf files.

Things that DIDN'T work and why (so future-me doesn't repeat the search):
- **Google Fonts repo** (`google/fonts/ofl/{lora,inter}/`): only ships variable .ttf, not static
- **@fontsource/lora + @fontsource/inter** (v5.2.8): ships only .woff/.woff2, no .ttf — pdfkit needs TTF/OTF
- **Variable fonts with named instances**: pdfkit + fontkit subsetting bug, see `certificate-pdf.ts` font-loading comment for the diagnosis trail

---

## Next steps when Faris returns

1. **Apply color changes**: edit the `PRIMARY` / `ACCENT` / `MUTED` constants at the top of `certificate-pdf.ts`. ~5 min.
2. **Embed signature**: add a `SIGNATURE_PATH` constant + `doc.image(SIGNATURE_PATH, x, y, { height: 40 })` call somewhere between the divider and the verification footer (suggest below "ISSUED {date}" but above "VERIFIED BY PLOTZY"). Position adjusts with whatever layout Faris specifies. ~15 min.
3. **Layout adjustments**: edit the y-coordinate constants (Y_TITLE, Y_HOLDER, etc.) per Faris's spec. ~10-30 min depending on extent.
4. **Re-run the 5 smoke tests**: `cd artifacts/api-server && npx tsx scripts/render-test-cert.ts`. Files write to `tmp-cert-pdfs/`. ~30s.
5. **Show Faris the updated PDFs for sign-off**. Iterate until approval.
6. **On approval**:
   - Delete `artifacts/api-server/scripts/render-test-cert.ts` (the throwaway smoke test)
   - Delete `artifacts/api-server/tmp-cert-pdfs/` (or add a gitignore line first)
   - Stage: `build.mjs`, `package.json`, `pnpm-lock.yaml`, `src/services/certificate-pdf.ts`, `src/assets/` (logo + fonts + README), and the new signature asset path
   - Commit: `feat(course): add certificate PDF generation`
   - `--no-ff` merge to master, push
7. **Then proceed to B3** (API endpoint with race-safe orchestration), **B4** (download button on `/certificates/:uuid`), and **B6** (E2E smoke test).

---

## Resume checklist (one-line summary)

When Faris returns: drop new colors + signature into `certificate-pdf.ts`, re-run smoke, get sign-off, delete throwaway script, commit B2, then B3 / B4 / B6.
