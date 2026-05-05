import { Trophy, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuizQuestion, type QuizQuestionData, type QuizQuestionReview } from "./QuizQuestion";
import { useLanguage } from "@/contexts/language-context";

/**
 * Post-attempt result display. Score banner + per-question review with
 * answer reveal and explanation. Top banner color reflects pass/fail.
 *
 * Reuses: <Card>, <Badge>, <QuizQuestion> in review mode, lucide-react.
 * Non-goals: animated score reveal (consider for cert moment, not here);
 * leaderboard / comparison to other users (not in spec).
 */

type Option = "a" | "b" | "c" | "d";

interface ReviewItem {
  questionId: number;
  questionText: string;
  yourAnswer: Option | null;
  correctAnswer: Option;
  correct: boolean;
  explanation: string | null;
}

interface QuizResultProps {
  scorePercentage: number;
  correctCount: number;
  totalCount: number;
  passed: boolean;
  /** The full per-question review payload returned by the API. */
  review: ReviewItem[];
  /**
   * Original question rows (with the 4 options + order) — needed for
   * QuizQuestion to render. The API's review response only carries
   * questionText + correct/your answers, so the parent passes the
   * already-fetched questions through.
   */
  questions: QuizQuestionData[];
  bestScoreSoFar?: number;
  className?: string;
}

export function QuizResult({
  scorePercentage,
  correctCount,
  totalCount,
  passed,
  review,
  questions,
  bestScoreSoFar,
  className = "",
}: QuizResultProps) {
  const { t } = useLanguage();
  const banner = passed
    ? "border-green-600/40 bg-green-600/10"
    : "border-amber-600/40 bg-amber-600/10";

  // Index questions by id so we can pair each review item to its
  // source row in O(1) inside the loop below.
  const questionById = new Map(questions.map((q) => [q.id, q]));

  return (
    <div className={`space-y-5 ${className}`}>
      <Card className={`p-6 flex items-center gap-4 ${banner}`}>
        {passed ? (
          <Trophy className="h-10 w-10 text-green-600 shrink-0" aria-hidden />
        ) : (
          <RotateCcw className="h-10 w-10 text-amber-600 shrink-0" aria-hidden />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-muted-foreground">
            {passed ? t("courseQuizPassed") : t("courseQuizFailed")}
          </div>
          <div className="text-2xl font-semibold tracking-tight">
            {scorePercentage}%
            <span className="ms-2 text-sm font-normal text-muted-foreground">
              ({correctCount} / {totalCount})
            </span>
          </div>
          {typeof bestScoreSoFar === "number" && bestScoreSoFar > scorePercentage && (
            <div className="text-xs text-muted-foreground mt-1">
              {t("courseQuizBestScore")}: {bestScoreSoFar}%
            </div>
          )}
        </div>
        <Badge variant={passed ? "default" : "secondary"} className="shrink-0">
          {passed ? t("courseQuizPassed") : t("courseQuizFailed")}
        </Badge>
      </Card>

      <div className="space-y-3">
        {review.map((item, idx) => {
          const q = questionById.get(item.questionId);
          if (!q) return null; // defensive — should not happen
          const reviewState: QuizQuestionReview = {
            yourAnswer: item.yourAnswer,
            correctAnswer: item.correctAnswer,
            explanation: item.explanation,
          };
          return (
            <QuizQuestion
              key={item.questionId}
              question={q}
              index={idx + 1}
              review={reviewState}
            />
          );
        })}
      </div>
    </div>
  );
}
