import { Link } from "wouter";
import { CheckCircle2, Circle, Clock, Play, PenLine, HelpCircle, FileDown, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/language-context";
import { arField } from "@/lib/course-ui";
import { LESSON_FEATURES } from "@/lib/course-lesson-features";

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
  titleAr?: string | null;
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
  const { t, isRTL } = useLanguage();
  return (
    <Link href={`/learn/lesson/${lesson.slug}`}>
      <Card
        className={`flex items-center gap-3 p-4 hover:bg-accent/30 transition-colors cursor-pointer ${className}`}
      >
        {completed ? (
          <CheckCircle2
            className="h-5 w-5 text-primary shrink-0"
            aria-label={t("courseLessonCompleted")}
          />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">
            <span className="text-muted-foreground me-2">{lesson.orderInModule}.</span>
            {arField(isRTL, lesson.title, lesson.titleAr)}
          </div>
          <LessonContentChips slug={lesson.slug} />
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Clock className="h-3 w-3" aria-hidden />
          {lesson.estimatedMinutes} {t("courseMinLabel")}
        </span>
      </Card>
    </Link>
  );
}

// Small icon chips advertising what's inside a lesson (videos to watch,
// interactive checks, a writing exercise, downloadable worksheets) so
// the module list reads like a menu, not a wall of titles.
function LessonContentChips({ slug }: { slug: string }) {
  const { isRTL } = useLanguage();
  const f = LESSON_FEATURES[slug];
  if (!f) return null;

  const chips: Array<{ icon: typeof Play; label: string; count: number }> = [
    { icon: Play, count: f.videos, label: isRTL ? "فيديو" : "video" },
    { icon: HelpCircle, count: f.checks, label: isRTL ? "سؤال" : "checks" },
    { icon: PenLine, count: f.exercises, label: isRTL ? "تمرين" : "exercise" },
    { icon: Layers, count: f.examples + f.cards + f.diagrams, label: isRTL ? "تفاعلي" : "interactive" },
    { icon: FileDown, count: f.resources, label: isRTL ? "ملف" : "file" },
  ];

  const visible = chips.filter((c) => c.count > 0);
  if (visible.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
      {visible.map(({ icon: Icon, label, count }, i) => (
        <span key={i} className="inline-flex items-center gap-1 text-[0.65rem] text-muted-foreground">
          <Icon className="h-2.5 w-2.5" aria-hidden />
          {count > 1 ? `${count} ${label}` : label}
        </span>
      ))}
    </div>
  );
}
