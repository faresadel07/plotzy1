import { useRef, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * SVG diagram with framer-motion-driven animation. Triggered by
 * viewport entry by default; once-only (no replay on re-scroll).
 *
 * AnimatedDiagram itself only handles the *trigger* — the children
 * (each individual diagram component in /diagrams/) implement the
 * actual animation via SVG-native primitives:
 *   - pathLength / pathOffset for arc / curve drawing
 *   - opacity + y for label fade-ins
 *   - never transform: scale on parents (would trigger layout)
 *
 * Each diagram capped at ~50KB transferred (SVG is small; framer-motion
 * is already in the bundle).
 *
 * A11y: prefers-reduced-motion is mandatory and non-negotiable. When
 * set, animation is skipped — diagram renders in final state instantly.
 *
 * The trigger="in-view" default uses a 100px upward margin so the
 * animation starts slightly before the diagram is fully on-screen,
 * giving the user a moment to focus before it begins.
 */

interface AnimatedDiagramProps {
  /** Inline SVG content. The actual animation lives in the children's motion.* elements. */
  children: ReactNode;
  /** Mandatory ARIA label describing what the diagram shows. */
  ariaLabel: string;
  /**
   * When the animation triggers.
   * - "in-view" (default): starts when scrolled into viewport, plays once.
   * - "on-mount": starts immediately on render. Use for above-the-fold diagrams.
   * - "on-hover" / "click": children own the trigger via framer-motion variants.
   *   Wrapper still provides reduced-motion override.
   */
  trigger?: "in-view" | "on-mount" | "on-hover" | "click";
  /** Total animation duration in seconds. Default 1.2. */
  duration?: number;
  caption?: string;
  className?: string;
}

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

  // shouldAnimate gates the wrapper-level fade-in. Children's animations
  // listen to the same conditions through their own variants/transitions.
  const shouldAnimate =
    !reduceMotion && (trigger === "on-mount" || (trigger === "in-view" && inView));

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
