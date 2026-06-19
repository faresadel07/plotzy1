# Course Visual Enhancement Design

**Batch:** 2.7 (inserted between 2.6 and 3.1)
**Branch:** `feat/course-batch-2-7-visuals` (will fork from master `f8ea479`)
**Status:** Phase A — design doc for review.

---

## Audit findings (key facts shaping the design)

Three findings from the existing-Plotzy audit, before the design proper:

1. **Animation deps already installed.** `framer-motion`, `motion` (v12.35), `gsap` (v3.14), `canvas-confetti`. **No new dependencies needed.** Recommended in Part 6.
2. **AI image generation infra exists.** `openai.images.generate({ model: "gpt-image-1", size: "1024x1536" })` is wired at `routes.ts:735` for book covers, with mock-mode falling back to Unsplash placeholders. This is a real DP for the course (decision point #5 below) — we could potentially repurpose for course illustrations with cost trade-offs.
3. **No existing Image component.** Current image use across `pages/` is raw `<img loading="lazy" style={{…}}>` with inline styles. No reusable wrapper. We're building from clean ground in `components/course/`, which means we can set the convention.

---

## Part 1 — Per-lesson visual inventory

27 lessons × 5 visual columns. The compact table is the navigation map; per-lesson detail follows for exemplary cases. Legend:

- **Hero:** the top-of-page image (1 per lesson, mandatory)
- **Inline:** content-matched images embedded in lesson body (2–4 per lesson, target 80–100 total)
- **Quote:** aphoristic moments worth elevating to QuoteCard (0–3 per lesson, top 20–30 total)
- **Inter:** interactive demos (rare — only where genuinely useful)
- **Anim:** animated diagrams or scroll-reveals (0–2 per lesson)

| # | Slug | Hero | Inline | Quote | Inter | Anim |
|---|---|---|---|---|---|---|
| **M1 L1** | `foundation-what-is-story` | symbolic still life (cup + window light) | coffee scene; promotion arc; "of grief" pair; 5-line joke | 3 | 0 | story-shape arc fade-in |
| M1 L2 | `foundation-why-people-read` | empty chair + open book | empathy machine diagram; genre-as-contract grid | 2 | 0 | 0 |
| M1 L3 | `foundation-finding-idea` | 10 sticky-note grid | "what if" examples; intersection method visual | 1 | 0 | what-if generator counter |
| **M1 L4** | `foundation-three-ingredients` | 3-piece arc | character/conflict/change icons; widow-bees premise card | 2 | 0 | 3-ingredients reveal |
| **M2 L1** | `architecture-three-acts` | classical arc / pediment | Aristotle bust (PD); Freytag pyramid (animated SVG); Pride and Prejudice ball (Hugh Thomson 1894 PD) | 2 | 0 | **3-act arc draws itself** ★ |
| **M2 L2** | `architecture-heros-journey` | doorway / threshold | Odyssey illustration (PD); Beowulf MS (PD); Grimms' fairy-tale frontispiece (PD) | 1 | 0 | **circular journey diagram** ★ |
| **M2 L3** | `architecture-beat-sheets` | timeline / grid | A Christmas Carol Phiz illustrations (PD); Chekhov notebook page if available | 1 | 0 | beat-timeline reveals on scroll |
| M2 L4 | `architecture-choosing-structure` | road fork / decision tree | comparison strip of 3 lenses; Middlemarch frontispiece (PD) | 1 | 0 | **decision-tree animation** ★ |
| **M3 L1** | `characters-protagonist-wound` | hands (Pip echo) / empty kitchen | Pip-and-Estella illustration (PD); Heathcliff scene (PD); Jane Eyre red room (PD); Edmond Dantès cell (PD) | 3 | 0 | **wound→want→need flow** ★ |
| **M3 L2** | `characters-backstory` | iceberg | iceberg 10/90 diagram; Jane Eyre red room (PD) | 1 | 0 | iceberg reveal (10% then full) |
| M3 L3 | `characters-antagonist` | paired portraits / chess board | Iago/Othello scene (PD); Wickham (Hugh Thomson 1894 PD); Javert (Les Mis PD illustrations) | 2 | 0 | 0 |
| M3 L4 | `characters-supporting-cast` | ensemble cast | Sam Weller (Phiz PD); Mr/Mrs Bennet (Thomson PD); Banquo (PD) | 1 | 0 | 0 |
| **M3 L5** | `characters-dialogue` | two faces / speech bubbles | the two voice-differentiation snippets as styled cards; the milk subtext scene as styled excerpt | 2 | **dialogue voice swap (hover)** ★ | subtext layer reveal |
| **M4 L1** | `world-show-dont-tell` | window-onto-scene | "She set the cup down. Snow had begun to fall." atmospheric; ball at Netherfield (Thomson PD); moors (PD) | 1 | **show vs tell side-by-side** ★ | 0 |
| **M4 L2** | `world-sensory-writing` | kitchen scene with subtle multi-sense cues | 5-senses radar; Bleak House fog (Phiz PD); Madame Bovary fair (PD) | 1 | **sense-highlighting hover** ★ | **sense-radar fills on scroll** ★ |
| **M4 L3** | `world-setting-as-character` | atmospheric landscape (moor / fog) | Wuthering moors (PD); Bleak House fog (Phiz PD); Great Expectations marsh (Phiz PD); Moby-Dick whaler (PD) | 2 | 0 | mirror-vs-wallpaper compare |
| M4 L4 | `world-description-pace` | clean still life | Hard Times Coketown (Phiz PD); A Christmas Carol Scrooge bedroom (Phiz PD) | 2 | 0 | 0 |
| **M5 L1** | `process-blank-page` | blank page + pen | 4-causes diagram (animated); 3-tactics visual | 1 | 0 | **4-causes reveal** ★ |
| **M5 L2** | `process-first-draft` | postal clerk + watch (Trollope echo) | two-voices visual (writer-mode/editor-mode); Trollope portrait (PD) | 1 | 0 | daily-wordcount counter |
| **M5 L3** | `process-revision-passes` | manuscript with red marks | 3-pass flow diagram | 2 | 0 | **3-pass flow animation** ★ |
| M5 L4 | `process-self-editing` | red-pencilled paragraph | checklist visualisation by pass | 1 | 0 | 0 |
| **M5 L5** | `process-when-to-stop` | hand closing a book | diminishing returns curve; Trollope desk (PD if available) | 2 | 0 | **diminishing-returns curve draws** ★ |
| M6 L1 | `publishing-self-vs-traditional` | road fork | Dickens portrait (PD); Twain portrait (PD); decision tree visual | 1 | 0 | 0 |
| **M6 L2** | `publishing-cover-blurb` | book on shelf | Victorian "yellow-back" cover examples (PD); the 3-paragraph blurb structured as cards; the working blurb as styled card | 1 | 0 | 1.5-second timer demo |
| M6 L3 | `publishing-audience` | small group of readers | newsletter envelope; "200 is enough" graphic | 2 | 0 | list-grows-slowly counter |
| **M6 L4** | `publishing-marketing` | reader holding book | will-do/won't-do columns; **compound-effect chart** | 1 | 0 | **3-book compound chart** ★ |
| **M6 L5** | `publishing-after-launch` | empty chair at sunrise (Trollope echo) | diminishing curve callback; Trollope desk if available | 2 | 0 | "Now go finish the book" emphasis |

**★** = high-pedagogical-ROI animation/interactive (priorities for B4/B6).

**Totals (approximate):**
- Hero images: 27 (one per lesson)
- Inline images: ~70 (avg 2.6 per lesson; some lessons 1, others 3–4)
- Quote cards: ~38 across the course (top 20–30 will be elevated; rest stay inline as italic markdown)
- Interactive examples: 4 (M3 L5 dialogue swap, M4 L1 show-vs-tell, M4 L2 sensory hover, M6 L2 1.5-sec timer)
- Animated diagrams: ~10 (the ★-marked rows)

This is below the original 110–130 estimate because the audit found that several lessons benefit more from a single strong inline image than from 3–4 generic ones. **Quality over quantity** is the recommendation.

---

## Part 2 — Component architecture

6 components in `components/course/visuals/` (new sub-folder so course components stay organised).

### 2.1 `<Hero>`

Top-of-lesson hero — full-bleed image with title overlay.

```ts
interface HeroProps {
  src: string;                    // image URL or imported asset
  alt: string;                    // i18n key falls back to English
  caption?: string;               // optional caption (PD attribution etc.)
  /** Lesson-page renders title separately by default; set true to overlay onto image. */
  overlayTitle?: { title: string; eyebrow?: string };
  /** Aspect ratio of the hero. Default 21:9 (cinematic banner). */
  aspectRatio?: "21/9" | "16/9" | "4/3";
  className?: string;
}
```

**Design tokens:** `aspect-[21/9]` (Tailwind v4 arbitrary aspect), `bg-card`, `text-foreground`, gradient overlay `from-black/60 via-black/0`. **No hardcoded colors.**

**Performance:** preloaded for LCP via `<link rel="preload">` in lesson page header. WebP source with JPEG fallback. `srcset` for 1x/2x.

**RTL:** symmetric — no flip needed. Caption respects `dir`.

**A11y:** alt text mandatory (TS `alt: string`, not optional). If the image is decorative-only and has caption underneath, the consumer should pass `alt=""` explicitly + `role="presentation"`.

### 2.2 `<InlineImage>`

Figure with image, caption, optional source attribution. Embedded mid-content.

```ts
interface InlineImageProps {
  src: string;
  alt: string;
  caption?: string;
  /** PD attribution for sourced art (Hugh Thomson 1894 / Phiz / Wikimedia / Unsplash photographer). */
  source?: { label: string; href?: string };
  /** "centered" stays in column; "wide" breaks out to slightly wider than prose. */
  width?: "centered" | "wide";
  className?: string;
}
```

**Design tokens:** `figure rounded-lg border bg-card` for container; caption uses `text-sm text-muted-foreground italic`. Source attribution as a separate line of `text-xs`.

**Performance:** `loading="lazy"`, `decoding="async"`, intrinsic width/height to prevent CLS.

**RTL:** symmetric. Caption + source flow with `dir`.

### 2.3 `<Diagram>`

Static SVG illustration (3-act arc, iceberg, decision tree, sense radar in default state, etc.).

```ts
interface DiagramProps {
  /** SVG element or a component returning SVG. Inline for small diagrams; loaded src for larger. */
  children: React.ReactNode;
  caption?: string;
  /** ARIA label for non-decorative diagrams. */
  ariaLabel: string;
  className?: string;
}
```

**Implementation note:** these are inline SVG components (kept as TSX in `components/course/visuals/diagrams/<Name>.tsx`). Inline SVG so we can use Tailwind for color tokens (`fill-foreground`, `stroke-primary`) — keeps theme switching working. External SVG files would lose theme adaptation.

**A11y:** `role="img"` with `aria-label` mandatory. Caption acts as a `<figcaption>`.

### 2.4 `<AnimatedDiagram>`

`<Diagram>` extended with framer-motion. Used for the ~10 ★-marked animations.

```ts
interface AnimatedDiagramProps {
  children: React.ReactNode;
  ariaLabel: string;
  /** Animation trigger: in-view (scroll), on-mount (instant), on-hover, click-to-play */
  trigger?: "in-view" | "on-mount" | "on-hover" | "click";
  /** Total duration in ms. Default 1200. */
  duration?: number;
  /** Respects prefers-reduced-motion automatically. */
  reduceMotion?: boolean;
  caption?: string;
  className?: string;
}
```

**Implementation:** uses `framer-motion`'s `useReducedMotion` hook + `useInView` for scroll triggers. Animations use SVG path drawing (`pathLength`, `pathOffset`) for arc/curve reveals; `opacity + y` for label fade-ins.

**A11y:** `prefers-reduced-motion` → renders the *final* state instantly. No animation. (Critical — catches accessibility users + low-power devices.)

**Performance budget:** each animation < 50 KB transferred (mostly inline SVG). No video, no Lottie JSON files.

### 2.5 `<QuoteCard>`

Visually elevated aphoristic moment with reveal animation.

```ts
interface QuoteCardProps {
  /** The aphoristic line. */
  children: React.ReactNode;
  /** Optional small attribution under the quote (used for the few PD quotes — Aristotle, Trollope). */
  attribution?: string;
  /** "default" = inline within prose; "pull" = breaks out to wider style. */
  variant?: "default" | "pull";
  className?: string;
}
```

**Design tokens:** `font-serif text-2xl sm:text-3xl tracking-tight`, `border-s-4 border-primary` for the left-bar; padding generous; centered or left-aligned per variant.

**Animation:** subtle `opacity 0→1` + `y +12 → 0` on `useInView`. Single, gentle. Respects reduced motion.

**RTL:** `border-s-4` is logical (start), so it correctly flips to right side in Arabic.

**Pedagogical rule:** use sparingly. Top 20–30 aphorisms across the course, not every paragraph. If everything is elevated, nothing is.

### 2.6 `<InteractiveExample>`

Hover/click demos. The 4 interactive examples (M3 L5, M4 L1, M4 L2, M6 L2) each get a custom variant.

```ts
interface InteractiveExampleProps {
  /** Display modes for swapping content. */
  options: {
    label: string;            // e.g. "Voice A" / "Voice B" / "TELL" / "SHOW"
    content: React.ReactNode; // the rendered passage
  }[];
  /** Default selected option (index). */
  defaultIndex?: number;
  /** "tabs" = explicit buttons; "hover-swap" = hover left/right halves; "click-reveal" = click to flip */
  mode: "tabs" | "hover-swap" | "click-reveal";
  caption?: string;
  className?: string;
}
```

**Design tokens:** Radix-aware (uses existing `<Tabs>` primitive for the `tabs` mode); custom for hover-swap and click-reveal.

**A11y:** keyboard navigation mandatory for `tabs` mode (Radix gives us this for free). For `hover-swap`, keyboard users get tab/arrow-key fallback. For `click-reveal`, button semantics + `aria-expanded`.

**Mobile:** `hover-swap` mode degrades gracefully — taps act as toggles when hover unavailable. (Even though mobile is currently blocked, this mode should not break in inspector/touch testing.)

---

## Part 3 — Image sourcing strategy

### 3.1 Public-domain illustrations (highest reuse value)

The course's literary anchors (Pride and Prejudice, A Christmas Carol, Wuthering Heights, Great Expectations, etc.) all have illustrated PD editions on Wikimedia Commons. These give the course a **distinctive, period-coherent look** that modern stock photography can't.

| Source | What it gives us | Lessons |
|---|---|---|
| **Hugh Thomson's 1894 P&P illustrations** (Wikimedia) | Wickham, Bennets, ball scenes | M2 L1, M2 L4, M3 L3, M3 L4, M4 L1 |
| **Phiz (Hablot Knight Browne) illustrations** (Wikimedia) | Dickens novels — A Christmas Carol, Bleak House, Great Expectations, Pickwick Papers, Hard Times | M2 L3, M3 L1, M3 L4, M4 L2, M4 L3, M4 L4, M6 L1 |
| **Beowulf manuscript page** (British Library, PD) | Beowulf hero's-journey reference | M2 L2 |
| **Grimms' fairy tales original woodcuts** (Wikimedia) | Hero's journey pattern | M2 L2 |
| **Aristotle bust** (Wikimedia, PD photos of PD sculpture) | Poetics references | M1 L1, M2 L1 |
| **Trollope, Dickens, Twain portraits** (Wikimedia, PD photos) | M5 L2, M6 L1, M6 L5 |
| **Madame Bovary illustrations** (1880s editions, PD) | M4 L2 |
| **Iago/Othello scenes** (Henry Fuseli & contemporaries, PD) | M3 L3 |

Wikimedia Commons license: PD or CC0 — safe for commercial use without attribution legally required, but we'll attribute as a courtesy (the `source` prop on `<InlineImage>`).

### 3.2 Modern free-license photography

For lesson concepts that don't have a PD literary anchor (kitchen scenes, blank pages, manuscripts with red marks, atmospheric landscapes), free-license stock works.

| Source | License | Use cases |
|---|---|---|
| **Unsplash** | Unsplash License (free commercial, no attribution required) | Hero atmospherics, modern photography |
| **Pexels** | Pexels License (free commercial) | Backup for Unsplash gaps |
| **Pixabay** | Pixabay Content License (free commercial) | Some illustrations + photos |

**Style discipline (DP1 below):** if we mix PD art and modern photography, we need a coherent treatment to keep the course from feeling visually fragmented.

### 3.3 Original SVG illustrations

For diagrams (3-act arc, hero's-journey circle, beat timeline, decision tree, sense radar, iceberg, diminishing-returns curve, compound-effect chart, wound→want→need flow), we write inline SVG in `components/course/visuals/diagrams/`.

These are not "illustrations" in the photographic sense — they are **structural drawings** that need to be theme-aware (light/dark mode), animatable, and translatable.

### 3.4 AI image generation — Plotzy already has it (DP5 below)

`openai.images.generate({ model: "gpt-image-1" })` is wired in Plotzy's existing `/api/books/:id/generate-cover` route. Three options for the course:

- **Don't use it.** Source all images from PD + free stock. Zero AI cost, slower sourcing.
- **Repurpose it.** Build a one-off generation script (admin-only) that produces course illustrations matching a consistent prompt template. ~110 generations × $0.04 = ~$4–8 in OpenAI cost. Style consistency is the win.
- **Hybrid.** PD for literary anchors (the irreplaceable visuals); AI generation for kitchen scenes, blank pages, atmospheric heroes (where any photo would do but consistency matters).

This is a real DP. Recommendation in DP5.

---

## Part 4 — Animation strategy

### 4.1 Module-level animation inventory

| Module | Animation | Type |
|---|---|---|
| **M1** | story-shape arc (small); 3-ingredients reveal | scroll-in fade + path-draw |
| **M2** | **3-act arc draws itself** ★; **circular hero's-journey diagram with beat reveals** ★; beat-timeline; **decision-tree** ★ | path-draw + label fade-in |
| **M3** | **wound→want→need flow** ★; iceberg reveal | flow + shape transform |
| **M4** | mirror-vs-wallpaper compare; **sense-radar fills** ★ | in-view radial reveal |
| **M5** | 4-causes reveal; **3-pass flow** ★; **diminishing-returns curve** ★; daily-wordcount counter | sequential reveal + path-draw + counter |
| **M6** | **3-book compound chart** ★; list-grows counter | bar-chart grow-in + counter |

★ = highest pedagogical ROI (B4 priority).

### 4.2 Aphoristic moments (QuoteCard reveals)

Top 20–30 aphorisms get the visual treatment. Each fades in on scroll-into-view with a subtle `y` translate (~12px → 0). One animation per card. No floating, no parallax, no scroll-tied scrubbing. **The animation is a punctuation, not a performance.**

### 4.3 Interactive demos

- **M3 L5 — dialogue voice swap.** Two-character toggle. Hover (or tap) swaps which character is speaking. Same intent (advice to take a job), different voice. Cards show side-by-side on wide screens, stacked on narrow.
- **M4 L1 — show vs tell.** Same passage rendered both ways. Tabs (or button toggle) switch. Discussion paragraph below explains what changed.
- **M4 L2 — sensory hover.** A paragraph engages 4 senses; hovering each sense-icon (V/S/T/Sm) highlights the phrases that engage it.
- **M6 L2 — 1.5-second timer.** A demo where the user sees a sample cover for 1.5 seconds before being asked what genre/tone they recognised. Drives home the cover-as-signaling argument.

### 4.4 Micro-animations (course chrome, not lesson content)

- Lesson-completion celebration: small green checkmark draw-in (no confetti — confetti is reserved for the certificate moment per Batch 1.3 DP7/G3).
- Quiz answer reveal: correct = green pulse (single, gentle); wrong = small horizontal shake. Already partially in QuizQuestion component's review mode (Batch 1.3 Commit 1). Audit if any tweaks needed.
- Progress bar fill on lesson complete: smooth transition (Tailwind `transition-all`, no JS).

### 4.5 Discipline rules (course-wide)

1. **Animations enhance comprehension, not decorate.** A diagram that draws itself helps the student internalise the shape; an arrow that bounces does not.
2. **No more than 2–3 animations per lesson** (excluding micro-animations).
3. **`prefers-reduced-motion` mandatory.** Components default to instant-final-state when motion is reduced.
4. **Performance budget:** each animation < 50 KB transferred; total animation weight per lesson < 200 KB.
5. **No JS-heavy timeline libraries.** Framer-motion is already in the bundle; gsap is too. Use what's there — don't add a new dep for animation.
6. **No autoplay video.** Period.

---

## Part 5 — Performance considerations

### 5.1 Targets

| Metric | Target | Rationale |
|---|---|---|
| Total course visual asset weight | **< 5 MB** across 27 lessons | Avg 185 KB per lesson |
| Hero LCP per lesson | **< 2.5 s** on 4G | Hero is the LCP element on lesson pages |
| Cumulative Layout Shift | **0.0** on lesson pages | Width/height attributes mandatory |
| Animation frame rate | **60 fps** on mid-range desktop | No janky path-draws |

### 5.2 Image optimisation pipeline

- **Format:** WebP primary, JPEG fallback via `<picture>` element.
- **Compression:** 80% quality for photographic, lossless for illustrative SVG-rasterised. Run `sharp` (already a Plotzy dep) at build time on any imported assets.
- **Responsive sizing:** `srcset` with 1x/2x/3x; `sizes` attribute per layout.
- **Loading:** `loading="lazy"` for below-fold; explicit `loading="eager"` on hero only.
- **Decoding:** `decoding="async"` everywhere.
- **Width/height attributes:** mandatory to prevent CLS — derived from intrinsic dimensions at build.

### 5.3 SVG inline vs external

- **Inline SVG** for diagrams and animated diagrams (theme-aware fills, no extra HTTP request, animation lives next to data).
- **External SVG** would be wrong for these — would break Tailwind theme-token application.

### 5.4 Hero preload

`<link rel="preload" as="image" href="..." imagesrcset="..." imagesizes="...">` injected via `react-helmet-async` (already in use for SEO). Boosts LCP without blocking other resources.

### 5.5 Bundle size impact

| Source | Estimated weight |
|---|---|
| Hero images (27, optimised, avg 80 KB) | ~2.1 MB |
| Inline images (~70, avg 35 KB after optimisation) | ~2.5 MB |
| Inline SVG diagrams (10 animated + 10 static, avg 8 KB) | ~160 KB |
| Quote-card art (none — typography-only) | 0 |
| Component code (6 components, framer-motion already shared) | ~12 KB gzipped (course-specific code) |
| **Total** | **~4.8 MB** ✓ under 5 MB |

(If we go with AI-generated images at higher quality, the budget could be tighter — flagged in DP5.)

---

## Part 6 — Animation library decision

### 6.1 Audit results

| Library | Version | In bundle? |
|---|---|---|
| `framer-motion` | catalog | ✓ yes |
| `motion` (renamed framer-motion v11+) | 12.35 | ✓ yes (peer-dep direction) |
| `gsap` | 3.14 | ✓ yes |
| `canvas-confetti` | 1.9 | ✓ yes (cert page) |

**No new animation library needed.** Plotzy's bundle already supports everything Batch 2.7 will require.

### 6.2 Recommendation

- **`framer-motion` for component-level animation** (QuoteCard reveal, AnimatedDiagram triggers, InteractiveExample transitions). Best ergonomics for React; built-in `useReducedMotion` and `useInView`.
- **CSS animations + native SVG path animation** for the static-diagram-becomes-animated pattern (3-act arc draws itself, sense-radar fills). Cheaper than framer-motion for SVG path drawing; better performance.
- **GSAP not needed** for any planned animation. Avoid using it just because it's available — keep the mental model small.
- **Canvas-confetti reserved for the certificate moment** (Batch 1.3 DP7/G3). Don't repurpose for course-internal celebrations — would dilute the cert moment.

---

## Part 7 — Mobile / RTL considerations

### 7.1 Mobile (DP1/A3 — currently blocked)

Per Batch 1.3 DP1/A3, mobile is blocked site-wide via `MobileBlocker.tsx`. Visual components only need to render correctly on desktop in v1. **However:**

- **Components must be built responsive-ready.** Tailwind responsive variants (`sm:`, `md:`, `lg:`) used throughout. Aspect-ratio constraints scale naturally.
- **Touch interactions implemented for `InteractiveExample` hover modes** — taps act as toggles when hover unavailable. Even in inspector / desktop touch testing, the components shouldn't break.
- **Hero aspect ratio** changes per breakpoint — `21/9` on desktop, `4/3` on mobile (when mobile ships).

### 7.2 RTL

- **Text content** within visual components (captions, source attributions, interactive labels) uses logical Tailwind properties (`me-*`, `text-start`) and translates via existing `useLanguage()` hook — same convention from Batches 1.3, 2.x.
- **Diagrams** need RTL audit. Some diagrams are direction-sensitive: arrows, timelines, decision trees. Solutions:
  - Symmetric diagrams (3-act arc, iceberg, sense radar): no flip needed.
  - Direction-sensitive diagrams (timeline, decision tree, compound chart): use logical properties + `[dir="rtl"]:rotate-y-180` to mirror in RTL where appropriate. **Or** — if the meaning depends on direction (English readers read left-to-right; Arabic readers read right-to-left, so a "future" arrow should flip), explicitly mirror.
  - Caption translations via i18n keys.

### 7.3 Accessibility

- **Alt text mandatory** (TS-enforced via non-optional `alt: string` on InlineImage / Hero).
- **`prefers-reduced-motion`** respected by all animations (framer-motion `useReducedMotion` hook).
- **Decorative images** explicitly opt out: `alt=""` + `role="presentation"`.
- **Color contrast** on QuoteCard borders + caption text: at least WCAG AA (4.5:1 for body text, 3:1 for large text and graphical components).
- **Keyboard nav** on InteractiveExample tabs/click-reveals (Radix gives us this for free).
- **Diagram ARIA labels** mandatory.

---

## Part 8 — Implementation phasing

6 sub-batches in order of ROI. Each lands as a single `--no-ff` merge to master.

| # | Title | Estimate | Rationale |
|---|---|---|---|
| **B1** | Component architecture (6 components) | ~6 h | Foundation for everything else. Build all 6 with full TypeScript types, design tokens, accessibility hooks. No content — components only. |
| **B2** | Hero images for all 27 lessons | ~4 h | Most universal value, fastest visual improvement. Source 27 images (mix of PD + free stock per DP1), optimise, integrate into lesson pages. |
| **B3** | Inline images for all 27 lessons (~70 images) | ~12 h | Most labor — 70 images to find, attribute, optimise, integrate. Done last for content-matched imagery because it requires the most manual work. |
| **B4** | Animated diagrams for ★-marked lessons | ~8 h | Highest pedagogical ROI per minute of work. ~10 diagrams across M2, M3, M4, M5, M6. Inline SVG with framer-motion or CSS animations. |
| **B5** | Quote cards for top 20–30 aphoristic moments | ~4 h | Smaller scope — typography + reveal animation. No image sourcing required. |
| **B6** | Interactive demos (M3 L5, M4 L1, M4 L2, M6 L2) | ~6 h | 4 custom variants of `<InteractiveExample>`. Highest engagement value but smallest reach (only 4 lessons benefit). |

**Total: ~40 hours** (slightly above the 30–40 h estimate to account for image sourcing taking longer than expected).

### Why this order

- B1 first: every subsequent sub-batch depends on the components.
- B2 second: hero gives the largest visual lift per hour invested. Even before B3-B6 ship, every lesson page looks substantially better with just a hero.
- B3 third: most labor, but spread across 27 lessons; each lesson gains incrementally.
- B4-B6: pedagogically highest-value work, but smaller scope and can run in parallel if needed.

### What we don't do in Batch 2.7

- **No mobile-specific work** (DP1/A3 carries forward — mobile blocked).
- **No video** of any kind.
- **No third-party widgets** (analytics, social embeds, etc.).
- **No regenerating existing book covers** — the course's image needs are course-only.

---

## Part 9 — Decision points (need your call)

### DP1. Image style consistency — *one aesthetic, or mix?*

Three options:

- **A. Lean heavily into PD literary art.** Hugh Thomson 1894 P&P illustrations, Phiz Dickens illustrations, classical paintings. The course gets a *distinctive period-coherent look* that modern courses don't have. Risk: feels old-fashioned to some learners.
- **B. Lean modern (Unsplash-style photography).** Clean, contemporary, photographic. Risk: visually generic; the course looks like every other online course.
- **C. Mix — PD art for literary anchors, modern photography for concept heroes (kitchens, manuscripts, blank pages).** Risk: visual fragmentation if not handled carefully.

**Recommend C** with a discipline rule: PD art *anchors* literary lessons (M2, M3, M4); modern photography *signals* practical lessons (M5, M6). Each module has internal consistency; the course transitions between styles at module boundaries, which the student already perceives as a major shift in the course's territory.

### DP2. Captions — visible / hover / omitted?

Options:

- **A. Visible by default** under each image. Best for accessibility and for learners reading carefully. Slight visual noise.
- **B. On hover only.** Cleaner visually. Worse for accessibility, mobile (when it ships), screen-reader users, and learners who don't know to hover.
- **C. Omitted.** Cleanest. No source attribution, which costs us the courtesy attribution to Wikimedia photographers and the educational signal of *this is a real Hugh Thomson illustration from 1894*.

**Recommend A.** The educational value of attribution + the accessibility win outweigh the visual noise. Caption is `text-sm text-muted-foreground italic` — small footprint.

### DP3. Quote card placement — *inline within prose, or sidebar/margin?*

Options:

- **A. Inline.** The quote interrupts the prose flow at the natural place where the aphorism appears. Reads like a pull-quote in a magazine.
- **B. Sidebar/margin.** The quote sits to the side of the body text. Doesn't interrupt; visible alongside.
- **C. Standalone-section.** The quote gets its own section break, large and centered.

**Recommend A** for most quotes (inline pull-quote variant) with **C** for the *very top* aphorisms (e.g. *"Now go finish the book."*). Sidebar (B) is hard to do well with our prose-column layout (max-width on lesson pages); requires a wider container.

### DP4. Interactive demos — *always-visible side-by-side, or click-to-reveal?*

Options:

- **A. Always-visible side-by-side.** Both versions of the dialogue (M3 L5) or both versions of show-vs-tell (M4 L1) shown simultaneously. Clear contrast at a glance.
- **B. Click-to-reveal toggle.** One version shown by default; click switches to the other. More interactive, requires action from the reader.
- **C. Hover-swap.** Hover left half = version A, hover right half = version B. Most playful, but doesn't work on mobile (when it ships) and requires precise pointer.

**Recommend A** for M4 L1 (show vs tell) and M4 L2 (sensory hover) — the contrast IS the lesson, so always-visible. **B** for M3 L5 (dialogue voice swap) — the demo is about *imagining the same content in two voices*, which works better as a toggle that puts the content in the same visual position.

### DP5. AI image generation — *use Plotzy's existing infra, or source manually?*

Plotzy has `openai.images.generate({ model: "gpt-image-1" })` already wired for book covers. Options:

- **A. Don't use it.** Source all 27 hero + 70 inline images manually from PD + Unsplash. Slower (~16 hours of sourcing labor) but $0 marginal cost.
- **B. Use it for hero images only.** Generate 27 style-consistent hero images via a one-off admin script, with a consistent prompt template. ~$1–2 in OpenAI cost. Faster sourcing (~2 hours instead of 4).
- **C. Use it for both heroes and ~30 of the 70 inline images** (the concept-heroes that don't have PD literary anchors — kitchens, blank pages, manuscripts, atmospheric landscapes). Generate ~50 images at ~$0.04 each = ~$2. Saves ~6–8 hours of sourcing labor. PD literary illustrations still come from Wikimedia (those are irreplaceable).

**Recommend C** — leverages Plotzy's existing infra, preserves PD anchors where they matter most (M2, M3, M4 literary lessons), saves significant sourcing labor, and the cost is trivial (<$5 total).

**Caveat:** AI-generated images need a *consistent prompt template* to avoid stylistic drift across the course. Recommendation: define a single visual style (e.g. *"warm literary photography, soft natural light, shallow depth of field, no text"*) and lock it across all course generations. Done as part of B2 (heroes) before B3 (inlines).

### DP6. Animation aggressiveness — *subtle, or prominent?*

Options:

- **A. Subtle.** Single fade-in per QuoteCard. Path-draw on diagrams happens once on first scroll-into-view, never repeats. No micro-interactions on hover except for InteractiveExamples. Quiet course.
- **B. Prominent.** Multi-stage scroll-driven reveals. Hover effects on every card. Subtle parallax on hero images. Dynamic course.
- **C. Mixed by importance.** Tier-1 aphorisms (the closer of M6 L5 — *"Now go finish the book."*) get prominent treatment. Tier-2 quotes get subtle. Most diagrams get a single path-draw on first view.

**Recommend C** with strong bias toward A. The course's voice across Modules 1–6 has been *humane, restrained, aphoristic-where-natural*. Animations should match. **No course in this voice should feel like a tech-product landing page.**

---

## Phase B sequence (after Phase A approval)

Per your spec — 6 sub-batches with single-commit + `--no-ff` merge each. Phase A is the design; Phase B implements it. After all 6 sub-batches ship, **resume Batch 3.1 (Final Exam)** with the 8 stashed sample questions as the starting point — possibly lightly revised based on what visual context surfaces.

Awaiting your decisions on **DP1–DP6** before any Phase B implementation.
