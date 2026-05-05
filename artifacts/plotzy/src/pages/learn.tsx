import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, GraduationCap, Award } from "lucide-react";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { JsonLd } from "@/components/JsonLd";
import { buildCourseSchema, buildBreadcrumbSchema } from "@/lib/seo-schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModuleCard } from "@/components/course/ModuleCard";
import { CourseProgressBar } from "@/components/course/ProgressBar";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";

interface ModuleSummary {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  order: number;
  estimatedMinutes: number;
  lessonCount: number;
  lessons: Array<{ id: number; slug: string; title: string; orderInModule: number; estimatedMinutes: number }>;
}

interface CatalogResponse {
  modules: ModuleSummary[];
  totalLessons: number;
  totalEstimatedMinutes: number;
}

interface ProgressModuleStat {
  moduleId: number;
  slug: string;
  completedLessons: number;
  totalLessons: number;
  completedAt: string | null;
}

interface ProgressResponse {
  completedLessons: number;
  totalLessons: number;
  percentage: number;
  modules: ProgressModuleStat[];
  certificate: { issued: boolean; uuid: string | null; issuedAt: string | null };
}

export default function LearnPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAuthed = !!user;

  const catalog = useQuery<CatalogResponse>({
    queryKey: ["/api/course/modules"],
    staleTime: Infinity,
  });

  const progress = useQuery<ProgressResponse>({
    queryKey: ["/api/course/progress"],
    enabled: isAuthed,
    staleTime: 0,
  });

  const completedByModuleId = new Map<number, number>();
  if (progress.data) {
    for (const m of progress.data.modules) completedByModuleId.set(m.moduleId, m.completedLessons);
  }

  return (
    <Layout>
      <SEO
        title="How to Write Your First Book — Free 6-Module Course"
        description="A free 6-module writing course: foundations, story architecture, characters, world-building, the writing process, and getting published. 27 lessons, quizzes, a final project, and a verified certificate of completion."
      />
      <JsonLd data={buildCourseSchema()} />
      <JsonLd data={buildBreadcrumbSchema([{ name: "Course", path: "/learn" }])} />

      <main className="container mx-auto max-w-6xl px-4 py-10 sm:py-14 space-y-10">
        {/* Hero */}
        <section className="space-y-4 text-center sm:text-start">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-secondary text-xs text-muted-foreground">
            <GraduationCap className="h-3.5 w-3.5" aria-hidden />
            {t("courseLandingBadge")}
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif tracking-tight">
            {t("courseLandingTitle")}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
            {t("courseLandingSubtitle")}
          </p>

          {isAuthed && progress.data && (
            <div className="pt-4 max-w-xl">
              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{t("courseLandingYourProgress")}</div>
                  {progress.data.certificate.issued && (
                    <span className="inline-flex items-center gap-1 text-xs text-primary">
                      <Award className="h-3.5 w-3.5" aria-hidden />
                      {t("courseLandingCertEarned")}
                    </span>
                  )}
                </div>
                <CourseProgressBar
                  value={progress.data.percentage}
                  caption={`${progress.data.completedLessons} / ${progress.data.totalLessons} ${t("courseLessonsLabel")}`}
                />
                {progress.data.completedLessons > 0 && progress.data.completedLessons < progress.data.totalLessons && (
                  <ContinueLearningLink catalog={catalog.data} progress={progress.data} />
                )}
              </Card>
            </div>
          )}

          {!isAuthed && (
            <div className="pt-4 flex flex-wrap items-center gap-3 justify-center sm:justify-start">
              <Button asChild>
                <Link href="/learn/module/foundation">
                  {t("courseLandingStartFree")}
                  <ArrowRight className="ms-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <span className="text-xs text-muted-foreground">
                {t("courseLandingNoSignup")}
              </span>
            </div>
          )}
        </section>

        {/* Module grid */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">{t("courseLandingModulesHeader")}</h2>

          {catalog.isLoading && <ModuleGridSkeleton />}

          {catalog.error && (
            <Card className="p-4 text-sm text-red-600">
              {t("courseLandingLoadError")}
            </Card>
          )}

          {catalog.data && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalog.data.modules.map((m) => (
                <ModuleCard
                  key={m.id}
                  module={m}
                  completedLessons={isAuthed ? completedByModuleId.get(m.id) ?? 0 : undefined}
                />
              ))}
            </div>
          )}
        </section>

        {/* Anonymous footer CTA */}
        {!isAuthed && (
          <section className="rounded-xl border bg-secondary/30 p-6 text-center space-y-3">
            <h3 className="text-lg font-semibold">{t("courseLandingCtaHeader")}</h3>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              {t("courseLandingCtaBody")}
            </p>
          </section>
        )}
      </main>
    </Layout>
  );
}

/**
 * Cross-references the catalog and the user's per-module progress to
 * find the first lesson not yet completed and renders a "continue"
 * link to it. Falls back to the first lesson of the first module if
 * the data hasn't loaded yet.
 */
function ContinueLearningLink({
  catalog,
  progress,
}: {
  catalog: CatalogResponse | undefined;
  progress: ProgressResponse;
}) {
  const { t } = useLanguage();
  if (!catalog) return null;

  const completedByModuleId = new Map<number, number>(
    progress.modules.map((m) => [m.moduleId, m.completedLessons]),
  );

  // Find the first module with incomplete lessons.
  for (const m of catalog.modules) {
    const done = completedByModuleId.get(m.id) ?? 0;
    if (done < m.lessonCount) {
      const nextLesson = m.lessons[done] ?? m.lessons[0];
      if (nextLesson) {
        return (
          <Button asChild variant="outline" size="sm" className="self-start">
            <Link href={`/learn/lesson/${nextLesson.slug}`}>
              {t("courseLandingContinue")}: {nextLesson.title}
              <ArrowRight className="ms-2 h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        );
      }
    }
  }
  return null;
}

function ModuleGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-6 space-y-3 animate-pulse">
          <div className="h-3 w-16 bg-secondary rounded" />
          <div className="h-5 w-3/4 bg-secondary rounded" />
          <div className="h-3 w-full bg-secondary rounded" />
          <div className="h-3 w-1/2 bg-secondary rounded" />
        </Card>
      ))}
    </div>
  );
}
