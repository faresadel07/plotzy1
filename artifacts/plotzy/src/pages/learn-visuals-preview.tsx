import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Hero } from "@/components/course/visuals/Hero";
import { InlineImage } from "@/components/course/visuals/InlineImage";
import { Diagram } from "@/components/course/visuals/Diagram";
import { AnimatedDiagram } from "@/components/course/visuals/AnimatedDiagram";
import { QuoteCard } from "@/components/course/visuals/QuoteCard";
import { InteractiveExample } from "@/components/course/visuals/InteractiveExample";
import { motion } from "framer-motion";

/**
 * Internal style-guide page for the course visual primitives.
 *
 * Permanent (per Faris, Batch 2.7 B1 review): future developers
 * extending the course benefit from a live component reference.
 *
 * Hardening:
 *   - SEO `noindex` (this page is internal, not public content)
 *   - robots.txt `Disallow: /learn/visuals-preview`
 *   - "Internal preview" banner so it's clearly not for end users
 *
 * Logged in discovered-issues.md as a future foundation for a
 * proper public design-system docs page.
 */

const PLACEHOLDER_HERO_SRC =
  "https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=2400&auto=format&fit=crop";
const PLACEHOLDER_INLINE_SRC =
  "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=1200&auto=format&fit=crop";

export default function VisualsPreview() {
  return (
    <Layout>
      <SEO title="Visuals Preview (internal)" noindex />

      {/* Internal-only banner */}
      <div className="bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 px-4 py-2 text-center text-xs font-medium border-b border-amber-200 dark:border-amber-800">
        Internal preview — not for end users. Component reference for the course visual primitives.
      </div>

      <main className="container mx-auto max-w-4xl px-4 py-8 space-y-12">
        <header className="space-y-2">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Batch 2.7 / B1
          </div>
          <h1 className="text-4xl font-serif tracking-tight">Course visual primitives</h1>
          <p className="text-base text-muted-foreground max-w-2xl">
            Six components that the rest of Batch 2.7 leans on. Each rendered with sample
            content; resize the window to confirm responsive behaviour, toggle{" "}
            <code className="px-1 rounded bg-secondary text-xs">prefers-reduced-motion</code>{" "}
            in DevTools to confirm animations are skipped, and switch language to a RTL one
            (Arabic) to confirm logical-property layout.
          </p>
        </header>

        {/* ── 1. Hero ──────────────────────────────────────────────────── */}
        <Section title="1. Hero" notes="Top-of-lesson hero with optional title overlay. Loads eagerly (LCP).">
          <Hero
            src={PLACEHOLDER_HERO_SRC}
            alt="A library reading room with afternoon light streaming through tall windows"
            caption="Sample hero with overlay title and caption"
            source={{
              label: "Photo by Susan Q Yin on Unsplash",
              href: "https://unsplash.com/photos/2JIvboGLeho",
            }}
            overlayTitle={{
              eyebrow: "Module 1 · Lesson 1",
              title: "What is a story?",
            }}
          />
        </Section>

        {/* ── 2. InlineImage ──────────────────────────────────────────── */}
        <Section title="2. InlineImage" notes="Embedded mid-prose. Lazy-loaded. Two width modes.">
          <p className="text-sm leading-relaxed">
            Some prose before the image, to verify it integrates cleanly inside lesson content.
            The image below uses the default <code>centered</code> width that stays in the prose
            column.
          </p>
          <InlineImage
            src={PLACEHOLDER_INLINE_SRC}
            alt="A vintage typewriter on a wooden desk with a stack of paper"
            caption="An InlineImage with caption and source attribution"
            source={{
              label: "Photo by Patrick Fore on Unsplash",
              href: "https://unsplash.com/photos/0gkw_9fy0eQ",
            }}
          />
          <p className="text-sm leading-relaxed">
            Following prose, demonstrating the figure spaces correctly in the flow.
          </p>
        </Section>

        {/* ── 3. Diagram (static) ─────────────────────────────────────── */}
        <Section title="3. Diagram" notes="Wrapper for static SVG illustrations. Theme-aware via inline SVG.">
          <Diagram
            ariaLabel="A simple iceberg illustration showing 10% above water and 90% below"
            caption="A simple iceberg — 10% visible, 90% submerged. (Sample SVG; actual diagrams in /diagrams/.)"
          >
            <svg viewBox="0 0 200 160" className="w-full max-w-md mx-auto" aria-hidden>
              {/* Waterline */}
              <line x1="0" y1="50" x2="200" y2="50" className="stroke-border" strokeWidth="1" strokeDasharray="4 4" />
              {/* Above-water tip */}
              <polygon points="100,10 80,50 120,50" className="fill-primary/80" />
              {/* Below-water mass */}
              <polygon points="80,50 60,90 70,130 130,130 140,90 120,50" className="fill-primary/30" />
              {/* Labels */}
              <text x="150" y="30" className="fill-foreground text-[8px]">10%</text>
              <text x="150" y="100" className="fill-muted-foreground text-[8px]">90%</text>
            </svg>
          </Diagram>
        </Section>

        {/* ── 4. AnimatedDiagram ──────────────────────────────────────── */}
        <Section
          title="4. AnimatedDiagram"
          notes="Path-draws on viewport entry. Once. Reduced-motion users see final state instantly."
        >
          <AnimatedDiagram
            ariaLabel="A 3-act story arc that draws itself across three sections"
            caption="The three-act arc, drawing itself once when scrolled into view"
            duration={1.4}
          >
            <svg viewBox="0 0 400 120" className="w-full max-w-2xl mx-auto" aria-hidden>
              {/* Baseline */}
              <line x1="20" y1="100" x2="380" y2="100" className="stroke-border" strokeWidth="1" />
              {/* Arc — animates path drawing */}
              <motion.path
                d="M 20 100 Q 100 100 130 70 Q 160 40 200 30 Q 240 20 280 60 Q 320 100 380 50"
                fill="none"
                className="stroke-primary"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 1.4, ease: "easeOut" }}
              />
              {/* Act labels */}
              <text x="80" y="115" className="fill-muted-foreground text-[9px]" textAnchor="middle">Act 1</text>
              <text x="200" y="115" className="fill-muted-foreground text-[9px]" textAnchor="middle">Act 2</text>
              <text x="330" y="115" className="fill-muted-foreground text-[9px]" textAnchor="middle">Act 3</text>
              {/* Act dividers */}
              <line x1="130" y1="95" x2="130" y2="105" className="stroke-border" strokeWidth="1" />
              <line x1="280" y1="95" x2="280" y2="105" className="stroke-border" strokeWidth="1" />
            </svg>
          </AnimatedDiagram>
        </Section>

        {/* ── 5. QuoteCard ────────────────────────────────────────────── */}
        <Section
          title="5. QuoteCard"
          notes='Two variants: "inline" pull-quote (default) and "standalone" centerpiece.'
        >
          <p className="text-sm leading-relaxed">
            A paragraph of prose, then an inline pull-quote:
          </p>
          <QuoteCard>Three is the minimum complete unit of meaning.</QuoteCard>
          <p className="text-sm leading-relaxed">
            More prose, then a quote with attribution:
          </p>
          <QuoteCard attribution="Aristotle, Poetics">
            A story has a beginning, a middle, and an end.
          </QuoteCard>
          <p className="text-sm leading-relaxed">Standalone variant for top-tier aphorisms (per DP3):</p>
          <QuoteCard variant="standalone">Now go finish the book.</QuoteCard>
        </Section>

        {/* ── 6. InteractiveExample ───────────────────────────────────── */}
        <Section
          title="6. InteractiveExample"
          notes="Three modes: side-by-side, click-toggle, hover-highlight."
        >
          <h3 className="text-sm font-semibold mt-4">side-by-side mode (M4 L1, M4 L2 base)</h3>
          <InteractiveExample
            mode="side-by-side"
            options={[
              {
                label: "Telling",
                content: (
                  <p className="text-sm leading-relaxed">
                    The next twelve months passed quickly. By spring she was no longer flinching when his name came up.
                  </p>
                ),
              },
              {
                label: "Showing",
                content: (
                  <p className="text-sm leading-relaxed">
                    She set the cup down. Her hand was shaking. Outside, snow had begun to fall.
                  </p>
                ),
              },
            ]}
            caption="Same emotional content, two modes — the contrast is the lesson."
          />

          <h3 className="text-sm font-semibold mt-8">click-toggle mode (M3 L5, M6 L2)</h3>
          <InteractiveExample
            mode="click-toggle"
            options={[
              {
                label: "Voice A",
                content: (
                  <p className="text-sm leading-relaxed">
                    "You should take it." "You don't even like the place." "I don't have to like it. You should take it."
                  </p>
                ),
              },
              {
                label: "Voice B",
                content: (
                  <p className="text-sm leading-relaxed">
                    "You've been turning it over for three weeks like a stone in your pocket. If you stay here you'll be sitting in this kitchen at fifty wondering whether you'd have been someone else."
                  </p>
                ),
              },
            ]}
            caption="Same intent, different voice. Click between them to feel the differentiation."
          />

          <h3 className="text-sm font-semibold mt-8">hover-highlight mode (M4 L2 inner)</h3>
          <InteractiveExample
            mode="hover-highlight"
            options={[
              {
                label: "Sensory paragraph",
                content: (
                  <p className="text-sm leading-relaxed">
                    The kitchen was warm. The radiator was ticking; butter on the counter had begun to soften;
                    there was a faint sweetness from the windowsill where she had left strawberries to ripen the
                    day before. From the stairs, two floors above, he could hear his mother walking, her step
                    uneven in one shoe.
                  </p>
                ),
              },
            ]}
            caption="The inner content owns the hover behavior. (Wrapper just provides layout — actual sense-highlighting is built per-page in B6.)"
          />
        </Section>

        <footer className="pt-12 pb-6 text-xs text-muted-foreground border-t">
          <p>
            All six components verified for: <code>tsc --noEmit</code> clean,
            <code className="ms-1">prefers-reduced-motion</code> respected, RTL via logical Tailwind
            properties, no hardcoded colors. No new npm dependencies (framer-motion already in
            bundle, used by ~10 other Plotzy pages).
          </p>
        </footer>
      </main>
    </Layout>
  );
}

function Section({
  title,
  notes,
  children,
}: {
  title: string;
  notes: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <header className="space-y-1 border-b pb-2">
        <h2 className="text-2xl font-serif tracking-tight">{title}</h2>
        <p className="text-xs text-muted-foreground italic">{notes}</p>
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
