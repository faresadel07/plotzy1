import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Wrapper for static SVG illustrations. Children pattern lets each
 * diagram live as its own .tsx file under components/course/visuals/diagrams/
 * — inline SVG so theme tokens (fill-foreground, stroke-primary) work
 * for light/dark adaptation. External SVG would lose theme integration.
 *
 * For animated diagrams use <AnimatedDiagram> instead.
 *
 * A11y: `ariaLabel` is non-optional. Diagrams are images, not decorative.
 */

interface DiagramProps {
  /** Inline SVG content. */
  children: ReactNode;
  /** Mandatory ARIA label describing what the diagram shows. */
  ariaLabel: string;
  caption?: string;
  className?: string;
}

export function Diagram({ children, ariaLabel, caption, className }: DiagramProps) {
  return (
    <figure
      className={cn("my-6 rounded-lg border bg-card p-6", className)}
      role="img"
      aria-label={ariaLabel}
    >
      <div className="w-full">{children}</div>
      {caption && (
        <figcaption className="mt-3 text-sm text-muted-foreground italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
