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
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7b7366", marginBottom: 20 }}>
          {ar ? "دورة الكتابة المجّانيّة" : "Free Writing Course"}
        </div>

        {/* Two course covers side by side on a soft warm glow so they
            lift off the paper. Order is fixed (not RTL-mirrored): the
            newer "Learning Writing 101" sits to the right of the
            original "Basics of Writing 101". */}
        <div style={{ position: "relative" }}>
          <div
            aria-hidden
            style={{
              position: "absolute", inset: "-8% -6%",
              background: "radial-gradient(ellipse at center, rgba(124,92,196,0.32), transparent 70%)",
              filter: "blur(30px)", zIndex: 0,
            }}
          />
          <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 16 }}>
            <img
              src="/course-book-cover.jpg"
              alt={ar ? "أساسيّات الكتابة ١٠١" : "The Basics of Writing 101"}
              loading="lazy"
              style={{ width: "46%", maxWidth: 185, height: "auto", display: "block", borderRadius: 7, boxShadow: "0 22px 50px -10px rgba(41,33,21,0.5)" }}
            />
            <img
              src="/course-book-cover-2.jpg"
              alt={ar ? "تعلّم الكتابة ١٠١" : "Learning Writing 101"}
              loading="lazy"
              style={{ width: "46%", maxWidth: 185, height: "auto", display: "block", borderRadius: 7, boxShadow: "0 22px 50px -10px rgba(41,33,21,0.5)" }}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: 24,
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#292115", color: "#f7f2e4", borderRadius: 999,
            padding: "13px 30px", fontSize: 14.5, fontWeight: 700,
            flexDirection: ar ? "row-reverse" : "row",
            boxShadow: "0 10px 26px -8px rgba(41,33,21,0.5)",
          }}
        >
          {ar ? "ابدأ الدورة" : "Start the course"} <Arrow size={16} />
        </div>
      </button>
    </section>
  );
}
