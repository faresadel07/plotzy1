import { cn } from "@/lib/utils";

/**
 * Top-of-lesson hero — full-bleed image with optional title overlay.
 * One per lesson (mandatory after B2 ships).
 *
 * Performance: hero is the page's LCP element. Caller should also inject
 * `<link rel="preload" as="image" href={src}>` via react-helmet-async on
 * the lesson page. `loading="eager"` (in contrast to InlineImage's lazy)
 * ensures the browser fetches the hero immediately.
 *
 * A11y: `alt` is non-optional. Decorative-only heroes don't exist —
 * if a hero doesn't carry meaning, it shouldn't be in the lesson.
 */

interface HeroProps {
  /** Image URL or imported asset. */
  src: string;
  /** WebP source for <picture> primary; falls back to src JPEG/PNG. */
  webpSrc?: string;
  /** Alt text. Mandatory. */
  alt: string;
  /** Optional caption rendered under the image. */
  caption?: string;
  /** Optional source attribution (PD attribution / photographer / "AI-generated"). */
  source?: { label: string; href?: string };
  /** Title overlay on top of the image. If omitted, the lesson page renders the title separately. */
  overlayTitle?: { eyebrow?: string; title: string };
  /** Aspect ratio. Default 21/9 cinematic banner. */
  aspectRatio?: "21/9" | "16/9" | "4/3";
  className?: string;
}

const ASPECT_CLASSES: Record<NonNullable<HeroProps["aspectRatio"]>, string> = {
  "21/9": "aspect-[21/9]",
  "16/9": "aspect-video",
  "4/3": "aspect-[4/3]",
};

export function Hero({
  src,
  webpSrc,
  alt,
  caption,
  source,
  overlayTitle,
  aspectRatio = "21/9",
  className,
}: HeroProps) {
  return (
    <figure className={cn("w-full", className)}>
      <div className={cn("relative w-full overflow-hidden rounded-xl", ASPECT_CLASSES[aspectRatio])}>
        <picture>
          {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
          <img
            src={src}
            alt={alt}
            loading="eager"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>
        {overlayTitle && (
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-black/20 to-transparent">
            <div className="p-6 sm:p-10 text-white">
              {overlayTitle.eyebrow && (
                <div className="text-xs uppercase tracking-[0.2em] mb-2 opacity-80">
                  {overlayTitle.eyebrow}
                </div>
              )}
              <h1 className="font-sans text-3xl sm:text-5xl tracking-tight">
                {overlayTitle.title}
              </h1>
            </div>
          </div>
        )}
      </div>
      {(caption || source) && (
        <figcaption className="mt-2 text-sm text-muted-foreground italic">
          {caption}
          {caption && source && " — "}
          {source && (
            <span className="text-xs not-italic">
              {source.href ? (
                <a
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground transition-colors"
                >
                  {source.label}
                </a>
              ) : (
                source.label
              )}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
}
