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
  const { t, lang } = useLanguage();

  return (
    <header
      className="course-hero-frame relative isolate overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(135deg, #e9dcc0 0%, #d9c69d 100%)",
        // Match the source image's natural aspect so nothing is cropped
        // on iPad / laptop. On phones the panoramic 2.6:1 frame is too
        // thin to read the title comfortably, so the responsive CSS
        // below switches to a portrait-ish 4:3 frame and recenters the
        // illustration on its focal subject.
        aspectRatio: "2021 / 778",
        minHeight: "clamp(220px, 42vw, 360px)",
      }}
    >
      {/* Two illustrations: a panoramic one for iPad / laptop, and a
          dedicated PORTRAIT one for phones. The phone art has a tall
          book-of-imagination composition with clean dark sky at the
          top, so on phones we switch to a portrait frame, anchor the
          title to the TOP over that sky, and centre it: reads as a
          polished course poster instead of a cramped, cropped panorama. */}
      <style>{`
        /* Phone: portrait poster with the vertical illustration. */
        @media (max-width: 699px) {
          .course-hero-frame {
            aspect-ratio: 2 / 3 !important;
            min-height: 460px !important;
          }
          .course-hero-image-desktop,
          .course-hero-scrim-desktop { display: none !important; }
          .course-hero-content {
            align-items: flex-start !important;
            justify-content: center !important;
            padding-top: 34px !important;
            text-align: center !important;
          }
          .course-hero-textblock { margin-left: auto !important; margin-right: auto !important; }
        }
        /* iPad / laptop: keep the original panorama untouched. */
        @media (min-width: 700px) {
          .course-hero-image-mobile,
          .course-hero-scrim-mobile { display: none !important; }
        }
      `}</style>

      {/* Desktop / iPad panoramic illustration */}
      <img
        src="/course-cover-art.jpg"
        alt=""
        role="presentation"
        aria-hidden="true"
        loading="eager"
        decoding="async"
        className="course-hero-image-desktop absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "center 30%" }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      {/* Phone portrait illustration */}
      <img
        src="/course-cover-art.jpg"
        alt=""
        role="presentation"
        aria-hidden="true"
        loading="eager"
        decoding="async"
        className="course-hero-image-mobile absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "center" }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />

      {/* Desktop scrim — bottom-left, keeps the title readable while
         leaving the illustration's right-side focal point clear. */}
      <div
        aria-hidden="true"
        className="course-hero-scrim-desktop absolute inset-0"
        style={{
          background:
            "linear-gradient(110deg, rgba(238,226,198,0.85) 0%, rgba(238,226,198,0.6) 40%, rgba(238,226,198,0.08) 70%, rgba(238,226,198,0) 100%)",
        }}
      />
      {/* Phone scrim — a soft veil across the top sky so the centred
         title stays crisp without hiding the illustration below. */}
      <div
        aria-hidden="true"
        className="course-hero-scrim-mobile absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(238,226,198,0.82) 0%, rgba(238,226,198,0.55) 24%, rgba(238,226,198,0.2) 44%, rgba(238,226,198,0.04) 58%, rgba(238,226,198,0) 70%)",
        }}
      />

      <div className="course-hero-content relative z-10 h-full flex items-end px-6 sm:px-10 py-8 sm:py-10">
        <div className="course-hero-textblock max-w-2xl" style={{ color: "#3a2c14" }}>
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-tight font-bold"
            style={{ fontFamily: "'Lora', 'Amiri', Georgia, serif", textShadow: "0 1px 10px rgba(238,226,198,0.8)" }}
          >
            {t("courseLandingTitle")}
          </h1>
          <p
            className="mt-3 sm:mt-4 text-sm sm:text-base lg:text-lg max-w-xl font-semibold"
            style={{ color: "#54401f", textShadow: "0 1px 8px rgba(238,226,198,0.8)" }}
          >
            {t("courseLandingHeroSubtitle")}
          </p>
          <p
            className="mt-2 text-base sm:text-lg"
            style={{ fontFamily: "'Caveat', 'Aref Ruqaa', cursive", color: "#6b5426", transform: "rotate(-1deg)" }}
          >
            {lang === "ar" ? "(مجاني، ورح يضل مجاني)" : "(free, and it stays free)"}
          </p>
        </div>
      </div>
    </header>
  );
}
