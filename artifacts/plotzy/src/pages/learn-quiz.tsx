import { useEffect, useMemo, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CourseBreadcrumb } from "@/components/course/CourseBreadcrumb";
import {
  QuizQuestion,
  type QuizQuestionData,
} from "@/components/course/QuizQuestion";
import { QuizResult } from "@/components/course/QuizResult";
import { QuizTimer } from "@/components/course/QuizTimer";
import { useLanguage } from "@/contexts/language-context";
import { apiRequest } from "@/lib/queryClient";
import NotFound from "@/pages/not-found";

type Option = "a" | "b" | "c" | "d";

interface QuizResponse {
  id: number;
  moduleId: number | null;
  type: "module" | "final";
  passingPercentage: number;
  timeLimitMinutes: number | null;
  questionCount: number;
  questions: QuizQuestionData[];
}

interface AttemptReviewItem {
  questionId: number;
  questionText: string;
  yourAnswer: Option | null;
  correctAnswer: Option;
  correct: boolean;
  explanation: string | null;
}

interface AttemptResponse {
  attemptId: number;
  scorePercentage: number;
  correctCount: number;
  totalCount: number;
  passed: boolean;
  review: AttemptReviewItem[];
  bestScoreSoFar: number;
}

/**
 * sessionStorage helpers for in-progress quiz answers (DP4/D1).
 * Key namespace: `quiz:<id>:answers` and `quiz:<id>:startedAt`. We
 * cap recovery at 1 hour from startedAt — older draft state probably
 * means a stale tab and shouldn't auto-restore.
 */
const STORAGE_TTL_MS = 60 * 60 * 1000;
function loadDraft(quizId: number) {
  try {
    const startedAt = sessionStorage.getItem(`quiz:${quizId}:startedAt`);
    const answers = sessionStorage.getItem(`quiz:${quizId}:answers`);
    if (!startedAt) return null;
    if (Date.now() - new Date(startedAt).getTime() > STORAGE_TTL_MS) return null;
    return {
      startedAt,
      answers: (answers ? JSON.parse(answers) : {}) as Record<string, Option>,
    };
  } catch {
    return null;
  }
}
function saveDraft(quizId: number, startedAt: string, answers: Record<string, Option>) {
  try {
    sessionStorage.setItem(`quiz:${quizId}:startedAt`, startedAt);
    sessionStorage.setItem(`quiz:${quizId}:answers`, JSON.stringify(answers));
  } catch {
    /* sessionStorage full or disabled — ignore */
  }
}
function clearDraft(quizId: number) {
  try {
    sessionStorage.removeItem(`quiz:${quizId}:startedAt`);
    sessionStorage.removeItem(`quiz:${quizId}:answers`);
  } catch { /* ignore */ }
}

export default function LearnQuizPage() {
  const { t } = useLanguage();
  const [, params] = useRoute("/learn/quiz/:id");
  const [, navigate] = useLocation();
  const quizIdRaw = params?.id ?? "";
  const quizId = Number(quizIdRaw);
  const validId = Number.isFinite(quizId) && quizId > 0;

  const quizQ = useQuery<QuizResponse>({
    queryKey: ["/api/course/quizzes", quizIdRaw],
    enabled: validId,
    staleTime: Infinity,
  });

  // Restore in-flight draft on mount (or initialize startedAt fresh).
  const initial = useMemo(() => {
    if (!validId) return null;
    const draft = loadDraft(quizId);
    if (draft) return draft;
    return { startedAt: new Date().toISOString(), answers: {} as Record<string, Option> };
  }, [quizId, validId]);

  const [answers, setAnswers] = useState<Record<string, Option>>(initial?.answers ?? {});
  const [startedAt] = useState<string>(initial?.startedAt ?? new Date().toISOString());
  const [result, setResult] = useState<AttemptResponse | null>(null);

  // Persist answers + startedAt as the user fills in.
  useEffect(() => {
    if (!validId || result) return;
    saveDraft(quizId, startedAt, answers);
  }, [quizId, validId, startedAt, answers, result]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/course/quizzes/${quizId}/attempts`, {
        startedAt,
        answers,
      });
      return res.json() as Promise<AttemptResponse>;
    },
    onSuccess: (data) => {
      setResult(data);
      clearDraft(quizId);
    },
  });

  if (!validId || quizQ.isError) return <NotFound />;

  const allAnswered =
    quizQ.data && Object.keys(answers).length === quizQ.data.questions.length;

  return (
    <Layout>
      <SEO
        title={
          quizQ.data
            ? quizQ.data.type === "final"
              ? "Final Exam — Plotzy Writing Course"
              : "Quiz — Plotzy Writing Course"
            : "Quiz — Plotzy Writing Course"
        }
        noindex
      />

      <main className="container mx-auto max-w-3xl px-4 py-8 sm:py-10 space-y-6">
        <CourseBreadcrumb
          items={[
            { label: t("courseHome"), href: "/" },
            { label: t("navCourse"), href: "/learn" },
            { label: result ? t("courseQuizResultBreadcrumb") : t("courseQuizBreadcrumb") },
          ]}
        />

        {quizQ.isLoading && <QuizSkeleton />}

        {quizQ.data && !result && (
          <>
            <header className="space-y-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-serif tracking-tight">
                  {quizQ.data.type === "final"
                    ? t("courseQuizFinalTitle")
                    : t("courseQuizModuleTitle")}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t("courseQuizPassRequired")}: {quizQ.data.passingPercentage}%
                  {quizQ.data.timeLimitMinutes != null && (
                    <>
                      {" · "}
                      {t("courseQuizTimeLimit")}: {quizQ.data.timeLimitMinutes} {t("courseMinLabel")}
                    </>
                  )}
                </p>
              </div>
              {quizQ.data.timeLimitMinutes != null && (
                <QuizTimer
                  startedAt={startedAt}
                  limitMinutes={quizQ.data.timeLimitMinutes}
                  onExpire={() => submitMutation.mutate()}
                />
              )}
            </header>

            <div className="space-y-3">
              {quizQ.data.questions.map((q, idx) => (
                <QuizQuestion
                  key={q.id}
                  question={q}
                  index={idx + 1}
                  selectedAnswer={answers[String(q.id)] ?? null}
                  onSelect={(v) =>
                    setAnswers((prev) => ({ ...prev, [String(q.id)]: v }))
                  }
                />
              ))}
            </div>

            <Card className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm text-muted-foreground">
                {Object.keys(answers).length} / {quizQ.data.questions.length}{" "}
                {t("courseQuizAnswered")}
              </div>
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={!allAnswered || submitMutation.isPending}
                className="gap-2"
              >
                {submitMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                )}
                {t("courseQuizSubmit")}
              </Button>
            </Card>

            {submitMutation.isError && (
              <p className="text-sm text-red-600">
                {(submitMutation.error as Error).message || t("courseQuizSubmitError")}
              </p>
            )}
          </>
        )}

        {quizQ.data && result && (
          <>
            <header className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-serif tracking-tight">
                {t("courseQuizResultTitle")}
              </h1>
            </header>

            <QuizResult
              scorePercentage={result.scorePercentage}
              correctCount={result.correctCount}
              totalCount={result.totalCount}
              passed={result.passed}
              review={result.review}
              questions={quizQ.data.questions}
              bestScoreSoFar={result.bestScoreSoFar}
            />

            <div className="flex items-center gap-3 flex-wrap pt-4 border-t">
              <Button onClick={() => navigate("/learn")} variant="outline">
                {t("courseQuizBackToCourse")}
              </Button>
              {!result.passed && (
                <Button
                  onClick={() => {
                    setResult(null);
                    setAnswers({});
                  }}
                >
                  {t("courseQuizRetake")}
                </Button>
              )}
            </div>
          </>
        )}
      </main>
    </Layout>
  );
}

function QuizSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-7 w-48 bg-secondary rounded" />
      <div className="h-3 w-32 bg-secondary rounded" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="p-5 space-y-3">
          <div className="h-4 w-2/3 bg-secondary rounded" />
          <div className="space-y-2">
            <div className="h-9 w-full bg-secondary rounded" />
            <div className="h-9 w-full bg-secondary rounded" />
            <div className="h-9 w-full bg-secondary rounded" />
            <div className="h-9 w-full bg-secondary rounded" />
          </div>
        </Card>
      ))}
    </div>
  );
}
