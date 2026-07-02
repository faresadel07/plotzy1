// The Apple-TV-style hero for the mobile home.
//
// A full-bleed collage of blurred book covers behind a headline, a
// subtitle, and a white pill CTA — with page dots underneath. The
// slide auto-advances and can be swiped. Tapping the CTA navigates.
//
// The "transform on scroll" effect the writer asked for is handled by
// the parent (MobileHome) fading/scaling this block as the page
// scrolls; here we just render one beautiful slide at a time.

import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { HERO_SLIDES } from "./mobile-content";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export function MobileHero({ ar }: { ar: boolean }) {
  const [, navigate] = useLocation();
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const slide = HERO_SLIDES[index];

  // Auto-advance every 6s; pause is implicit (resets on manual swipe).
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(id);
  }, [index]);

  const go = (dir: number) => {
    setIndex((i) => (i + dir + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  return (
    <section
      dir={ar ? "rtl" : "ltr"}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchStartX.current = null;
      }}
      style={{
        position: "relative",
        fontFamily: SF,
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)",
        overflow: "hidden",
      }}
    >
      {/* Collage backdrop — a tilted grid of covers, blurred + darkened */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -40, left: -40, right: -40, height: 420,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          transform: "rotate(-8deg) scale(1.25)",
          filter: "blur(2px) brightness(0.5)",
          opacity: 0.9,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        {slide.collage.concat(slide.collage).slice(0, 9).map((c, i) => (
          <div key={i} style={{ aspectRatio: "2/3", borderRadius: 8, overflow: "hidden", background: "#111" }}>
            <img src={c} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ))}
      </div>

      {/* Gradient scrim so text is always legible over the collage */}
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 45%, #000 92%)",
          zIndex: 1,
        }}
      />

      {/* Foreground content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "150px 24px 0",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.65)",
            marginBottom: 10,
          }}
        >
          {ar ? slide.eyebrowAr : slide.eyebrow}
        </div>
        <h1
          style={{
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            color: "#fff",
            margin: "0 0 12px",
            maxWidth: 340,
          }}
        >
          {ar ? slide.titleAr : slide.title}
        </h1>
        <p
          style={{
            fontSize: 14.5,
            lineHeight: 1.5,
            color: "rgba(255,255,255,0.75)",
            margin: "0 0 22px",
            maxWidth: 320,
          }}
        >
          {ar ? slide.subtitleAr : slide.subtitle}
        </p>
        <button
          onClick={() => navigate(slide.href)}
          style={{
            background: "#fff",
            color: "#000",
            border: "none",
            borderRadius: 999,
            padding: "13px 30px",
            fontSize: 15,
            fontWeight: 700,
            fontFamily: SF,
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
          }}
        >
          {ar ? slide.ctaAr : slide.cta}
        </button>

        {/* Page dots */}
        <div style={{ display: "flex", gap: 7, marginTop: 24 }}>
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: i === index ? 22 : 7,
                height: 7,
                borderRadius: 999,
                border: "none",
                padding: 0,
                background: i === index ? "#fff" : "rgba(255,255,255,0.35)",
                transition: "all 240ms ease",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
