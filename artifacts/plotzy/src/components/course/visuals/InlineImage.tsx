import { cn } from "@/lib/utils";

/**
 * Content-matched inline image for embedding mid-prose. Lazy-loaded
 * (in contrast to Hero's eager). The Markdown component will be
 * extended in B3 to render `![alt](src "caption")` markdown syntax
 * as <InlineImage>.
 *
 * Width modes:
 * - "centered" stays in the prose column.
 * - "wide" breaks out slightly wider on `lg:` breakpoint via negative
 *   horizontal margins. Useful for an inline image that wants more
 *   room than body text.
 *
 * A11y: `alt` is non-optional. Decorative-only images are rare in
 * lessons — pass `alt=""` + `role="presentation"` on the consumer side
 * if genuinely needed.
 */

interface InlineImageProps {
  src: string;
  webpSrc?: string;
  alt: string;
  caption?: string;
  source?: { label: string; href?: string };
  width?: "centered" | "wide";
  className?: string;
}

export function InlineImage({
  src,
  webpSrc,
  alt,
  caption,
  source,
  width = "centered",
  className,
}: InlineImageProps) {
  return (
    <figure
      className={cn(
        "my-6 rounded-lg border bg-card overflow-hidden",
        width === "wide" && "lg:-mx-12",
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
