# Batch 2.7 / B1 — Component Architecture (design review)

**Status:** Design review. No code yet. Branch will be created on approval.
**Branch (planned):** `feat/course-batch-2-7-b1-components` (off master `f8ea479`)
**Phase A reference:** [course-visual-design.md](course-visual-design.md) approved with DP1–DP6 decisions.

---

## Folder structure

```
artifacts/plotzy/src/components/course/visuals/
├── Hero.tsx                          # 2.1
├── InlineImage.tsx                   # 2.2
├── Diagram.tsx                       # 2.3
├── AnimatedDiagram.tsx               # 2.4
├── QuoteCard.tsx                     # 2.5
├── InteractiveExample.tsx            # 2.6
└── diagrams/                          # B4 territory; folder created in B1
    └── (10 individual SVG diagrams added in B4)
```

`components/course/visuals/` is a sub-folder of the existing course components folder, keeping visual concerns isolated from the lesson-page-level components (LessonCard, ProgressBar, etc.) we built in Batch 1.3.

---

## How visuals integrate with lessons (preview, not part of B1)

This is integration design that affects what B1 needs to expose. Documenting now to lock the API; **implementation lands in B2 (heroes) and B3 (inlines)**, not here.

| Visual element | Where it's defined | Where it's rendered |
|---|---|---|
| **Hero** | New frontend visual config (a static map `lib/visuals/lesson-visuals.ts` keyed by slug) | Lesson page renders `<Hero>` above the prose, before `<Markdown>` |
| **Inline image** | In the markdown content itself, via standard markdown image syntax `![alt](src "caption")` | `<Markdown>` extended to recognize image syntax → renders as `<InlineImage>` |
| **Diagram** | Same lesson-visuals config, with `position: "after-heading-N"` placement | Lesson page injects `<Diagram>` / `<AnimatedDiagram>` between markdown sections |
| **Quote card** | Same lesson-visuals config, by which aphorism to elevate (text-match) | Lesson page identifies the matching paragraph and replaces with `<QuoteCard>` |
| **Interactive example** | Lesson-specific (only 4 lessons have one) | Lesson page conditionally renders the matching `<InteractiveExample>` after a specific heading |

**B1 scope:** the 6 components themselves with documented props. Integration mechanics (the lesson-visuals config, the Markdown extension for `![alt](src)`, the injection logic) land in B2.

---

## 2.1 — `<Hero>`

**Purpose:** full-bleed top-of-lesson hero. One per lesson, mandatory after B2 ships.

### Props

```ts
export interface HeroProps {
  /** Image URL or imported asset. */
  src: string;
  /** WebP source for <picture> primary; falls back to src. Optional. */
  webpSrc?: string;
  /** Alt text. Mandatory for accessibility — no decorative-only heroes. */
  alt: string;
  /** Optional caption rendered under the image. */
  caption?: string;
  /** Optional source attribution (PD attribution / Unsplash photographer / "AI-generated"). */
  source?: { label: string; href?: string };
  /** Title overlay on top of the image. If omitted, lesson page renders the title separately. */
  overlayTitle?: { eyebrow?: string; title: string };
  /** Aspect ratio. Default 21/9 cinematic. */
  aspectRatio?: "21/9" | "16/9" | "4/3";
  className?: string;
}
```

### JSX skeleton

```tsx
<figure className={cn("relative w-full overflow-hidden rounded-xl", className)}>
  <div className={cn("relative w-full", aspectRatio === "21/9" ? "aspect-[21/9]" : aspectRatio === "16/9" ? "aspect-video" : "aspect-[4/3]")}>
    <picture>
      {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
      <img
        src={src}
        alt={alt}
        loading="eager"  // hero is LCP — must not lazy-load
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </picture>
    {overlayTitle && (
      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-black/20 to-transparent">
        <div className="p-6 sm:p-10 text-white">
          {overlayTitle.eyebrow && (
            <div className="text-xs uppercase tracking-[0.2em] mb-2 opacity-80">{overlayTitle.eyebrow}</div>
          )}
          <h1 className="font-serif text-3xl sm:text-5xl tracking-tight">{overlayTitle.title}</h1>
        </div>
      </div>
    )}
  </div>
  {(caption || source) && (
    <figcaption className="mt-2 text-sm text-muted-foreground italic">
      {caption}
      {source && (
        <>
          {caption && " — "}
          <span className="text-xs not-italic">
            {source.href ? <a href={source.href} target="_blank" rel="noopener noreferrer">{source.label}</a> : source.label}
          </span>
        </>
      )}
    </figcaption>
  )}
</figure>
```

### Behaviors

- **LCP optimization:** `loading="eager"` on the hero `<img>`. Lesson page will also inject `<link rel="preload" as="image" href={src}>` via `react-helmet-async` for the active lesson's hero.
- **CLS:** `aspect-[21/9]` reserves layout space; image fills via `object-cover`. Zero layout shift.
- **Theme:** gradient overlay uses `from-black/70` (works on both light and dark themes since hero is always over an image).
- **RTL:** symmetric. Caption flows naturally with `dir`.
- **A11y:** `alt: string` is non-optional (TS-enforced). Captions read by screen readers via `<figcaption>`.

### Dependencies

- `cn` from `@/lib/utils` (existing — used by all UI components).
- No external libs. No animation in B1 — Hero is static.

### Acceptance criteria for B1

- [ ] Renders correctly with `src` only (smallest valid case)
- [ ] Renders correctly with all props populated
- [ ] No CLS when image loads (verified via DevTools)
- [ ] `alt` typing is non-optional (TS catches missing alt at compile)
- [ ] Component file under 60 lines (excluding props interface)

---

## 2.2 — `<InlineImage>`

**Purpose:** content-matched inline images. Embedded mid-prose. ~70 across the course.

### Props

```ts
export interface InlineImageProps {
  src: string;
  webpSrc?: string;
  alt: string;
  caption?: string;
  source?: { label: string; href?: string };
  /** "centered" stays in the prose column. "wide" breaks out slightly wider. */
  width?: "centered" | "wide";
  className?: string;
}
```

### JSX skeleton

```tsx
<figure
  className={cn(
    "my-6 rounded-lg border bg-card overflow-hidden",
    width === "wide" ? "lg:-mx-12" : "",
    className,
  )}
>
  <picture>
    {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="w-full h-auto"
    />
  </picture>
  {(caption || source) && (
    <figcaption className="px-4 py-3 text-sm text-muted-foreground italic">
      {caption}
      {source && (
        <>
          {caption && " — "}
          <span className="text-xs not-italic">
            {source.href ? (
              <a href={source.href} target="_blank" rel="noopener noreferrer" className="underline">
                {source.label}
              </a>
            ) : (
              source.label
            )}
          </span>
        </>
      )}
    </figcaption>
  )}
</figure>
```

### Behaviors

- **Lazy loading:** `loading="lazy"` (in contrast to Hero's `eager`).
- **`width: "wide"`:** uses negative horizontal margins on `lg:` breakpoint to break out of the standard prose column. On mobile/tablet stays in column.
- **Theme:** `bg-card border` adapts to light/dark via existing tokens.
- **RTL:** symmetric. Caption flows with `dir`.
- **A11y:** alt non-optional (TS-enforced). Decorative variant uses `alt=""` + `role="presentation"` (consumer's responsibility).

### Dependencies

- Same as Hero: `cn`, no animation lib.

### Acceptance criteria

- [ ] Renders with `src` + `alt` only
- [ ] Width variants render correctly at sm/md/lg breakpoints
- [ ] Caption + source attribution render together
- [ ] No CLS (browser uses intrinsic image dimensions; component doesn't constrain)
- [ ] Markdown integration TBD in B2 (not part of B1)

---

## 2.3 — `<Diagram>`

**Purpose:** static SVG illustrations. Wrapper for inline SVG components living in `diagrams/`.

### Props

```ts
export interface DiagramProps {
  /** Inline SVG content. Children pattern lets each diagram live as its own .tsx file. */
  children: React.ReactNode;
  /** ARIA label for the diagram as a whole. Mandatory. */
  ariaLabel: string;
  caption?: string;
  className?: string;
}
```

### JSX skeleton

```tsx
<figure
  className={cn("my-6 rounded-lg border bg-card p-6", className)}
  role="img"
  aria-label={ariaLabel}
>
  <div className="w-full">
    {children}
  </div>
  {caption && (
    <figcaption className="mt-3 text-sm text-muted-foreground italic">
      {caption}
    </figcaption>
  )}
</figure>
```

### Behaviors

- **Inline SVG** (children) so the SVG can use Tailwind classes for theme tokens (`fill-foreground`, `stroke-primary`) — keeps theme switching working.
- **ARIA:** `role="img"` + `aria-label` mandatory. Caption acts as figcaption.
- **No animation** — that's `<AnimatedDiagram>`. Diagram is for static state diagrams (e.g., the iceberg illustration in M3 L2 if we chose to keep it static).

### Dependencies

- `cn` only.

### Diagram inventory (B4 territory, but listed for completeness)

The 10 ★-marked animations from Phase A. Half become `<Diagram>` (static), half become `<AnimatedDiagram>` (path-drawing reveal):

| Lesson | Diagram | Component |
|---|---|---|
| M2 L1 | 3-act arc | AnimatedDiagram (path-draw) |
| M2 L2 | hero's-journey circle | AnimatedDiagram (sequential beat reveal) |
| M2 L4 | decision tree | AnimatedDiagram (branch reveal) |
| M3 L1 | wound→want→need flow | AnimatedDiagram (left-to-right flow) |
| M3 L2 | iceberg | Diagram (static) |
| M4 L2 | sense radar | AnimatedDiagram (radial fill) |
| M5 L3 | 3-pass flow | AnimatedDiagram (linear flow) |
| M5 L5 | diminishing-returns curve | AnimatedDiagram (path-draw) |
| M6 L4 | 3-book compound chart | AnimatedDiagram (bar grow-in) |
| M6 L1 | path decision tree | Diagram (static) |

Most are AnimatedDiagram. Iceberg + path-decision-tree work fine as static.

### Acceptance criteria

- [ ] Wraps SVG children with proper ARIA
- [ ] Caption renders when provided
- [ ] Theme tokens apply to inline SVG fills/strokes
- [ ] Component itself is < 30 lines (it's just a wrapper)

---

## 2.4 — `<AnimatedDiagram>`

**Purpose:** SVG with framer-motion animations, triggered on viewport entry. ~8 of the 10 diagrams use this.

### Props

```ts
export interface AnimatedDiagramProps {
  /** Inline SVG content. Same pattern as Diagram. */
  children: React.ReactNode;
  ariaLabel: string;
  /** When the animation triggers. */
  trigger?: "in-view" | "on-mount" | "on-hover" | "click";
  /** Total animation duration in seconds. Default 1.2. */
  duration?: number;
  caption?: string;
  className?: string;
}
```

### JSX skeleton (key parts only)

```tsx
import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";

export function AnimatedDiagram({
  children,
  ariaLabel,
  trigger = "in-view",
  duration = 1.2,
  caption,
  className,
}: AnimatedDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-100px" });

  // When reduced motion is requested, animation is skipped — the diagram renders in its final state.
  const shouldAnimate = !reduceMotion && (trigger === "on-mount" || (trigger === "in-view" && inView));

  return (
    <figure
      ref={ref}
      className={cn("my-8 rounded-lg border bg-card p-6", className)}
      role="img"
      aria-label={ariaLabel}
    >
      <motion.div
        className="w-full"
        initial={shouldAnimate ? { opacity: 0 } : { opacity: 1 }}
        animate={shouldAnimate ? { opacity: 1 } : undefined}
        transition={{ duration: duration * 0.3 }}
      >
        {/*
          The SVG inside `children` uses framer-motion variants for path-draw / fill / etc.
          Each diagram component (in /diagrams) is responsible for its own animation
          via SVG path-length tricks, motion.path elements, etc.
          AnimatedDiagram's job is the *trigger* — when does the diagram start animating.
        */}
        {children}
      </motion.div>
      {caption && (
        <figcaption className="mt-3 text-sm text-muted-foreground italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
```

### Behaviors

- **`trigger: "in-view"` (default):** uses `useInView` from framer-motion. Animation starts when 80% of the diagram has entered the viewport. `once: true` so re-scrolling doesn't replay.
- **`trigger: "on-mount"`:** plays immediately. For diagrams above-the-fold or in first-render contexts.
- **`trigger: "on-hover"` / `"click"`:** child-controlled. Wrapper exposes a context value (or props passthrough) so the child SVG knows when to animate.
- **`prefers-reduced-motion`:** when set, animation is skipped entirely. Diagram renders in its final state. **No exception** — accessibility critical.
- **Performance:** animations use SVG-native `pathLength`, `pathOffset`, `opacity` — never `transform: scale` on the parent (would trigger layout). Each diagram capped at 50 KB transferred.

### Dependencies

- `framer-motion` (already installed).
- `useReducedMotion`, `useInView` — both from framer-motion.
- `cn` for className utility.

### Acceptance criteria

- [ ] `prefers-reduced-motion` honored — manual test: enable in DevTools, animation skipped, diagram visible in final state
- [ ] `in-view` trigger fires once when scrolled to
- [ ] No layout shift during animation
- [ ] Duration prop respected (manual visual check)
- [ ] Component file < 80 lines

---

## 2.5 — `<QuoteCard>`

**Purpose:** elevated aphoristic moment with reveal animation. Top 20–30 across the course; 6–7 of these get the standalone-prominent variant per DP3.

### Props

```ts
export interface QuoteCardProps {
  /** The aphoristic line. Plain text or React content (in case of inline emphasis). */
  children: React.ReactNode;
  /** Optional small attribution under the quote. Used for the rare PD-cited quotes (Aristotle, Trollope). */
  attribution?: string;
  /**
   * - "inline" (default): pull-quote within prose flow, left-aligned with logical border-start.
   * - "standalone": full-width centerpiece treatment for the 6–7 top-tier aphorisms (per DP3).
   */
  variant?: "inline" | "standalone";
  className?: string;
}
```

### JSX skeleton

```tsx
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function QuoteCard({ children, attribution, variant = "inline", className }: QuoteCardProps) {
  const reduceMotion = useReducedMotion();

  const initial = reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 };
  const animate = { opacity: 1, y: 0 };
  const transition = reduceMotion ? { duration: 0 } : { duration: 0.6, ease: "easeOut" };

  if (variant === "standalone") {
    // DP6 prominent treatment: full-width, centered, generous spacing
    return (
      <motion.figure
        className={cn(
          "my-12 sm:my-16 px-4 sm:px-12 py-10 text-center",
          className,
        )}
        initial={initial}
        whileInView={animate}
        viewport={{ once: true, margin: "-50px" }}
        transition={transition}
      >
        <blockquote className="font-serif text-2xl sm:text-4xl tracking-tight leading-tight max-w-3xl mx-auto">
          {children}
        </blockquote>
        {attribution && (
          <figcaption className="mt-4 text-sm text-muted-foreground italic">
            — {attribution}
          </figcaption>
        )}
      </motion.figure>
    );
  }

  // "inline" variant — pull-quote within prose flow.
  return (
    <motion.figure
      className={cn(
        "my-6 ps-6 border-s-4 border-primary",
        className,
      )}
      initial={initial}
      whileInView={animate}
      viewport={{ once: true, margin: "-50px" }}
      transition={transition}
    >
      <blockquote className="font-serif text-xl sm:text-2xl tracking-tight leading-snug">
        {children}
      </blockquote>
      {attribution && (
        <figcaption className="mt-2 text-sm text-muted-foreground italic">
          — {attribution}
        </figcaption>
      )}
    </motion.figure>
  );
}
```

### Behaviors

- **`variant: "inline"` (default):** pull-quote with logical `border-s-4` (correctly flips in RTL — the bar appears on the *start* edge regardless of language direction).
- **`variant: "standalone"`:** prominent treatment per DP3 — used for the 6–7 top-tier aphorisms (M1 L1 *cure-is-consequence*, M2 L1 *minimum-complete-unit*, M3 L1 *wound-causes-want*, M4 L1 *show-what-matters*, M5 L5 *books-not-finished*, M6 L5 *go-finish-the-book*).
- **Reveal animation:** opacity + small `y` translate on viewport entry. Once. Gentle. Per DP6 (95% subtle).
- **Reduced motion:** instant final state.
- **Theme:** `border-primary` adapts to light/dark.

### Dependencies

- `framer-motion`.
- `cn`.

### Acceptance criteria

- [ ] Inline variant renders as pull-quote with logical border
- [ ] Standalone variant centers and gets generous spacing
- [ ] Reveal animation fires on viewport entry, once only
- [ ] `prefers-reduced-motion` honored
- [ ] Border-start correctly renders on left in LTR, right in RTL (manual test)
- [ ] Component file < 80 lines

---

## 2.6 — `<InteractiveExample>`

**Purpose:** the 4 interactive demos (M3 L5 dialogue swap, M4 L1 show-vs-tell, M4 L2 sensory hover, M6 L2 blurb structure).

Per DP4, three of these use **side-by-side** display (always-visible contrast); one (M3 L5) uses **click-to-reveal** (toggle); one (M4 L2) uses **hover-highlight** which is its own pattern. The component supports all three modes.

### Props

```ts
export interface InteractiveExampleOption {
  label: string;
  content: React.ReactNode;
}

export interface InteractiveExampleProps {
  options: InteractiveExampleOption[];
  /**
   * - "side-by-side": both options shown simultaneously (M4 L1, M4 L2 base layout).
   * - "click-toggle": one shown, click to switch (M3 L5).
   * - "hover-highlight": passthrough mode where the children handle hover behavior internally (M4 L2 sensory). Wrapper provides the layout.
   */
  mode: "side-by-side" | "click-toggle" | "hover-highlight";
  /** Default selected option for click-toggle mode. */
  defaultIndex?: number;
  caption?: string;
  className?: string;
}
```

### JSX skeleton (key parts)

```tsx
import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export function InteractiveExample({
  options,
  mode,
  defaultIndex = 0,
  caption,
  className,
}: InteractiveExampleProps) {
  const [selected, setSelected] = useState(defaultIndex);
  const reduceMotion = useReducedMotion();

  if (mode === "side-by-side") {
    // Both options rendered simultaneously, 50/50 grid on lg, stacked on smaller.
    return (
      <figure className={cn("my-8", className)}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {options.map((opt, i) => (
            <div key={i} className="rounded-lg border bg-card p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2 font-medium">
                {opt.label}
              </div>
              <div>{opt.content}</div>
            </div>
          ))}
        </div>
        {caption && <figcaption className="mt-3 text-sm text-muted-foreground italic">{caption}</figcaption>}
      </figure>
    );
  }

  if (mode === "click-toggle") {
    return (
      <figure className={cn("my-8", className)}>
        <div className="flex gap-2 mb-3" role="tablist">
          {options.map((opt, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={selected === i}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                selected === i
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
              )}
              onClick={() => setSelected(i)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="rounded-lg border bg-card p-4 min-h-[8rem]">
          <AnimatePresence mode="wait">
            <motion.div
              key={selected}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {options[selected].content}
            </motion.div>
          </AnimatePresence>
        </div>
        {caption && <figcaption className="mt-3 text-sm text-muted-foreground italic">{caption}</figcaption>}
      </figure>
    );
  }

  // hover-highlight: the children own the hover behavior; wrapper provides layout + caption.
  return (
    <figure className={cn("my-8", className)}>
      <div className="rounded-lg border bg-card p-4">
        {options[0].content /* Children handle their own hover demo */}
      </div>
      {caption && <figcaption className="mt-3 text-sm text-muted-foreground italic">{caption}</figcaption>}
    </figure>
  );
}
```

### Behaviors

- **Side-by-side mode:** both options visible. Grid on `lg:`, stacked below.
- **Click-toggle mode:** Tab-pattern with `role="tablist"` / `role="tab"` / `aria-selected`. Cross-fade animation between options.
- **Hover-highlight mode:** the wrapper just provides layout; the actual hover behavior is implemented in the rendered children (the M4 L2 sensory paragraph component handles its own hover).
- **A11y:** click-toggle uses proper tab semantics (good keyboard support — arrows + tab). Hover-highlight requires children to provide keyboard alternatives.
- **Reduced motion:** crossfade duration → 0.

### Dependencies

- `framer-motion` (`AnimatePresence` for click-toggle transitions).
- `cn`.

### Acceptance criteria

- [ ] All three modes render correctly
- [ ] Click-toggle keyboard navigation (Tab + arrow keys) works
- [ ] Side-by-side stacks on small screens
- [ ] Reduced motion honored
- [ ] Component file < 120 lines (largest of the 6)

---

## Summary table

| # | Component | LOC est. | Animation | Mandatory props | Used in (sub-batch) |
|---|---|---|---|---|---|
| 2.1 | `<Hero>` | ~55 | none | `src`, `alt` | B2 (27 lessons) |
| 2.2 | `<InlineImage>` | ~50 | none | `src`, `alt` | B3 (~70 images) |
| 2.3 | `<Diagram>` | ~25 | none | `children`, `ariaLabel` | B4 (~2 diagrams) |
| 2.4 | `<AnimatedDiagram>` | ~70 | framer-motion | `children`, `ariaLabel` | B4 (~8 diagrams) |
| 2.5 | `<QuoteCard>` | ~70 | framer-motion | `children` | B5 (top 20–30) |
| 2.6 | `<InteractiveExample>` | ~110 | framer-motion (click-toggle only) | `options`, `mode` | B6 (4 lessons) |

**Total LOC estimate:** ~380 lines of component code in B1.

**B1 acceptance criteria (all 6 components):**

- [ ] All 6 components compile with `tsc --noEmit` clean
- [ ] All `alt` props are TS-non-optional (compile-time enforcement of accessibility)
- [ ] All animations honor `prefers-reduced-motion`
- [ ] All components use logical Tailwind properties (no `mr-*` / `pl-*` / hardcoded colors)
- [ ] No hardcoded colors anywhere — design tokens only
- [ ] No new npm dependencies introduced
- [ ] Visual smoke test: a temporary page renders all 6 components with sample content; user verifies no broken layouts

---

## Boundary clarifications

Three things that are explicitly **NOT** in B1, deferred to later sub-batches:

1. **The 10 individual SVG diagram components** (`diagrams/ThreeActArc.tsx`, etc.) — those land in B4. B1 only delivers the wrapper `<AnimatedDiagram>`.
2. **Markdown extension to render `![alt](src)` as `<InlineImage>`** — lands in B3 when we have actual inline images to integrate.
3. **The lesson-visuals config** (`lib/visuals/lesson-visuals.ts`) — created in B2 alongside the 27 hero images.

B1 is purely the component primitives. Each later sub-batch leans on them.

---

## Single commit plan for B1

```
feat(course-visuals): add 6 visual component primitives

New folder artifacts/plotzy/src/components/course/visuals/ with:
- Hero.tsx                  (~55 lines)
- InlineImage.tsx           (~50 lines)
- Diagram.tsx               (~25 lines)
- AnimatedDiagram.tsx       (~70 lines)
- QuoteCard.tsx             (~70 lines)
- InteractiveExample.tsx    (~110 lines)

All accept Tailwind v4 design tokens, RTL-correct via logical
properties, prefers-reduced-motion respected on all animations.
TS-enforced accessibility: alt is non-optional, ariaLabel is
non-optional on Diagram/AnimatedDiagram. No new npm deps.

Foundation for B2 (heroes), B3 (inline images), B4 (animated
diagrams), B5 (quote cards), B6 (interactive demos).
```

After commit: `--no-ff` merge to master, push, delete the B1 branch. Then start B2.

---

Awaiting your sign-off on the 6 component designs before I:

1. Create branch `feat/course-batch-2-7-b1-components`
2. Create the 6 component files per the specs above
3. Run `tsc --noEmit` clean check
4. (Optionally) build a temporary `/learn/visuals-preview` route as a smoke-test surface — would let you eyeball the components before B2 starts. Cheap to add, cheap to remove. **Recommend yes.** Flag if you want this skipped.
