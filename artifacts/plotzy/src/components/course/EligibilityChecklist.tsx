import { CheckCircle2, Circle } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

/**
 * Surfaces the 4-criteria eligibility status from the
 * `getCertificateEligibility` response. Used inside the IssueCertButton
 * dialog when the API returns 409 NOT_ELIGIBLE, and on the dashboard
 * before the user has earned the cert.
 *
 * Each row is either green-checked (criterion met) or neutral-circled
 * (criterion pending), with a descriptive label and progress count
 * where applicable.
 *
 * Reuses: lucide-react icons, useLanguage(). No external state.
 * Non-goals: links to the next pending action (could be a follow-up).
 */

export interface CertificateMissing {
  lessonsCompleted: number;
  totalLessons: number;
  moduleQuizzesPassed: number;
  totalModuleQuizzes: number;
  finalExamPassed: boolean;
  finalProjectSubmitted: boolean;
}

interface EligibilityChecklistProps {
  missing: CertificateMissing;
  className?: string;
}

export function EligibilityChecklist({ missing, className = "" }: EligibilityChecklistProps) {
  const { t } = useLanguage();
  const lessonsDone = missing.lessonsCompleted >= missing.totalLessons;
  const quizzesDone = missing.moduleQuizzesPassed >= missing.totalModuleQuizzes;

  const items: { ok: boolean; label: string; detail?: string }[] = [
    {
      ok: lessonsDone,
      label: t("courseEligLessons"),
      detail: `${missing.lessonsCompleted} / ${missing.totalLessons}`,
    },
    {
      ok: quizzesDone,
      label: t("courseEligModuleQuizzes"),
      detail: `${missing.moduleQuizzesPassed} / ${missing.totalModuleQuizzes}`,
    },
    { ok: missing.finalExamPassed, label: t("courseEligFinalExam") },
    { ok: missing.finalProjectSubmitted, label: t("courseEligProject") },
  ];

  return (
    <ul className={`space-y-2 ${className}`}>
      {items.map((item, idx) => (
        <li key={idx} className="flex items-start gap-3 text-sm">
          {item.ok ? (
            <CheckCircle2
              className="h-5 w-5 text-primary shrink-0 mt-0.5"
              aria-label={t("courseEligDone")}
            />
          ) : (
            <Circle
              className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5"
              aria-label={t("courseEligPending")}
            />
          )}
          <span className="flex-1">
            <span className={item.ok ? "text-foreground" : "text-muted-foreground"}>
              {item.label}
            </span>
            {item.detail && (
              <span className="ms-2 text-xs text-muted-foreground">({item.detail})</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
