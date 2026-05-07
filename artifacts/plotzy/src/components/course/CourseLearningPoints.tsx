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
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {points.map((p, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
