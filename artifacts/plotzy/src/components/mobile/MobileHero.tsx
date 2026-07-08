// The mobile home hero, warm-literary edition.
//
// Instead of a full-viewport pinned collage (busy, nothing readable
// above the fold), the hero is a tidy paper composition: eyebrow chip,
// a big ink headline, one supporting line, two clear actions, then the
// rotating cover collage CONTAINED in a rounded card with the slide
// caption inside it, and a quiet stats strip. Swipe still switches
// slides; dots live inside the card.

import { useEffect, useRef, useState } from "react";
import { HERO_SLIDES } from "./mobile-content";
import { PAPER, INK, INK_SOFT, MUTED, ESPRESSO, PAPER_ON_DARK, BORDER_INK } from "./palette";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export function MobileHero({ ar, onStartWriting, onOpenCourse }: { ar: boolean; onStartWriting: () => void; onOpenCourse: () => void }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const slide = HERO_SLIDES[index];

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(id);
  }, [index]);

  const go = (dir: number) => setIndex((i) => (i + dir + HERO_SLIDES.length) % HERO_SLIDES.length);

  return (
    <section dir={ar ? "rtl" : "ltr"} style={{ fontFamily: SF, padding: "26px 18px 4px", textAlign: "center" }}>
      {/* Eyebrow chip */}
      <div
        style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          background: "#fbf8ef", border: `1px solid ${BORDER_INK}`,
          borderRadius: 999, padding: "6px 14px", marginBottom: 18,
          fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", color: INK_SOFT,
          boxShadow: "0 1px 2px rgba(66,53,33,0.06)",
        }}
      >
        <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: "#26ad5f" }} />
        {ar ? "منصة الكتّاب المجانية" : "The free writer's platform"}
      </div>

      {/* Headline + support */}
      <h1 style={{ fontSize: 33, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.12, color: INK, margin: "0 0 10px" }}>
        {ar ? "اكتب كتابك الأول" : "Write your first book"}
      </h1>
      <p style={{ fontSize: 14.5, lineHeight: 1.55, color: MUTED, maxWidth: 320, margin: "0 auto 20px" }}>
        {ar
          ? "استوديو كتابة كامل مع مساعد ذكاء اصطناعي، مصمم أغلفة، ومكتبات كاملة. كل شيء في مكان واحد."
          : "A full writing studio with an AI partner, a cover designer, and complete libraries. All in one place."}
      </p>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 22 }}>
        <button
          onClick={onStartWriting}
          style={{
            background: ESPRESSO, color: PAPER_ON_DARK, border: "none", borderRadius: 999,
            padding: "13px 26px", fontSize: 14.5, fontWeight: 700, fontFamily: SF, cursor: "pointer",
            boxShadow: "0 10px 24px -8px rgba(41,33,21,0.5)",
          }}
        >
          {ar ? "ابدأ الكتابة" : "Start writing"}
        </button>
        <button
          onClick={onOpenCourse}
          style={{
            background: "#fffdf7", color: INK_SOFT, border: `1px solid rgba(66,53,33,0.22)`, borderRadius: 999,
            padding: "13px 22px", fontSize: 14.5, fontWeight: 600, fontFamily: SF, cursor: "pointer",
            boxShadow: "0 1px 2px rgba(66,53,33,0.06)",
          }}
        >
          {ar ? "الكورس المجاني" : "Free course"}
        </button>
      </div>

      {/* Contained collage card (swipeable, crossfading) */}
      <div
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          touchStartX.current = null;
        }}
        style={{
          position: "relative", height: 330, borderRadius: 24, overflow: "hidden",
          border: "1px solid rgba(66,53,33,0.2)",
          boxShadow: "0 24px 50px -20px rgba(41,33,21,0.55)",
        }}
      >
        {HERO_SLIDES.map((s, i) => (
          <div
            key={i}
            aria-hidden={i !== index}
            style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${s.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center 30%",
              opacity: i === index ? 1 : 0,
              transition: "opacity 700ms ease",
            }}
          />
        ))}
        {/* Legibility veil for the caption inside the card */}
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(41,33,21,0.05) 40%, rgba(41,33,21,0.72) 100%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "0 18px 16px", textAlign: ar ? "right" : "left" }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(244,239,226,0.75)", marginBottom: 5 }}>
            {ar ? slide.eyebrowAr : slide.eyebrow}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.25, color: "#f7f2e4", textShadow: "0 1px 10px rgba(41,33,21,0.5)" }}>
            {ar ? slide.titleAr : slide.title}
          </div>
          {/* Dots */}
          <div style={{ display: "flex", gap: 6, marginTop: 12, justifyContent: ar ? "flex-end" : "flex-start" }}>
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Slide ${i + 1}`}
                style={{
                  width: i === index ? 20 : 6, height: 6, borderRadius: 999,
                  border: "none", padding: 0,
                  background: i === index ? "#f7f2e4" : "rgba(244,239,226,0.45)",
                  transition: "all 240ms ease", cursor: "pointer",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Quiet stats strip */}
      <div style={{ display: "flex", justifyContent: "center", gap: 0, marginTop: 18, marginBottom: 6 }}>
        {(ar
          ? [["19,000+", "كتاب صوتي"], ["32", "درس كتابة مجاني"], ["2", "لغة كتابة"]]
          : [["19,000+", "audiobooks"], ["32", "free lessons"], ["2", "writing languages"]]
        ).map(([n, label], i) => (
          <div key={label} style={{ padding: "0 16px", borderInlineStart: i ? `1px solid ${BORDER_INK}` : "none", textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: INK, letterSpacing: "-0.02em" }}>{n}</div>
            <div style={{ fontSize: 10.5, color: MUTED, marginTop: 1 }}>{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
