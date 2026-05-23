import { useLanguage } from "@/contexts/language-context";

/**
 * Hero block for the public /course landing page. The hero band's
 * aspect ratio matches the source image's (2021×778, ~2.6:1) so the
 * full panoramic illustration — writer, book, ship, astronaut, rocket,
 * dragon, castle — renders without cropping the top or bottom edges.
 *
 * If the image fails to load, the navy gradient underneath keeps the
 * hero looking intentional rather than broken (and the title remains
 * readable against either background).
 *
 * Design lineage: Reedsy Learning's course landing — large title,
 * one-line subtitle, no CTA in the hero (the sidebar card carries the
 * conversion action). Title overlays at the bottom-left so the
 * illustration's focal subjects (right side: writer + book) stay
 * unobstructed.
 */
export function CourseLandingHero() {
  const { t } = useLanguage();

  return (
    <header
      className="course-hero-frame relative isolate overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(135deg, #1A294F 0%, #0F1A33 100%)",
        // Match the source image's natural aspect so nothing is cropped
        // on iPad / laptop. On phones the panoramic 2.6:1 frame is too
        // thin to read the title comfortably, so the responsive CSS
        // below switches to a portrait-ish 4:3 frame and recenters the
        // illustration on its focal subject.
        aspectRatio: "2021 / 778",
        minHeight: "clamp(220px, 42vw, 360px)",
      }}
    >
      {/* The hero illustration is shown on every device. On phones we
          switch the aspect ratio to 4:3 (taller, more readable) and
          shift object-position so the writer / book on the right of
          the original panorama stays visible after the crop. */}
      <style>{`
        @media (max-width: 699px) {
          .course-hero-frame {
            aspect-ratio: 4 / 3 !important;
            min-height: 280px !important;
          }
          .course-hero-image {
            object-position: 70% center !important;
          }
        }
      `}</style>
      <img
        src="/course-hero.png"
        alt=""
        role="presentation"
        aria-hidden="true"
        loading="eager"
        decoding="async"
        className="course-hero-image absolute inset-0 h-full w-full object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      {/* Subtle bottom-left scrim — keeps the title readable while
         leaving the illustration's right-side focal point clear. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(110deg, rgba(15,26,51,0.78) 0%, rgba(15,26,51,0.55) 40%, rgba(15,26,51,0.10) 70%, rgba(15,26,51,0) 100%)",
        }}
      />
      <div className="relative z-10 h-full flex items-end px-6 sm:px-10 py-8 sm:py-10">
        <div className="max-w-2xl text-white">
          <h1
            className="font-serif text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-tight"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.45)" }}
          >
            {t("courseLandingTitle")}
          </h1>
          <p
            className="mt-3 sm:mt-4 text-sm sm:text-base lg:text-lg text-white/90 max-w-xl"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.5)" }}
          >
            {t("courseLandingHeroSubtitle")}
          </p>
        </div>
      </div>
    </header>
  );
}
