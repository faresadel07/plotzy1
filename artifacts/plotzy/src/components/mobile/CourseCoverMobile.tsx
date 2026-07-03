// Phone-only course promo: instead of a text banner, the free course
// is presented as its own book cover ("The Basics of Writing 101"),
// floated on a soft glow with a clear call to action. Tapping anywhere
// opens the course. Sits below the testimonials on the mobile home.

import { useLocation } from "wouter";
import { ArrowRight, ArrowLeft } from "lucide-react";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export function CourseCoverMobile({ ar }: { ar: boolean }) {
  const [, navigate] = useLocation();
  const Arrow = ar ? ArrowLeft : ArrowRight;

  return (
    <section style={{ padding: "8px 16px 36px", fontFamily: SF }} dir={ar ? "rtl" : "ltr"}>
      <button
        onClick={() => navigate("/course")}
        style={{
          display: "block", width: "100%", background: "transparent",
          border: "none", padding: 0, cursor: "pointer", textAlign: "center",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 20 }}>
          {ar ? "دورة الكتابة المجّانيّة" : "Free Writing Course"}
        </div>

        {/* Book cover on a soft purple glow so it lifts off the black */}
        <div style={{ position: "relative", display: "inline-block" }}>
          <div
            aria-hidden
            style={{
              position: "absolute", inset: "-10% -12%",
              background: "radial-gradient(ellipse at center, rgba(124,92,196,0.5), transparent 70%)",
              filter: "blur(28px)", zIndex: 0,
            }}
          />
          <img
            src="/course-book-cover.jpg"
            alt={ar ? "أساسيّات الكتابة ١٠١" : "The Basics of Writing 101"}
            loading="lazy"
            style={{
              position: "relative", zIndex: 1,
              width: "66%", maxWidth: 250, height: "auto", display: "block", margin: "0 auto",
              borderRadius: 8,
              boxShadow: "0 26px 60px rgba(0,0,0,0.65)",
            }}
          />
        </div>

        <div
          style={{
            marginTop: 24,
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#fff", color: "#000", borderRadius: 999,
            padding: "13px 30px", fontSize: 14.5, fontWeight: 700,
            flexDirection: ar ? "row-reverse" : "row",
            boxShadow: "0 6px 24px rgba(0,0,0,0.4)",
          }}
        >
          {ar ? "ابدأ الدورة" : "Start the course"} <Arrow size={16} />
        </div>
      </button>
    </section>
  );
}
