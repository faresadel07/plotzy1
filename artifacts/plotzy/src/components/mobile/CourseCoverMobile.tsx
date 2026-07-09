// Phone-only course promo: a crumpled typewriter note that talks like
// a person (the Sudowrite letter moment), with a hand-drawn circle
// around the phrase that matters and a handwritten margin note, then
// the two course covers and the call to action. Tapping the covers or
// the button opens the course.

import { useLocation } from "wouter";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { HAND_EN, HAND_AR } from "./fonts";
import { PaperBall } from "./PaperBall";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

/* A phrase with a hand-drawn ellipse around it. */
function Circled({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ position: "relative", display: "inline-block", padding: "0 4px" }}>
      {children}
      <svg aria-hidden viewBox="0 0 120 44" preserveAspectRatio="none" style={{ position: "absolute", inset: "-9px -12px", width: "calc(100% + 24px)", height: "calc(100% + 18px)", pointerEvents: "none" }}>
        <ellipse cx="60" cy="22" rx="55" ry="17" fill="none" stroke="#5c5142" strokeWidth="2.2" strokeLinecap="round" transform="rotate(-2 60 22)" style={{ strokeDasharray: "260 40" }} />
      </svg>
    </span>
  );
}

/* The crumpled note: Faris's real crumpled-paper photo behind the ink,
   with a warm paper wash so it sits in the site's palette. */
function CourseNote({ ar }: { ar: boolean }) {
  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      style={{
        position: "relative",
        backgroundImage: "linear-gradient(rgba(246,240,226,0.4), rgba(246,240,226,0.4)), url(/images/crumpled-paper.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        border: "1px solid rgba(66,53,33,0.16)",
        borderRadius: 4,
        boxShadow: "0 16px 34px -14px rgba(41,33,21,0.35)",
        padding: "26px 22px 22px",
        transform: "rotate(-1.2deg)",
        textAlign: ar ? "right" : "left",
        marginBottom: 30,
      }}
    >
      <p style={{ fontFamily: ar ? "'Amiri', serif" : "'Courier New', monospace", fontSize: ar ? 15.5 : 14, lineHeight: ar ? 1.95 : 1.9, color: "#3a3020", margin: "0 0 16px" }}>
        {ar
          ? "بقدر أعلّمك تكتب كتابك الأول: من الفكرة، للحبكة، لمسودة كاملة ما بتنهار من نصّها."
          : "I can teach you to write your first book: from the idea, to the plot, to a full draft that does not collapse in the middle."}
      </p>
      <p style={{ fontFamily: ar ? "'Amiri', serif" : "'Courier New', monospace", fontSize: ar ? 15.5 : 14, lineHeight: ar ? 1.95 : 1.9, color: "#3a3020", margin: "0 0 16px" }}>
        {ar
          ? <>32 درساً. 6 وحدات. تمارين حقيقية. وشهادة بالآخر. والأهم: <Circled>مجاني بالكامل</Circled>.</>
          : <>32 lessons. 6 modules. Real exercises. A certificate at the end. And the part that matters: <Circled>completely free</Circled>.</>}
      </p>
      <p style={{ fontFamily: ar ? "'Amiri', serif" : "'Courier New', monospace", fontSize: ar ? 15 : 13.5, lineHeight: 1.9, color: "#b3402e", margin: 0 }}>
        {ar ? "هذا ليس عرضاً مؤقتاً. رح يضل مجاني." : "This is not a limited offer. It stays free."}
      </p>
      <div style={{ fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 15 : 19, color: "#8a8070", textAlign: ar ? "left" : "right", marginTop: 10, transform: "rotate(-1deg)" }}>
        {ar ? "(ليش؟ لأنه حدا لازم يعلّم)" : "(why? because someone has to teach)"}
      </div>
      {/* A discarded draft resting on the note's corner */}
      <PaperBall size={44} rot={20} style={{ position: "absolute", top: -20, insetInlineEnd: -10 }} />
    </div>
  );
}

export function CourseCoverMobile({ ar }: { ar: boolean }) {
  const [, navigate] = useLocation();
  const Arrow = ar ? ArrowLeft : ArrowRight;

  return (
    <section style={{ padding: "8px 16px 36px", fontFamily: SF }} dir={ar ? "rtl" : "ltr"}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7b7366", marginBottom: 18, textAlign: "center" }}>
        {ar ? "دورة الكتابة المجّانيّة" : "Free Writing Course"}
      </div>

      <CourseNote ar={ar} />

      <button
        onClick={() => navigate("/course")}
        style={{
          display: "block", width: "100%", background: "transparent",
          border: "none", padding: 0, cursor: "pointer", textAlign: "center",
        }}
      >

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
