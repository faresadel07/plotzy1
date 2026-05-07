import { CourseSidebarCard } from "@/components/course/CourseSidebarCard";
import { useLanguage } from "@/contexts/language-context";

type SidebarState = React.ComponentProps<typeof CourseSidebarCard>["state"];

interface CourseLandingFooterCtaProps {
  state: SidebarState;
}

/**
 * Footer CTA at the bottom of /course. Reuses the sidebar card so the
 * primary action stays consistent on the page (per DP4 — same CTA
 * surface as the sidebar, no second copy to maintain).
 */
export function CourseLandingFooterCta({ state }: CourseLandingFooterCtaProps) {
  const { t } = useLanguage();

  return (
    <section className="rounded-2xl border bg-secondary/30 p-6 sm:p-10 text-center space-y-6">
      <h2 className="text-2xl sm:text-3xl font-serif tracking-tight">
        {t("courseLandingFooterCtaHeading")}
      </h2>
      <div className="max-w-md mx-auto">
        <CourseSidebarCard state={state} />
      </div>
    </section>
  );
}
