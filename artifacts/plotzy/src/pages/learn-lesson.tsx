import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { JsonLd } from "@/components/JsonLd";
import { buildBreadcrumbSchema } from "@/lib/seo-schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/course/Markdown";
import { LessonNavigation } from "@/components/course/LessonNavigation";
import { CourseBreadcrumb } from "@/components/course/CourseBreadcrumb";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { apiRequest } from "@/lib/queryClient";
import { APPLE_FONT } from "@/lib/course-ui";
import NotFound from "@/pages/not-found";

interface LessonResponse {
  id: number;
  moduleId: number;
  moduleSlug: string;
  moduleTitle: string;
  slug: string;
  title: string;
  orderInModule: number;
  estimatedMinutes: number;
  content: string;
  heroImageUrl: string | null;
  prevLesson: { slug: string; title: string } | null;
  nextLesson: { slug: string; title: string } | null;
  myCompletion: { completedAt: string; timeSpentSeconds: number } | null;
}

export default function LearnLessonPage() {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const [, params] = useRoute("/learn/lesson/:slug");
  const slug = params?.slug ?? "";
  const queryClient = useQueryClient();
  const [optimistic, setOptimistic] = useState<{ completedAt: string } | null>(null);

  const lessonQ = useQuery<LessonResponse>({
    queryKey: ["/api/course/lessons", slug],
    enabled: !!slug,
    staleTime: Infinity,
  });

  // Mutation: mark lesson complete. Optimistic — flip the UI immediately.
  const completeMutation = useMutation({
    mutationFn: async (lessonId: number) => {
      const res = await apiRequest("POST", `/api/course/lessons/${lessonId}/complete`, {
        timeSpentSeconds: 0,
      });
      return res.json();
    },
    onMutate: async () => {
      setOptimistic({ completedAt: new Date().toISOString() });
    },
    onError: () => {
      setOptimistic(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/course/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/course/lessons", slug] });
    },
  });

  const description = useMemo(() => {
    if (!lessonQ.data) return undefined;
    // First ~150 chars of content with markdown stripped — gives a
    // reasonable meta description for SEO without being too long.
    const stripped = lessonQ.data.content
      .replace(/[#*`>_~-]/g, "")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
    return stripped.length > 160 ? stripped.slice(0, 157) + "…" : stripped;
  }, [lessonQ.data]);

  if (lessonQ.isError) {
    return <NotFound />;
  }

  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  // myCompletion: API value | optimistic | null
  const completion = optimistic ?? lessonQ.data?.myCompletion ?? null;
  const isCompleted = !!completion;

  return (
    <Layout>
      {lessonQ.data && <ReadingProgressBar />}
      <SEO
        title={lessonQ.data ? `${lessonQ.data.title} — ${lessonQ.data.moduleTitle}` : "Plotzy Writing Course"}
        description={description}
      />
      {lessonQ.data && (
        <JsonLd
          data={buildBreadcrumbSchema([
            { name: "Course", path: "/course" },
            { name: lessonQ.data.moduleTitle, path: `/learn/module/${lessonQ.data.moduleSlug}` },
            { name: lessonQ.data.title, path: `/learn/lesson/${lessonQ.data.slug}` },
          ])}
        />
      )}

      <main
        className="course-apple container mx-auto max-w-3xl px-4 py-8 sm:py-10 space-y-6"
        style={{ fontFamily: APPLE_FONT }}
      >
        {lessonQ.data && (
          <CourseBreadcrumb
            items={[
              { label: t("courseHome"), href: "/" },
              { label: t("navCourse"), href: "/learn" },
              { label: lessonQ.data.moduleTitle, href: `/learn/module/${lessonQ.data.moduleSlug}` },
              { label: lessonQ.data.title },
            ]}
          />
        )}

        {lessonQ.isLoading && <LessonSkeleton />}

        {lessonQ.data && (
          <>
            {lessonQ.data.heroImageUrl && (
              <div className="relative -mt-2 overflow-hidden rounded-2xl border bg-muted shadow-sm">
                <div className="aspect-[16/9]">
                  <img
                    src={lessonQ.data.heroImageUrl}
                    alt={lessonQ.data.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            )}
            <header className="space-y-2">
              <div className="text-xs text-muted-foreground font-medium">
                {t("courseLessonNumber")} {lessonQ.data.orderInModule} · {lessonQ.data.estimatedMinutes} {t("courseMinLabel")}
              </div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                {lessonQ.data.title}
              </h1>
              {isCompleted && (
                <div className="inline-flex items-center gap-1.5 text-xs text-primary pt-1">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  {t("courseLessonCompleted")}
                </div>
              )}
            </header>

            {/* Lesson body. Every lesson's markdown opens with its own
                `# Title` heading which duplicated the page <h1> above.
                Strip that single leading heading so the title shows once. */}
            <article>
              <Markdown
                content={lessonQ.data.content.replace(/^﻿?\s*#{1,6}[^\n]*\r?\n+/, "")}
                storageBase={lessonQ.data.slug}
              />
            </article>

            {/* Mark complete CTA — auth-gated */}
            <section className="border-t pt-6 flex items-center justify-between gap-3 flex-wrap">
              {user ? (
                isCompleted ? (
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
                    {t("courseLessonCompletedSubtle")}
                  </div>
                ) : (
                  <Button
                    onClick={() => completeMutation.mutate(lessonQ.data!.id)}
                    disabled={completeMutation.isPending}
                    className="gap-2"
                  >
                    {completeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                    )}
                    {t("courseLessonMarkComplete")}
                  </Button>
                )
              ) : (
                <Card className="p-3 flex items-center gap-3 flex-wrap text-sm">
                  <span className="text-muted-foreground">
                    {t("courseLessonSignInPrompt")}
                  </span>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/?signin=1">
                      {t("courseLessonSignInCta")}
                      <ChevronIcon className="ms-1 h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </Button>
                </Card>
              )}

              {completeMutation.isError && (
                <span className="text-xs text-red-600">
                  {t("courseLessonCompleteError")}
                </span>
              )}
            </section>

            {/* Prev / Next */}
            <LessonNavigation prev={lessonQ.data.prevLesson} next={lessonQ.data.nextLesson} />
          </>
        )}
      </main>
    </Layout>
  );
}

// Thin page-top bar showing how far through the lesson the reader is,
// like a long-read article. Block-box alignment follows the document
// direction, so the fill grows from the correct side in RTL for free.
function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]" aria-hidden>
      <div className="h-full bg-primary" style={{ width: `${progress * 100}%` }} />
    </div>
  );
}

function LessonSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-3 w-32 bg-secondary rounded" />
      <div className="h-10 w-3/4 bg-secondary rounded" />
      <div className="space-y-2 pt-4">
        <div className="h-4 w-full bg-secondary rounded" />
        <div className="h-4 w-full bg-secondary rounded" />
        <div className="h-4 w-2/3 bg-secondary rounded" />
        <div className="h-4 w-full bg-secondary rounded" />
        <div className="h-4 w-5/6 bg-secondary rounded" />
      </div>
    </div>
  );
}
