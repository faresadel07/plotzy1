// Phone testimonials: a horizontally scrolling strip of quote cards,
// in the same Apple-TV shelf language as the rest of the mobile home.
// Each card leads with the quote and closes with a round avatar, the
// name, and the person's role. RTL aware.
//
// This is deliberately a DIFFERENT shape from the desktop wall
// (TestimonialsDesktop): one card at a time, swipeable, tuned for a
// thumb on a small screen.

import { TESTIMONIALS } from "./testimonials-data";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export function TestimonialsMobile({ ar }: { ar: boolean }) {
  return (
    <section id="testimonials" style={{ marginBottom: 30, fontFamily: SF, scrollMarginTop: 60 }} dir={ar ? "rtl" : "ltr"}>
      {/* Header */}
      <div style={{ padding: "0 16px", marginBottom: 14, textAlign: ar ? "right" : "left" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>
          {ar ? "قالوا عن بلوتزي" : "Loved by writers"}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>
          {ar ? "أشخاص حقيقيّون جرّبوه" : "Real people, real stories"}
        </div>
      </div>

      {/* Scroll strip */}
      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          overflowY: "hidden",
          padding: "0 16px 6px",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          scrollSnapType: "x mandatory",
        }}
      >
        {TESTIMONIALS.map((t) => (
          <article
            key={t.id}
            style={{
              flex: "0 0 auto",
              width: 280,
              scrollSnapAlign: "start",
              background: "linear-gradient(160deg, #141418 0%, #0c0c0f 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: "20px 18px",
              display: "flex",
              flexDirection: "column",
              minHeight: 230,
            }}
          >
            {/* Person first — photo above the words */}
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 16, flexDirection: ar ? "row-reverse" : "row" }}>
              <div
                style={{
                  width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                  padding: 2, background: `linear-gradient(135deg, ${t.accent}, rgba(255,255,255,0.15))`,
                }}
              >
                <img
                  src={t.photo}
                  alt={ar ? t.nameAr : t.name}
                  loading="lazy"
                  style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", objectPosition: t.pos, display: "block", border: "2px solid #0c0c0f" }}
                />
              </div>
              <div style={{ minWidth: 0, textAlign: ar ? "right" : "left" }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {ar ? t.nameAr : t.name}
                </div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {ar ? t.roleAr : t.role}
                </div>
              </div>
            </div>

            {/* Quote */}
            <p style={{ fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.9)", margin: 0 }}>
              {ar ? t.quoteAr : t.quote}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
