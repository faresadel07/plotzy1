import { useLanguage } from "@/contexts/language-context";

/**
 * Hero block for the public /course landing page. Tries the
 * course-hero.jpg overlay first; if the image 404s, the navy gradient
 * underneath shows through (browsers leave alt text + the gradient bg
 * visible). Title + subtitle sit on top with a translucent dark scrim
 * for legibility regardless of which background renders.
 *
 * Design lineage: Reedsy Learning's course landing — large title,
 * one-line subtitle, no CTA in the hero (the sidebar card carries the
 * conversion action).
 */
export function CourseLandingHero() {
  const { t } = useLanguage();

  return (
    <header
      className="relative isolate overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(135deg, #1A294F 0%, #0F1A33 100%)",
        minHeight: "clamp(220px, 30vw, 360px)",
      }}
    >
      <img
        src="/course-hero.jpg"
        alt=""
        aria-hidden="true"
        loading="eager"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover opacity-60"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(15,26,51,0.55) 0%, rgba(15,26,51,0.85) 100%)",
        }}
      />
      <div className="relative z-10 px-6 sm:px-10 py-10 sm:py-14 max-w-3xl text-white">
        <h1 className="font-serif text-3xl sm:text-5xl tracking-tight leading-tight">
          {t("courseLandingTitle")}
        </h1>
        <p className="mt-4 text-base sm:text-lg text-white/85 max-w-2xl">
          {t("courseLandingHeroSubtitle")}
        </p>
      </div>
    </header>
  );
}
