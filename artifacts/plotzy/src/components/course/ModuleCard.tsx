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
        className={`hover:bg-accent/30 transition-colors cursor-pointer h-full ${className}`}
      >
        <CardHeader>
          <div className="text-xs text-muted-foreground font-medium mb-1">
            {t("courseModuleNumber")} {module.order}
          </div>
          <CardTitle className="text-lg">{module.title}</CardTitle>
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
