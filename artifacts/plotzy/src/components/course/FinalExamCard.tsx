import { Link } from "wouter";
import { Award, Lock, CheckCircle2, FileQuestion, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/language-context";

/**
 * Card for the final exam on the /learn module grid. Sits as the 7th
 * card after the 6 module cards. Three states:
 *   - Locked  — user has not yet passed all 6 module quizzes. Card
 *               renders disabled with a "complete all module quizzes
 *               to unlock" hint. Not clickable.
 *   - Unlocked — prereqs met, exam not yet attempted/passed. Card
 *                links to /learn/quiz/<finalQuizId> and shows the
 *                question count + time limit + pass mark.
 *   - Passed   — user has passed the final exam. Card links to the
 *                same route (which renders the result UI for a passed
 *                attempt) and shows the user's best score.
 *
 * Eligibility-to-take is computed CLIENT-SIDE from the
 * `quizzes: { type: "module", passed: boolean }[]` array in the
 * /api/course/progress response — no extra fetch.
 *
 * Reuses: <Card>, lucide-react Award/Lock/CheckCircle2/FileQuestion/
 * Clock, wouter <Link>, useLanguage().
 */

interface FinalExamSummary {
  quizId: number;
  questionCount: number;
  timeLimitMinutes: number | null;
  passingPercentage: number;
  passed: boolean;
  bestScore: number | null;
  /** All 6 module quizzes passed? (computed client-side from progress) */
  eligibleToTake: boolean;
}

interface FinalExamCardProps {
  exam: FinalExamSummary;
  className?: string;
}

export function FinalExamCard({ exam, className = "" }: FinalExamCardProps) {
  const { t } = useLanguage();

  // Stat row for the unlocked + locked states (same metadata, same
  // layout — the only difference is whether the card is clickable).
  const statRow = (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <FileQuestion className="h-3.5 w-3.5" aria-hidden />
        {exam.questionCount} {t("courseFinalExamQuestions")}
      </span>
      {exam.timeLimitMinutes != null && (
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {exam.timeLimitMinutes} {t("courseMinLabel")}
        </span>
      )}
      <span>
        {exam.passingPercentage}% {t("courseFinalExamPassMark")}
      </span>
    </div>
  );

  // ── PASSED ─────────────────────────────────────────────────────────
  if (exam.passed) {
    return (
      <Link href={`/learn/quiz/${exam.quizId}`}>
        <Card
          className={`hover:bg-accent/30 transition-colors cursor-pointer h-full border-primary/40 ${className}`}
        >
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" aria-hidden />
              {t("courseFinalExamTitle")}
            </CardTitle>
            <CardDescription>{t("courseFinalExamPassedSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="inline-flex items-center gap-1.5 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {t("courseFinalExamPassed")}
              {exam.bestScore != null && ` (${exam.bestScore}%)`}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  // ── LOCKED (not eligible to take) ──────────────────────────────────
  if (!exam.eligibleToTake) {
    return (
      <Card
        className={`h-full border-primary/20 opacity-70 ${className}`}
        aria-disabled="true"
      >
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" aria-hidden />
            {t("courseFinalExamTitle")}
          </CardTitle>
          <CardDescription>{t("courseFinalExamLockedSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">{statRow}</CardContent>
      </Card>
    );
  }

  // ── UNLOCKED (eligible, not yet passed) ────────────────────────────
  return (
    <Link href={`/learn/quiz/${exam.quizId}`}>
      <Card
        className={`hover:bg-accent/30 transition-colors cursor-pointer h-full border-primary/40 ${className}`}
      >
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" aria-hidden />
            {t("courseFinalExamTitle")}
          </CardTitle>
          <CardDescription>{t("courseFinalExamUnlockedSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">{statRow}</CardContent>
      </Card>
    </Link>
  );
}
