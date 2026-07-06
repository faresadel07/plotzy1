// Phone testimonials: a staggered card stack (StaggerTestimonials) tuned
// for a thumb on a small screen, deliberately a DIFFERENT shape from the
// desktop wall (TestimonialsDesktop). RTL aware, both languages.

import { StaggerTestimonials } from "./StaggerTestimonials";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export function TestimonialsMobile({ ar }: { ar: boolean }) {
  return (
    <section id="testimonials" style={{ marginBottom: 30, fontFamily: SF, scrollMarginTop: 60 }} dir={ar ? "rtl" : "ltr"}>
      {/* Header */}
      <div style={{ padding: "0 16px", marginBottom: 6, textAlign: ar ? "right" : "left" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>
          {ar ? "قالوا عن بلوتزي" : "Loved by writers"}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>
          {ar ? "أشخاص حقيقيّون جرّبوه" : "Real people, real stories"}
        </div>
      </div>

      <StaggerTestimonials ar={ar} />
    </section>
  );
}
