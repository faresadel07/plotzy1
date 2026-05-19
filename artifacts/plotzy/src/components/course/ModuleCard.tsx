import { Link } from "wouter";
import { Clock, BookOpen } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CourseProgressBar } from "./ProgressBar";
import { useLanguage } from "@/contexts/language-context";
import { APPLE_FONT, moduleImage } from "@/lib/course-ui";

/**
 * Card for a single module on the /learn module grid. Title, subtitle,
 * lesson count, estimated minutes, and an optional progress bar (shown
 * when the user is authenticated and `completedLessons` is provided).
 * The whole card is the click target → navigates to /learn/module/<slug>.
 *
 * Reuses: <Card>, <CardHeader>, <CardTitle>, <CardDescription>,
 * <CardContent>, lucide-react Clock + BookOpen, wouter <Link>,
 * <CourseProgressBar>, useLanguage().
 *
 * Non-goals: hover animations beyond the standard accent fade; per-card
 * featured badging (future, when modules need promotion).
 */

interface ModuleSummary {
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  order: number;
  estimatedMinutes: number;
  lessonCount: number;
}

interface ModuleCardProps {
  module: ModuleSummary;
  /** Omit for anonymous view — no progress bar will render. */
  completedLessons?: number;
  className?: string;
}

export function ModuleCard({ module, completedLessons, className = "" }: ModuleCardProps) {
  const { t } = useLanguage();
  const showProgress =
    typeof completedLessons === "number" && module.lessonCount > 0;
  const percent = showProgress
    ? Math.round((completedLessons / module.lessonCount) * 100)
    : 0;

  return (
    <Link href={`/learn/module/${module.slug}`}>
      <Card
        className={`group hover:bg-accent/30 transition-colors cursor-pointer h-full overflow-hidden flex flex-col ${className}`}
        style={{ fontFamily: APPLE_FONT }}
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-muted">
          <img
            src={moduleImage(module.order)}
            alt={module.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          <span className="absolute left-4 bottom-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85">
            {t("courseModuleNumber")} {module.order}
          </span>
        </div>
        <CardHeader>
          <CardTitle className="text-lg tracking-tight">{module.title}</CardTitle>
          {module.subtitle && <CardDescription>{module.subtitle}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              {module.lessonCount} {t("courseLessonsLabel")}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              ~{module.estimatedMinutes} {t("courseMinLabel")}
            </span>
          </div>
          {showProgress && (
            <CourseProgressBar
              value={percent}
              caption={`${completedLessons} / ${module.lessonCount}`}
            />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
