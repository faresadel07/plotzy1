import { Link } from "wouter";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/language-context";

/**
 * Compact row for a single lesson on the module overview page. Order
 * number, title, completion checkmark, and estimated minutes. Click
 * navigates to /learn/lesson/<slug>.
 *
 * Reuses: <Card>, lucide-react icons, wouter <Link>, useLanguage().
 * Non-goals: drag-to-reorder (lesson order is catalog-controlled);
 * inline preview / progress percent (use ModuleCard for that).
 */

interface LessonSummary {
  slug: string;
  title: string;
  orderInModule: number;
  estimatedMinutes: number;
}

interface LessonCardProps {
  lesson: LessonSummary;
  completed?: boolean;
  className?: string;
}

export function LessonCard({
  lesson,
  completed = false,
  className = "",
}: LessonCardProps) {
  const { t } = useLanguage();
  return (
    <Link href={`/learn/lesson/${lesson.slug}`}>
      <Card
        className={`flex items-center gap-3 p-4 hover:bg-accent/30 transition-colors cursor-pointer ${className}`}
      >
        {completed ? (
          <CheckCircle2
            className="h-5 w-5 text-primary shrink-0"
            aria-label={t("courseQuizCorrect")}
          />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">
            <span className="text-muted-foreground me-2">{lesson.orderInModule}.</span>
            {lesson.title}
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Clock className="h-3 w-3" aria-hidden />
          {lesson.estimatedMinutes} {t("courseMinLabel")}
        </span>
      </Card>
    </Link>
  );
}
