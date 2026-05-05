import { useState, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * The 4 interactive demos in the course (per DP4):
 *   - M4 L1 (show vs tell)         — side-by-side
 *   - M4 L2 (sensory writing)       — side-by-side base, hover-highlight
 *                                     handled by the inner paragraph children
 *   - M3 L5 (dialogue voice swap)  — click-toggle (same content position,
 *                                     toggle voice)
 *   - M6 L2 (blurb structure)      — click-toggle (hook → stakes → promise)
 *
 * Three modes:
 *   - "side-by-side": both options rendered simultaneously. Grid on lg+,
 *     stacked below.
 *   - "click-toggle": tabs-pattern with proper ARIA (role="tablist" / role="tab"
 *     / aria-selected). Crossfade between options. Keyboard navigable for free
 *     via the underlying button semantics.
 *   - "hover-highlight": the wrapper provides layout; the inner content
 *     (rendered as options[0].content) implements its own hover behavior.
 *     Used for M4 L2 sensory paragraph where hovering each sense icon
 *     highlights the matching phrases — that logic belongs to the page,
 *     not this primitive.
 */

interface InteractiveExampleOption {
  label: string;
  content: ReactNode;
}

interface InteractiveExampleProps {
  options: InteractiveExampleOption[];
  mode: "side-by-side" | "click-toggle" | "hover-highlight";
  /** Initial selected option for click-toggle. Default 0. */
  defaultIndex?: number;
  caption?: string;
  className?: string;
}

export function InteractiveExample({
  options,
  mode,
  defaultIndex = 0,
  caption,
  className,
}: InteractiveExampleProps) {
  const [selected, setSelected] = useState(defaultIndex);
  const reduceMotion = useReducedMotion();

  // ── side-by-side ─────────────────────────────────────────────────────
  if (mode === "side-by-side") {
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
        {caption && (
          <figcaption className="mt-3 text-sm text-muted-foreground italic">
            {caption}
          </figcaption>
        )}
      </figure>
    );
  }

  // ── click-toggle ─────────────────────────────────────────────────────
  if (mode === "click-toggle") {
    return (
      <figure className={cn("my-8", className)}>
        <div className="flex gap-2 mb-3 flex-wrap" role="tablist">
          {options.map((opt, i) => (
            <button
              key={i}
              role="tab"
              type="button"
              aria-selected={selected === i}
              tabIndex={selected === i ? 0 : -1}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
            >
              {options[selected].content}
            </motion.div>
          </AnimatePresence>
        </div>
        {caption && (
          <figcaption className="mt-3 text-sm text-muted-foreground italic">
            {caption}
          </figcaption>
        )}
      </figure>
    );
  }

  // ── hover-highlight ──────────────────────────────────────────────────
  // The wrapper just provides layout + caption. The actual hover
  // behavior is implemented in the rendered children (the M4 L2
  // sensory paragraph component handles its own hover state).
  return (
    <figure className={cn("my-8", className)}>
      <div className="rounded-lg border bg-card p-4">{options[0].content}</div>
      {caption && (
        <figcaption className="mt-3 text-sm text-muted-foreground italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
