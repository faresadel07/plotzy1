import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles, Send, Info } from "lucide-react";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CourseBreadcrumb } from "@/components/course/CourseBreadcrumb";
import { FeedbackPanel, type CourseFeedback } from "@/components/course/FeedbackPanel";
import { useLanguage } from "@/contexts/language-context";
import { apiRequest } from "@/lib/queryClient";

interface BookListItem {
  id: number;
  title: string | null;
  authorName?: string | null;
}

interface ChapterListItem {
  id: number;
  title: string | null;
  order: number;
}

interface FinalProjectResponse {
  project: {
    id: number;
    bookId: number;
    chapterIds: number[];
    submittedAt: string;
    approvedAt: string | null;
    aiFeedback: CourseFeedback | null;
  } | null;
}

interface FeedbackResponse {
  feedback: CourseFeedback;
  cached: boolean;
}

export default function LearnFinalProjectPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const projectQ = useQuery<FinalProjectResponse>({
    queryKey: ["/api/course/final-project"],
    staleTime: 0,
  });

  const booksQ = useQuery<BookListItem[]>({
    queryKey: ["/api/books"],
    staleTime: 60_000,
  });

  // Local form state — initialized from the existing submission if any.
  const [bookId, setBookId] = useState<number | null>(null);
  const [chapterIds, setChapterIds] = useState<number[]>([]);

  // When the existing project loads, prime the form so the user sees
  // their previous selections.
  useEffect(() => {
    const p = projectQ.data?.project;
    if (p && bookId === null) {
      setBookId(p.bookId);
      setChapterIds(p.chapterIds);
    }
  }, [projectQ.data, bookId]);

  const chaptersQ = useQuery<ChapterListItem[]>({
    queryKey: ["/api/books", bookId, "chapters"],
    enabled: bookId !== null,
    staleTime: 60_000,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!bookId) throw new Error("Pick a book");
      const res = await apiRequest("POST", "/api/course/final-project", {
        bookId,
        chapterIds,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/course/final-project"] });
      queryClient.invalidateQueries({ queryKey: ["/api/course/progress"] });
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async (force: boolean) => {
      const res = await apiRequest("POST", "/api/course/final-project/feedback", { force });
      return res.json() as Promise<FeedbackResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/course/final-project"] });
    },
  });

  const project = projectQ.data?.project ?? null;
  const hasFeedback = !!project?.aiFeedback;
  const validForSubmit = bookId !== null && chapterIds.length === 3;

  // Detect a "form has changed" state — useful to disable the
  // "Get feedback" button if the user is editing without resubmitting.
  const formMatchesSubmission = useMemo(() => {
    if (!project) return false;
    if (project.bookId !== bookId) return false;
    if (project.chapterIds.length !== chapterIds.length) return false;
    const a = [...project.chapterIds].sort();
    const b = [...chapterIds].sort();
    return a.every((id, i) => id === b[i]);
  }, [project, bookId, chapterIds]);

  return (
    <Layout>
      <SEO title="Final Project — Plotzy Writing Course" noindex />

      <main className="container mx-auto max-w-3xl px-4 py-8 sm:py-10 space-y-8">
        <CourseBreadcrumb
          items={[
            { label: t("courseHome"), href: "/" },
            { label: t("navCourse"), href: "/learn" },
            { label: t("courseFinalProjectBreadcrumb") },
          ]}
        />

        <header className="space-y-2">
          <h1 className="text-3xl font-serif tracking-tight">{t("courseFinalProjectTitle")}</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {t("courseFinalProjectSubtitle")}
          </p>
        </header>

        {/* Submission form */}
        <section className="space-y-4">
          <Card className="p-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("courseFinalProjectPickBook")}</label>
              {booksQ.isLoading ? (
                <div className="h-10 bg-secondary rounded animate-pulse" />
              ) : (
                <Select
                  value={bookId !== null ? String(bookId) : undefined}
                  onValueChange={(v) => {
                    const id = Number(v);
                    setBookId(id);
                    setChapterIds([]); // chapters don't carry over to a different book
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("courseFinalProjectPickBookPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(booksQ.data ?? []).map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.title || `Book #${b.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {booksQ.data && booksQ.data.length === 0 && (
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" aria-hidden />
                  {t("courseFinalProjectNoBooks")}
                </p>
              )}
            </div>

            {bookId !== null && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("courseFinalProjectPickChapters")}{" "}
                  <span className="text-muted-foreground font-normal">
                    ({chapterIds.length} / 3)
                  </span>
                </label>
                {chaptersQ.isLoading ? (
                  <div className="space-y-2">
                    <div className="h-10 bg-secondary rounded animate-pulse" />
                    <div className="h-10 bg-secondary rounded animate-pulse" />
                  </div>
                ) : (
                  <div className="space-y-1 max-h-72 overflow-y-auto rounded-md border p-2">
                    {(chaptersQ.data ?? []).map((c) => {
                      const isPicked = chapterIds.includes(c.id);
                      const atCap = chapterIds.length >= 3 && !isPicked;
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-accent/30 ${
                            atCap ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <Checkbox
                            checked={isPicked}
                            disabled={atCap}
                            onCheckedChange={(v) => {
                              setChapterIds((prev) => {
                                if (v) return prev.length < 3 ? [...prev, c.id] : prev;
                                return prev.filter((x) => x !== c.id);
                              });
                            }}
                          />
                          <span className="text-sm flex-1">
                            <span className="text-muted-foreground me-2">{c.order}.</span>
                            {c.title || `Chapter ${c.order}`}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
              <span className="text-xs text-muted-foreground">
                {project ? t("courseFinalProjectResubmitNote") : t("courseFinalProjectFirstSubmitNote")}
              </span>
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={!validForSubmit || submitMutation.isPending}
                className="gap-2"
              >
                {submitMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-4 w-4" aria-hidden />
                )}
                {project ? t("courseFinalProjectResubmit") : t("courseFinalProjectSubmit")}
              </Button>
            </div>

            {submitMutation.isError && (
              <p className="text-sm text-red-600">
                {(submitMutation.error as Error).message || t("courseFinalProjectSubmitError")}
              </p>
            )}
          </Card>
        </section>

        {/* AI feedback section — only shows once a submission exists */}
        {project && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xl font-semibold tracking-tight">
                {t("courseFinalProjectFeedbackHeader")}
              </h2>
              <Button
                onClick={() => feedbackMutation.mutate(hasFeedback)}
                disabled={feedbackMutation.isPending || !formMatchesSubmission}
                variant={hasFeedback ? "outline" : "default"}
                className="gap-2"
              >
                {feedbackMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden />
                )}
                {hasFeedback ? t("courseFinalProjectRegenerate") : t("courseFinalProjectGetFeedback")}
              </Button>
            </div>

            {!formMatchesSubmission && (
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Info className="h-3.5 w-3.5" aria-hidden />
                {t("courseFinalProjectResubmitFirst")}
              </p>
            )}

            {feedbackMutation.isError && (
              <p className="text-sm text-red-600">
                {(feedbackMutation.error as Error).message || t("courseFinalProjectFeedbackError")}
              </p>
            )}

            {project.aiFeedback ? (
              <FeedbackPanel feedback={project.aiFeedback} />
            ) : (
              <Card className="p-5 text-sm text-muted-foreground">
                {t("courseFinalProjectFeedbackEmpty")}
                <span className="block mt-1 text-xs">
                  {t("courseFinalProjectFeedbackCost")}
                </span>
              </Card>
            )}
          </section>
        )}
      </main>
    </Layout>
  );
}
