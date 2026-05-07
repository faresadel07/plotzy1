import { useState, type ReactElement } from "react";
import { useLocation } from "wouter";
import { BookOpen, Clock, Award, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth-modal";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";

interface CourseSidebarCardProps {
  /** Auth + progress state — drives the CTA variant. */
  state:
    | { kind: "anonymous" }
    | { kind: "authed-no-progress" }
    | { kind: "authed-in-progress"; nextLessonSlug: string }
    | { kind: "authed-cert-issued"; certUuid: string };
}

/**
 * Sticky sidebar card on the /course landing page. The card carries
 * the page's primary conversion action — the CTA variant flips with
 * the user's state:
 *   - anonymous           → "Start learning free"  (opens AuthModal)
 *   - authed, no progress → "Start learning free"  (links /learn)
 *   - authed, in progress → "Continue learning"    (links to next lesson)
 *   - authed, cert issued → "View your certificate" (links /certificates/:uuid)
 *
 * Three feature lines below the CTA spell out the practical things —
 * lesson count, time commitment, certificate — so visitors can size up
 * the course in one glance.
 *
 * AuthModal opens directly (no /login route exists). After auth success
 * the modal closes and we navigate to /learn so the user lands on the
 * course dashboard, not back on the marketing page.
 */
export function CourseSidebarCard({ state }: CourseSidebarCardProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [authOpen, setAuthOpen] = useState(false);

  // The modal calls onClose after success too. Auto-navigate when
  // user becomes truthy while the modal is open.
  if (authOpen && user) {
    setAuthOpen(false);
    navigate("/learn");
  }

  let cta: ReactElement;
  if (state.kind === "anonymous") {
    cta = (
      <Button size="lg" className="w-full gap-2" onClick={() => setAuthOpen(true)}>
        {t("courseLandingStartLearningCta")}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    );
  } else if (state.kind === "authed-no-progress") {
    cta = (
      <Button size="lg" className="w-full gap-2" onClick={() => navigate("/learn")}>
        {t("courseLandingStartLearningCta")}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    );
  } else if (state.kind === "authed-in-progress") {
    cta = (
      <Button
        size="lg"
        className="w-full gap-2"
        onClick={() => navigate(`/learn/lesson/${state.nextLessonSlug}`)}
      >
        {t("courseLandingContinueLearningCta")}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    );
  } else {
    cta = (
      <Button
        size="lg"
        variant="outline"
        className="w-full gap-2"
        onClick={() => navigate(`/certificates/${state.certUuid}`)}
      >
        <Award className="h-4 w-4" aria-hidden />
        {t("courseLandingViewCertCta")}
      </Button>
    );
  }

  return (
    <>
      <Card className="overflow-hidden lg:sticky lg:top-24">
        {/* Thumbnail — same panoramic illustration as the hero, scaled
           down. Matches the brand surface so the sidebar feels visually
           tied to the hero rather than an unrelated card. */}
        <div
          className="relative w-full bg-secondary"
          style={{ aspectRatio: "2021 / 778" }}
        >
          <img
            src="/course-hero.png"
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        <div className="p-6 space-y-5">
        <div>
          <div className="font-serif text-xl">{t("courseLandingTitle")}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {t("courseLandingSidebarSubtitle")}
          </div>
        </div>

        {cta}

        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-2.5">
            <BookOpen className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
            <span>{t("courseLandingFeatureLessons")}</span>
          </li>
          <li className="flex items-start gap-2.5">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
            <span>{t("courseLandingFeatureHours")}</span>
          </li>
          <li className="flex items-start gap-2.5">
            <Award className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
            <span>{t("courseLandingFeatureCert")}</span>
          </li>
        </ul>
        </div>
      </Card>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
