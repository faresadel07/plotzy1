# Batch 2.7 B2 — Hero Images (27 lessons)

Phase A design doc. Awaiting approval before any image generation
or download. Built on top of B1 (component primitives shipped).

---

## Summary

- **27 heroes total**, one per lesson
- **22 AI-generated** (atmospheric / conceptual heroes)
- **5 modern photographs** (M5 L3, M5 L5, M6 L1, M6 L3, M6 L5 —
  pragmatic-register lessons where AI atmosphere would
  over-aestheticise the content)
- **0 PD-anchored heroes** — PD literary art lands as **inline**
  images in B3, not as banners. (Detail in §4 below.)
- **Cost**: ~$1.60 in OpenAI calls (well under DP5's <$5 budget)
- **Single commit**: `feat(course-visuals): add hero images for all 27 lessons`

---

## §1. Locked AI prompt template (STYLE LOCK)

Per DP5, all AI heroes use a single locked style envelope so the
course feels visually cohesive. Only the `{{SUBJECT_CLAUSE}}`
varies per lesson.

```text
{{SUBJECT_CLAUSE}}, photographed in the style of warm editorial
literary-magazine photography. Soft natural light from one direction
(prefer raking afternoon or early-morning), shallow depth of field,
muted earth-tone palette (warm wood, cream, pale sage, soft grey,
honey amber). Low contrast. No saturated colors. No people in frame
unless explicitly named in the subject clause. Quiet, contemplative
mood. Composition leaves 15% breathing room top and bottom — central
70% must hold the subject — for safe cropping to a 21:9 cinematic
banner. Realistic, not illustrative. No text, no logos, no
watermarks, no captions in the image.
```

**Why this style.** The course's voice across M1–M6 has been
*humane, restrained, aphoristic-where-natural*. Saturated colours,
hard contrast, or stylised illustration would clash. Editorial
literary-magazine photography (think *The Paris Review*, *Granta*,
*The New York Review of Books* photo essays) matches the prose
voice without being precious about it.

---

## §2. The 5 test lessons (5-test gate)

Selected to span every register the locked template must handle:

| # | Lesson | Register | SUBJECT_CLAUSE |
|---|---|---|---|
| 1 | **M1 L1** `foundation-what-is-story` | Literary theory | A single ceramic coffee cup on a wooden writing desk beside an open hardcover book, late-afternoon raking light through a window left of frame, a single shaft of dust visible in the light beam, no figures |
| 2 | **M2 L1** `architecture-three-acts` | Classical / structural | A fragment of a weathered Greek temple pediment in soft morning side-light, ionic columns and partial triangular gable visible, no figures, pale stone against a muted sky |
| 3 | **M3 L1** `characters-protagonist-wound` | Abstract / emotional | A pair of empty hands resting on an old kitchen table, no face shown, weak northern light through a half-drawn linen curtain, a single chipped enamel mug nearby, sense of quiet waiting |
| 4 | **M4 L2** `world-sensory-writing` | Multi-sensory technical | A domestic kitchen interior at mid-morning — warm light through a gauze curtain, a cast-iron radiator catching reflected light, a square of butter softening on the counter, a small cluster of strawberries ripening on the windowsill, no figures (this mirrors the actual prose paragraph used in the lesson body) |
| 5 | **M5 L1** `process-blank-page` | Practical / process | A single sheet of cream-coloured paper on a dark wooden desk, an uncapped fountain pen lying diagonally beside it, a small ceramic ink bottle, low side-light from the right, no figures |

If the 5-set reads as a coherent visual family at a glance, the
template generalises to the remaining 17 AI heroes. If any of the
5 looks stylistically off, we adjust the locked envelope before
bulk generation.

---

## §3. Output dimensions and format

| Spec | Value |
|---|---|
| `gpt-image-1` size param | `1536x1024` (largest landscape the model supports) |
| Source aspect | 3:2 (1.50) |
| Display aspect | 21:9 cinematic via `<Hero>` (`object-cover` crops top/bottom evenly) |
| API output | PNG, base64-encoded, ~1–3 MB per image |
| Stored output | JPEG q=82 + WebP q=82 via `sharp` pipeline (admin-time, not runtime) |
| Storage path | `artifacts/plotzy/public/course-visuals/heroes/{slug}.{jpg,webp}` |
| Target file size | <120 KB JPEG, <90 KB WebP |
| Hero call | `<Hero src="/course-visuals/heroes/{slug}.jpg" webpSrc="/course-visuals/heroes/{slug}.webp" alt="…" />` |

**Generation script.** A one-off admin script
`lib/db/scripts/generate-course-heroes.ts` that:
1. Reads the per-lesson SUBJECT_CLAUSE table (committed alongside the script).
2. Calls `openai.images.generate({ model: "gpt-image-1", size: "1536x1024", prompt: STYLE + SUBJECT })` for each lesson.
3. Decodes b64 → PNG → `sharp` → JPEG q=82 + WebP q=82.
4. Writes both files to `public/course-visuals/heroes/`.
5. Throttled to 1 request / 1.5s. Hard-gated behind
   `process.env.ADMIN_GENERATE === "1"` so it never auto-runs.
6. Logs cost (~$0.06 per image, 22 × $0.06 ≈ $1.32) and exits clean.

**Cost sanity-check.** 5 test images + 22 bulk = 27 × $0.06 ≈ **$1.62**.
DP5 budget cap was <$5. We're at 1/3 of cap.

**Why JPEG+WebP, not just one.** WebP saves ~25–35% over JPEG, but
Safari < 14 / iOS < 14 don't support it. `<picture>` with WebP source
+ JPEG fallback is the standard browser-graceful pattern (already
wired into the `<Hero>` component via the `webpSrc` prop).

---

## §4. PD literary art for Modules 1–4 — *applies to inlines (B3), not heroes*

Honest clarification: per the visual design inventory, **all 22
M1–M4 heroes are atmospheric/conceptual** (still life, doorway,
hands, kitchen, classical pediment, etc.). None are literally a PD
literary illustration — those land as **inline images in B3**.

For transparency, here is the **PD inline shortlist** that B3 will
consume (so any concerns can be flagged now, before the inline batch):

| Lesson | PD asset | Wikimedia Commons category / file |
|---|---|---|
| M2 L1 | Aristotle bust photograph | *Aristotle Altemps Inv8575.jpg* (PD sculpture + PD photograph) |
| M2 L1, M2 L4, M3 L3, M3 L4, M4 L1 | Hugh Thomson 1894 P&P illustrations | category: *Pride and Prejudice illustrations by Hugh Thomson* |
| M2 L2 | Beowulf manuscript first folio | *Beowulf Cotton MS Vitellius A XV f. 132r* (British Library, PD) |
| M2 L2 | Grimms' fairy-tale frontispiece (1812 first edition) | category: *Kinder- und Hausmärchen 1812* |
| M2 L3, M3 L4, M4 L2, M4 L3, M4 L4 | Phiz (Hablot Knight Browne) Dickens illustrations | category: *Illustrations by Hablot Knight Browne* |
| M3 L1 | Pip & Estella; Heathcliff; Jane Eyre red room; Edmond Dantès cell | various PD illustrators (1860s–1900s) |
| M3 L3 | Iago/Othello — Henry Fuseli c.1796; Javert — Émile Bayard, *Les Mis* 1862 | Wikimedia PD |
| M4 L1, M4 L3 | Brontë moor — Charles E. Brock c.1900 | Wikimedia PD |
| M4 L2 | Madame Bovary illustrations — 1880s editions | Wikimedia PD |

**Each candidate will be re-verified** against actual Wikimedia file
existence and license metadata as part of B3 (not now). Any
fail-to-verify item gets substituted before download.

**One pre-flagged failure**: I had originally planned Rockwell Kent's
1930 *Moby-Dick* illustrations for M4 L3. **Kent died in 1971;
copyright runs until 2041**. Substituting with a 19th-century PD
whaling print (Currier & Ives whaler engravings, or Cornelius
Krieghoff). Logging this as a B3 verification action — not pursuing
Kent.

---

## §5. Modern photography for Modules 5–6

5 heroes treated as modern photo rather than AI:

| Lesson | Hero descriptor | Source plan |
|---|---|---|
| M5 L3 `process-revision-passes` | manuscript with red marks | **Unsplash** search: *"manuscript red pen edit"* — top-down marked-up paper, no faces |
| M5 L5 `process-when-to-stop` | hand closing a book | **Unsplash** search: *"hand closing book"* — single hand on cover, neutral palette |
| M6 L1 `publishing-self-vs-traditional` | road fork | **Unsplash** search: *"forest path fork"* — two paths diverging, soft natural light |
| M6 L3 `publishing-audience` | small group of readers | **Unsplash** search: *"book club small group"* — 3–5 people, B&W or with faces obscured |
| M6 L5 `publishing-after-launch` | empty chair at sunrise | **Unsplash** search: *"empty chair window dawn"* — single chair, warm light |

**License**: Unsplash License (free commercial, no attribution
legally required, but I'll attribute as a courtesy via the `<Hero
source>` prop — photographer name + Unsplash link).

**Fallback**: Pexels (also free commercial) if Unsplash is thin on
any specific query.

**Rationale for photo over AI here.** M5–M6 are
pragmatic-register modules whose lessons explicitly rebuke
performance-literariness (M5 L1 anti-romanticisation, M5 L2
Trollope's pragmatism, M6 L1 anti-aesthetic-treatment of the
self-vs-traditional path choice). AI editorial photography would
*over-aestheticise* what these lessons argue should feel ordinary.
Real photos of red-pen marks, real hands on real books, real
forest forks match the "ship the work" voice better than AI
atmospherics.

**Trollope-echo lessons** (M5 L2 hero, M6 L5 hero) — the
Trollope portrait is the **inline anchor in B3**, not the banner.
The hero stays atmospheric (for M5 L2: AI) or modern-photo (for
M6 L5: photo of empty chair at dawn). The portrait does its
pedagogical work mid-lesson where the reader is already engaged,
not at the top where banners get scrolled past.

---

## §6. Per-lesson hero allocation (full table)

| Lesson | Hero treatment | Notes |
|---|---|---|
| M1 L1 `foundation-what-is-story` | **AI** | TEST 1 |
| M1 L2 `foundation-why-people-read` | AI | empty chair + open book |
| M1 L3 `foundation-finding-idea` | AI | sticky-note grid |
| M1 L4 `foundation-three-ingredients` | AI | abstract 3-piece arc |
| M2 L1 `architecture-three-acts` | **AI** | TEST 2 — classical pediment |
| M2 L2 `architecture-heros-journey` | AI | doorway / threshold |
| M2 L3 `architecture-beat-sheets` | AI | timeline / grid |
| M2 L4 `architecture-choosing-structure` | AI | road fork (decision tree) |
| M3 L1 `characters-protagonist-wound` | **AI** | TEST 3 — empty hands |
| M3 L2 `characters-backstory` | AI | iceberg |
| M3 L3 `characters-antagonist` | AI | chess board |
| M3 L4 `characters-supporting-cast` | AI | ensemble silhouettes |
| M3 L5 `characters-dialogue` | AI | two faces / speech-bubble negative space |
| M4 L1 `world-show-dont-tell` | AI | window-onto-scene |
| M4 L2 `world-sensory-writing` | **AI** | TEST 4 — kitchen multi-sense cues |
| M4 L3 `world-setting-as-character` | AI | atmospheric moor / fog |
| M4 L4 `world-description-pace` | AI | clean still life |
| M5 L1 `process-blank-page` | **AI** | TEST 5 — blank page + pen |
| M5 L2 `process-first-draft` | AI | postal clerk's watch (Trollope echo) |
| M5 L3 `process-revision-passes` | **photo** | manuscript with red marks |
| M5 L4 `process-self-editing` | AI | red-pencilled paragraph close-up |
| M5 L5 `process-when-to-stop` | **photo** | hand closing a book |
| M6 L1 `publishing-self-vs-traditional` | **photo** | road fork |
| M6 L2 `publishing-cover-blurb` | AI | book on shelf, atmospheric |
| M6 L3 `publishing-audience` | **photo** | small group of readers |
| M6 L4 `publishing-marketing` | AI | reader holding book, atmospheric |
| M6 L5 `publishing-after-launch` | **photo** | empty chair at sunrise |

Tally: **22 AI** + **5 photo** = 27 ✓

---

## §7. Phase B sequence (after this Phase A is approved)

1. Write `lib/db/scripts/generate-course-heroes.ts` (admin-gated;
   reads SUBJECT_CLAUSE table from a sibling `.json`).
2. Run for the **5 test lessons only** (test 1–5 in §2).
3. Show the 5 PNGs as a single batch in chat. Style approval gate.
   - If approved → step 4.
   - If template needs adjustment → revise locked envelope, regenerate the 5.
4. Bulk-generate the remaining **17 AI heroes**.
5. In parallel: source the **5 modern photos** from Unsplash (no
   per-image approval per spec — sources flagged up front). Run
   sharp pipeline on those too for size parity.
6. Wire the 27 heroes into the lesson page via the visuals config
   that B1's design doc named (`lib/visuals/lesson-visuals.ts` —
   built lightweight here, expanded in B3).
7. Single commit: `feat(course-visuals): add hero images for all 27 lessons`.
8. `--no-ff` merge to master + push.

---

## §8. What I need from you to start Phase B

1. **Approve the locked prompt template** (§1) — or request adjustments to palette / mood / composition rules.
2. **Approve the 5 test lessons** (§2) — or swap any.
3. **Approve dimensions/storage scheme** (§3) — 1536x1024 source, 21:9 display via `<Hero>`, JPEG+WebP under 120KB, `public/course-visuals/heroes/`.
4. **Acknowledge** the PD-is-inline-not-hero clarification (§4) — and flag any heroes you'd want me to convert from AI to PD-anchored.
5. **Approve the modern-photo source plan** (§5) — Unsplash primary, Pexels backup, 5 specific heroes.
6. **Approve the per-lesson allocation** (§6) — flag any AI→photo or photo→AI swaps you want.

After all six are approved I begin Phase B step 1 (write the
generation script), then step 2 (5 test renders), then return to
this conversation with the test images for the style approval gate.
