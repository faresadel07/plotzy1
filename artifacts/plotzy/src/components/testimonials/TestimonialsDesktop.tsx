// Desktop / iPad testimonials: a staggered masonry WALL of quote
// cards. Deliberately a different shape from the phone carousel
// (TestimonialsMobile): here the whole set is visible at once, packed
// into columns so varying quote lengths interlock like a Pinterest
// board. Reads as a room full of writers rather than a single card you
// swipe through.

import { useLanguage } from "@/contexts/language-context";
import { TESTIMONIALS } from "./testimonials-data";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export function TestimonialsDesktop() {
  const { lang } = useLanguage();
  const ar = lang === "ar";

  return (
    <section
      id="testimonials"
      dir={ar ? "rtl" : "ltr"}
      style={{ background: "#080808", padding: "88px 24px 96px", fontFamily: SF, overflow: "hidden", scrollMarginTop: 80 }}
    >
      <div style={{ maxWidth: 1140, margin: "0 auto" }}>
        {/* Heading */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>
            {ar ? "قالوا عن بلوتزي" : "Loved by writers everywhere"}
          </p>
          <h2 style={{ fontSize: "clamp(1.9rem, 3.4vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.035em", color: "#fff", lineHeight: 1.1, margin: "0 auto 18px", maxWidth: 760 }}>
            {ar ? "أشخاص حقيقيّون كتبوا كتبهم على بلوتزي" : "Real people who wrote their books on Plotzy"}
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, maxWidth: 560, margin: "0 auto" }}>
            {ar
              ? "من طالب يكتب أول فصل، لجدّة توثّق قصّة عائلتها. هدول ناس جرّبوا بلوتزي فعلاً."
              : "From a student drafting a first chapter to a grandmother saving her family story. These are real testers, in their own words."}
          </p>
        </div>

        {/* Masonry wall */}
        <div className="plotzy-testimonial-wall">
          {TESTIMONIALS.map((t) => (
            <article
              key={t.id}
              className="plotzy-testimonial-card"
              style={{
                breakInside: "avoid",
                marginBottom: 20,
                background: "linear-gradient(165deg, #151519 0%, #0d0d10 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 20,
                padding: "26px 24px",
                position: "relative",
              }}
            >
              {/* Person first — photo above the words */}
              <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 18, flexDirection: ar ? "row-reverse" : "row" }}>
                <div
                  style={{
                    width: 50, height: 50, borderRadius: "50%", flexShrink: 0,
                    padding: 2, background: `linear-gradient(135deg, ${t.accent}, rgba(255,255,255,0.14))`,
                  }}
                >
                  <img
                    src={t.photo}
                    alt={ar ? t.nameAr : t.name}
                    loading="lazy"
                    style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", objectPosition: t.pos, display: "block", border: "2px solid #0d0d10" }}
                  />
                </div>
                <div style={{ minWidth: 0, textAlign: ar ? "right" : "left" }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: "#fff" }}>{ar ? t.nameAr : t.name}</div>
                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", marginTop: 1 }}>{ar ? t.roleAr : t.role}</div>
                </div>
              </div>

              <p style={{ fontSize: 15.5, lineHeight: 1.68, color: "rgba(255,255,255,0.9)", margin: 0 }}>
                {ar ? t.quoteAr : t.quote}
              </p>
            </article>
          ))}
        </div>
      </div>

      <style>{`
        .plotzy-testimonial-wall {
          column-count: 3;
          column-gap: 20px;
        }
        .plotzy-testimonial-card {
          transition: transform 0.25s ease, border-color 0.25s ease;
        }
        .plotzy-testimonial-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255,255,255,0.18);
        }
        @media (max-width: 1000px) {
          .plotzy-testimonial-wall { column-count: 2; }
        }
        @media (max-width: 640px) {
          .plotzy-testimonial-wall { column-count: 1; }
        }
      `}</style>
    </section>
  );
}
