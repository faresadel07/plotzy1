import { Link } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";

/**
 * Prev / next navigation at the bottom of every lesson. Either side
 * can be null at the catalog boundary (no previous on the first
 * lesson; no next on the last lesson — caller can render a quiz CTA
 * there instead).
 *
 * RTL: arrows are swapped programmatically (ChevronLeft for "prev"
 * becomes ChevronRight in RTL) rather than relying on CSS rotation.
 * Rotating Lucide icons via transforms has caused stroke artifacts in
 * other Plotzy areas; manual swap is safer and reads naturally.
 *
 * Reuses: <Button>, wouter <Link>, lucide-react chevrons, useLanguage().
 */

interface NavTarget {
  slug: string;
  title: string;
}

interface LessonNavigationProps {
  prev: NavTarget | null;
  next: NavTarget | null;
  className?: string;
}

export function LessonNavigation({ prev, next, className = "" }: LessonNavigationProps) {
  const { t, isRTL } = useLanguage();
  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <nav
      aria-label="Lesson navigation"
      className={`flex items-stretch justify-between gap-3 py-4 border-t ${className}`}
    >
      {prev ? (
        <Link href={`/learn/lesson/${prev.slug}`}>
          <Button
            variant="ghost"
            className="h-auto gap-2 max-w-[45%] justify-start py-2"
          >
            <PrevIcon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex flex-col items-start text-start min-w-0">
              <span className="text-xs text-muted-foreground">{t("coursePrev")}</span>
              <span className="text-sm truncate w-full">{prev.title}</span>
            </span>
          </Button>
        </Link>
      ) : (
        <div aria-hidden />
      )}
      {next ? (
        <Link href={`/learn/lesson/${next.slug}`}>
          <Button
            variant="ghost"
            className="h-auto gap-2 max-w-[45%] justify-end py-2"
          >
            <span className="flex flex-col items-end text-end min-w-0">
              <span className="text-xs text-muted-foreground">{t("courseNext")}</span>
              <span className="text-sm truncate w-full">{next.title}</span>
            </span>
            <NextIcon className="h-4 w-4 shrink-0" aria-hidden />
          </Button>
        </Link>
      ) : (
        <div aria-hidden />
      )}
    </nav>
  );
}
