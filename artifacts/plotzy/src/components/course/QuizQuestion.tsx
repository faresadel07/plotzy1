import { CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLanguage } from "@/contexts/language-context";

/**
 * Single quiz question with 4 radio options. Three modes:
 *   - active: user picks an option (selectedAnswer + onSelect)
 *   - submitted (no review prop): radio is disabled, no answer reveal
 *   - reviewed (review prop set): correct option highlighted green;
 *     wrong selection highlighted red; explanation surfaces below
 *
 * Reuses: <Card>, <RadioGroup>, <RadioGroupItem>, lucide-react icons.
 * Non-goals: timer per question (course quizzes time the whole attempt,
 * not per-question); answer change after submit (the API records one
 * attempt per submit; resubmit creates a new attempt row).
 */

type Option = "a" | "b" | "c" | "d";

export interface QuizQuestionData {
  id: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  order: number;
}

export interface QuizQuestionReview {
  yourAnswer: Option | null;
  correctAnswer: Option;
  explanation: string | null;
}

interface QuizQuestionProps {
  question: QuizQuestionData;
  /** 1-based index for display ("Question 3 of 5"). */
  index: number;
  selectedAnswer?: Option | null;
  onSelect?: (answer: Option) => void;
  /** When set, locks the question and reveals correct/explanation. */
  review?: QuizQuestionReview;
  className?: string;
}

const OPTIONS: { key: Option; field: keyof QuizQuestionData }[] = [
  { key: "a", field: "optionA" },
  { key: "b", field: "optionB" },
  { key: "c", field: "optionC" },
  { key: "d", field: "optionD" },
];

export function QuizQuestion({
  question,
  index,
  selectedAnswer,
  onSelect,
  review,
  className = "",
}: QuizQuestionProps) {
  const { t } = useLanguage();
  const reviewing = !!review;

  return (
    <Card className={`p-5 space-y-4 ${className}`}>
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground font-medium">
          {t("courseQuizQuestionLabel")} {index}
        </div>
        <div className="text-base font-medium">{question.questionText}</div>
      </div>

      <RadioGroup
        value={review?.yourAnswer ?? selectedAnswer ?? undefined}
        onValueChange={onSelect ? (v) => onSelect(v as Option) : undefined}
        disabled={reviewing}
        className="gap-2"
      >
        {OPTIONS.map(({ key, field }) => {
          const isCorrect = reviewing && key === review!.correctAnswer;
          const isWrongSelection =
            reviewing &&
            review!.yourAnswer === key &&
            review!.yourAnswer !== review!.correctAnswer;

          let stateClass = "";
          if (isCorrect) stateClass = "border-green-600/50 bg-green-600/10";
          else if (isWrongSelection) stateClass = "border-red-600/50 bg-red-600/10";

          const id = `q${question.id}-${key}`;
          return (
            <label
              key={key}
              htmlFor={id}
              className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors hover:bg-accent/30 ${stateClass}`}
            >
              <RadioGroupItem id={id} value={key} className="mt-0.5" />
              <span className="flex-1 text-sm leading-relaxed">
                {question[field]}
              </span>
              {isCorrect && (
                <CheckCircle2
                  className="h-5 w-5 text-green-600 shrink-0"
                  aria-label={t("courseQuizCorrect")}
                />
              )}
              {isWrongSelection && (
                <XCircle
                  className="h-5 w-5 text-red-600 shrink-0"
                  aria-label={t("courseQuizIncorrect")}
                />
              )}
            </label>
          );
        })}
      </RadioGroup>

      {reviewing && review!.explanation && (
        <div className="rounded-md border bg-secondary/30 p-3 text-sm">
          <div className="text-xs font-medium text-muted-foreground mb-1">
            {t("courseQuizExplanation")}
          </div>
          <div>{review!.explanation}</div>
        </div>
      )}
    </Card>
  );
}
