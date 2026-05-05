import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Visually-elevated aphoristic moment with a gentle reveal animation.
 *
 * Two variants per DP3:
 *   - "inline" (default): pull-quote within prose flow, left bar via
 *     logical border-s-4 (correctly flips to right side in RTL).
 *   - "standalone": full-width centerpiece treatment for the 6-7
 *     top-tier aphorisms approved per DP3:
 *       • "The cure is more consequence" (M1 L1)
 *       • "Three is the minimum complete unit of meaning" (M2 L1)
 *       • "The wound causes the want. The want occludes the need." (M3 L1)
 *       • "Show what matters; tell what doesn't" (M4 L1)
 *       • "Books are not finished; they are released" (M5 L5)
 *       • "Now go finish the book" (M6 L5 closer)
 *
 * Reveal animation per DP6: opacity + y translate on viewport entry,
 * once. Subtle. prefers-reduced-motion → instant final state.
 */

interface QuoteCardProps {
  /** The aphoristic line. Plain text or React content (for inline emphasis). */
  children: ReactNode;
  /**
   * Optional small attribution under the quote. Used for the rare
   * PD-cited quotes (Aristotle, Trollope). Most aphorisms are
   * the course's own and shouldn't carry attribution.
   */
  attribution?: string;
  /** "inline" pull-quote (default) or "standalone" centerpiece. */
  variant?: "inline" | "standalone";
  className?: string;
}

export function QuoteCard({
  children,
  attribution,
  variant = "inline",
  className,
}: QuoteCardProps) {
  const reduceMotion = useReducedMotion();

  const initial = reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 };
  const animate = { opacity: 1, y: 0 };
  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const };

  if (variant === "standalone") {
    return (
      <motion.figure
        className={cn("my-12 sm:my-16 px-4 sm:px-12 py-10 text-center", className)}
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

  // "inline" — pull-quote within prose flow.
  return (
    <motion.figure
      className={cn("my-6 ps-6 border-s-4 border-primary", className)}
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
