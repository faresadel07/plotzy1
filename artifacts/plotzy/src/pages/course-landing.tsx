import { useQuery } from "@tanstack/react-query";
import { courseQueryOpts } from "@/lib/queryClient";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { JsonLd } from "@/components/JsonLd";
import { buildCourseSchema, buildBreadcrumbSchema } from "@/lib/seo-schema";
import { CourseLandingHero } from "@/components/course/CourseLandingHero";
import { CourseSidebarCard } from "@/components/course/CourseSidebarCard";
import { CourseLearningPoints } from "@/components/course/CourseLearningPoints";
import { CourseModulesPreview } from "@/components/course/CourseModulesPreview";
import { CourseLandingFooterCta } from "@/components/course/CourseLandingFooterCta";
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

interface ProgressResponse {
  completedLessons: number;
  totalLessons: number;
  percentage: number;
  modules: Array<{ moduleId: number; slug: string; completedLessons: number; totalLessons: number; completedAt: string | null }>;
  certificate: { issued: boolean; uuid: string | null; issuedAt: string | null };
}

type SidebarState = React.ComponentProps<typeof CourseSidebarCard>["state"];

export default function CourseLandingPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const isAuthed = !!user;

  // Catalog is public — visible to anonymous visitors so the curriculum
  // preview renders without auth. Translated when lang !== "en".
  const catalog = useQuery<CatalogResponse>({
    ...courseQueryOpts(["/api/course/modules"], lang),
    staleTime: Infinity,
  });

  // Progress is auth-gated; the query is disabled for anonymous users
  // (no 401 noise in the network panel).
  const progress = useQuery<ProgressResponse>({
    queryKey: ["/api/course/progress"],
    enabled: isAuthed,
    staleTime: 0,
  });

  const sidebarState: SidebarState = (() => {
    if (!isAuthed) return { kind: "anonymous" };
    if (!progress.data) return { kind: "authed-no-progress" };
    if (progress.data.certificate.issued && progress.data.certificate.uuid) {
      return { kind: "authed-cert-issued", certUuid: progress.data.certificate.uuid };
    }
    if (progress.data.completedLessons === 0) return { kind: "authed-no-progress" };
    // Find first incomplete lesson — same logic as ContinueLearningLink
    // on /learn — but only if catalog has loaded.
    if (catalog.data) {
      const completedByModule = new Map(
        progress.data.modules.map((m) => [m.moduleId, m.completedLessons]),
      );
      for (const m of catalog.data.modules) {
        const done = completedByModule.get(m.id) ?? 0;
        if (done < m.lessonCount) {
          const next = m.lessons[done] ?? m.lessons[0];
          if (next) return { kind: "authed-in-progress", nextLessonSlug: next.slug };
        }
      }
    }
    return { kind: "authed-no-progress" };
  })();

  return (
    <Layout>
      <SEO
        title={t("courseLandingPageTitle")}
        description={t("courseLandingPageDescription")}
      />
      <JsonLd data={buildCourseSchema()} />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: t("courseLandingBreadcrumbAllCourses"), path: "/course" },
          { name: t("courseLandingBreadcrumbWriting"), path: "/course" },
        ])}
      />

      <main className="container mx-auto max-w-6xl px-4 py-8 sm:py-12 space-y-12">
        <CourseLandingHero />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          <div className="lg:col-span-2 space-y-10">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">
                {t("courseLandingOverviewHeading")}
              </h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                {t("courseLandingOverviewBody")}
              </p>
            </section>

            <CourseLearningPoints />

            <CourseModulesPreview
              modules={catalog.data?.modules}
              isLoading={catalog.isLoading}
            />
          </div>

          <aside className="lg:col-span-1">
            <CourseSidebarCard state={sidebarState} />
          </aside>
        </div>

        <CourseLandingFooterCta state={sidebarState} />
      </main>
    </Layout>
  );
}
