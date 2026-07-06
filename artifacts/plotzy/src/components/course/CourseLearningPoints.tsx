import { CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

/**
 * "What you'll learn" bullet list — the 5 concrete outcomes a visitor
 * will get from finishing the course. Used on /course between the
 * overview prose and the curriculum preview.
 */
export function CourseLearningPoints() {
  const { t } = useLanguage();

  const points = [
    t("courseLandingWYL1"),
    t("courseLandingWYL2"),
    t("courseLandingWYL3"),
    t("courseLandingWYL4"),
    t("courseLandingWYL5"),
  ];

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">
        {t("courseLandingWYLHeading")}
      </h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {points.map((p, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-primary/40"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
            </span>
            <span className="text-sm leading-relaxed">{p}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
