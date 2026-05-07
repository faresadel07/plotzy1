import { useLanguage } from "@/contexts/language-context";

interface ModulePreview {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  order: number;
  lessonCount: number;
  estimatedMinutes: number;
}

interface CourseModulesPreviewProps {
  modules: ModulePreview[] | undefined;
  isLoading: boolean;
}

/**
 * Curriculum preview on /course — shows only module titles + lesson
 * counts (per DP2: keep the lesson-by-lesson curriculum a surprise
 * inside the members-only /learn area). The numbered ordering reads
 * like a syllabus.
 */
export function CourseModulesPreview({ modules, isLoading }: CourseModulesPreviewProps) {
  const { t } = useLanguage();

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">
        {t("courseLandingCurriculumHeading")}
      </h2>

      {isLoading && (
        <ul className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="h-14 rounded-lg border bg-secondary/30 animate-pulse"
            />
          ))}
        </ul>
      )}

      {modules && (
        <ol className="space-y-2">
          {modules.map((m) => (
            <li
              key={m.id}
              className="flex items-baseline gap-4 rounded-lg border bg-card px-4 py-3 hover:bg-accent/30 transition-colors"
            >
              <span className="text-sm font-mono text-muted-foreground tabular-nums w-8 shrink-0">
                {String(m.order).padStart(2, "0")}
              </span>
              <span className="flex-1 font-medium">{m.title}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {m.lessonCount} · {m.estimatedMinutes} min
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
