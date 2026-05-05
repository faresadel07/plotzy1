import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/language-context";

/**
 * Course progress bar with a percentage label and optional caption.
 * Layers a numeric label + caption around the existing Radix-based
 * <Progress> primitive. Uses Tailwind's logical text-start/end so the
 * caption flows correctly under RTL.
 *
 * Reuses: <Progress> from components/ui/progress.tsx, useLanguage().
 * Non-goals: animated value transitions (handled by Progress itself);
 * custom colors (override via className).
 */

interface CourseProgressBarProps {
  /** 0..100 — values outside the range are clamped. */
  value: number;
  /** Optional left-side caption (e.g. "3 / 27 lessons"). */
  caption?: string;
  /** Hide the right-side "X% complete" label. Default: shown. */
  showLabel?: boolean;
  className?: string;
}

export function CourseProgressBar({
  value,
  caption,
  showLabel = true,
  className = "",
}: CourseProgressBarProps) {
  const { t } = useLanguage();
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const showLine = !!caption || showLabel;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <Progress value={clamped} className="h-2" />
      {showLine && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {caption ? <span>{caption}</span> : <span />}
          {showLabel && (
            <span>
              {clamped}% {t("courseProgressLabel")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
