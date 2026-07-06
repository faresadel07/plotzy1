import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ChevronLeft, Clock, BookOpen, FileQuestion, Award } from "lucide-react";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { JsonLd } from "@/components/JsonLd";
import { buildBreadcrumbSchema } from "@/lib/seo-schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CourseBreadcrumb } from "@/components/course/CourseBreadcrumb";
import { LessonCard } from "@/components/course/LessonCard";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { APPLE_FONT, arField, moduleImage } from "@/lib/course-ui";
import NotFound from "@/pages/not-found";

interface ModuleResponse {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  titleAr?: string | null;
  subtitleAr?: string | null;
  descriptionAr?: string | null;
  order: number;
  estimatedMinutes: number;
  lessonCount: number;
  lessons: Array<{
    id: number;
    slug: string;
    title: string;
    titleAr?: string | null;
    orderInModule: number;
    estimatedMinutes: number;
    heroImageUrl: string | null;
  }>;
}

interface ProgressResponse {
  modules: Array<{ moduleId: number; slug: string; completedLessons: number; totalLessons: number }>;
  quizzes: Array<{ quizId: number; moduleId: number | null; type: "module" | "final"; bestScore: number | null; passed: boolean; attemptCount: number }>;
}

export default function LearnModulePage() {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const [, params] = useRoute("/learn/module/:slug");
  const slug = params?.slug ?? "";

  const moduleQ = useQuery<ModuleResponse>({
    queryKey: ["/api/course/modules", slug],
    enabled: !!slug,
    staleTime: Infinity,
  });

  const progressQ = useQuery<ProgressResponse>({
    queryKey: ["/api/course/progress"],
    enabled: !!user,
    staleTime: 0,
  });

  if (moduleQ.isError) {
    // Error treated as 404 — the module either doesn't exist or the
    // catalog API failed; either way nothing useful to render.
    return <NotFound />;
  }

  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  // Per-lesson completion lookup. Comes from progress.modules[i].completedLessons
  // count, NOT from a per-lesson list — the dashboard endpoint doesn't
  // return individual lesson IDs. We approximate "first N are done" by
  // ordering since lessons are sequential. This matches the URL the
  // user would naturally take: lessons are designed to be read in
  // order, so the count maps deterministically to "lessons 1..N done."
  const myProgress = progressQ.data?.modules.find((m) => m.slug === slug);
  const completedCount = myProgress?.completedLessons ?? 0;
  const moduleQuiz = progressQ.data?.quizzes.find(
    (q) => q.type === "module" && q.moduleId === moduleQ.data?.id,
  );

  return (
    <Layout>
      <SEO
        title={moduleQ.data ? `${arField(isRTL, moduleQ.data.title, moduleQ.data.titleAr)} — Plotzy Writing Course` : "Plotzy Writing Course"}
        description={
          moduleQ.data
            ? arField(isRTL, moduleQ.data.subtitle ?? moduleQ.data.description ?? "", moduleQ.data.subtitleAr ?? moduleQ.data.descriptionAr) || undefined
            : undefined
        }
      />
      {moduleQ.data && (
        <JsonLd
          data={buildBreadcrumbSchema([
            { name: "Course", path: "/learn" },
            { name: moduleQ.data.title, path: `/learn/module/${moduleQ.data.slug}` },
          ])}
        />
      )}

      <main
        className="course-apple container mx-auto max-w-4xl px-4 py-8 sm:py-10 space-y-8"
        style={{ fontFamily: APPLE_FONT }}
      >
        <CourseBreadcrumb
          items={[
            { label: t("courseHome"), href: "/" },
            { label: t("navCourse"), href: "/learn" },
            { label: moduleQ.data ? arField(isRTL, moduleQ.data.title, moduleQ.data.titleAr) : "…" },
          ]}
        />

        {moduleQ.isLoading && <ModuleHeaderSkeleton />}

        {moduleQ.data && (
          <>
            <div className="relative overflow-hidden rounded-2xl border bg-muted shadow-sm">
              <div className="aspect-[21/9]">
                <img
                  src={moduleImage(moduleQ.data.order)}
                  alt={arField(isRTL, moduleQ.data.title, moduleQ.data.titleAr)}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
              <span className="absolute left-5 bottom-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/85">
                {t("courseModuleNumber")} {moduleQ.data.order}
              </span>
            </div>
            <header className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                {arField(isRTL, moduleQ.data.title, moduleQ.data.titleAr)}
              </h1>
              {moduleQ.data.subtitle && (
                <p className="text-lg text-muted-foreground">{arField(isRTL, moduleQ.data.subtitle, moduleQ.data.subtitleAr)}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2">
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden />
                  {moduleQ.data.lessonCount} {t("courseLessonsLabel")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  ~{moduleQ.data.estimatedMinutes} {t("courseMinLabel")}
                </span>
              </div>
              {moduleQ.data.description && (
                <p className="text-sm text-muted-foreground max-w-2xl pt-2">
                  {arField(isRTL, moduleQ.data.description, moduleQ.data.descriptionAr)}
                </p>
              )}
            </header>

            {user && moduleQ.data.lessonCount > 0 && completedCount >= moduleQ.data.lessonCount && (
              <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-5 flex items-center gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                  <Award className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-sm">
                    {isRTL ? "أنهيت هذه الوحدة كاملة" : "You finished this whole module"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isRTL
                      ? "خطوة حقيقية نحو كتابك. جرب اختبار الوحدة لتثبت ما تعلمته."
                      : "A real step toward your book. Take the module quiz to lock it in."}
                  </p>
                </div>
              </div>
            )}

            <section className="space-y-2">
              {moduleQ.data.lessons.map((lesson, idx) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  completed={user ? idx < completedCount : false}
                />
              ))}
            </section>

            {/* Module quiz CTA */}
            <section>
              <Card className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary inline-flex items-center justify-center shrink-0">
                  <FileQuestion className="h-5 w-5" aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{t("courseModuleQuizCta")}</div>
                  <div className="text-xs text-muted-foreground">
                    {moduleQuiz?.passed
                      ? t("courseModuleQuizPassed")
                      : t("courseModuleQuizPrompt")}
                  </div>
                </div>
                {moduleQuiz && (
                  <Button asChild variant="outline" className="shrink-0">
                    <Link href={`/learn/quiz/${moduleQuiz.quizId}`}>
                      {moduleQuiz.passed ? t("courseQuizRetake") : t("courseQuizStart")}
                      <ChevronIcon className="ms-1 h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                )}
              </Card>
            </section>
          </>
        )}
      </main>
    </Layout>
  );
}

function ModuleHeaderSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-3 w-20 bg-secondary rounded" />
      <div className="h-10 w-2/3 bg-secondary rounded" />
      <div className="h-5 w-1/2 bg-secondary rounded" />
      <div className="space-y-2 pt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="h-4 w-3/4 bg-secondary rounded" />
          </Card>
        ))}
      </div>
    </div>
  );
}
