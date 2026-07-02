// The Apple-TV-style hero for the mobile home.
//
// A full-bleed image of professionally designed book covers behind a
// headline, a subtitle, and a white pill CTA — with page dots. All
// three slides pitch writing; the CTA opens the book-creation wizard
// via the onStartWriting callback. Auto-advances, swipeable.

import { useEffect, useRef, useState } from "react";
import { HERO_SLIDES } from "./mobile-content";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export function MobileHero({ ar, onStartWriting }: { ar: boolean; onStartWriting: () => void }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const slide = HERO_SLIDES[index];

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
        overflow: "hidden",
        minHeight: 560,
      }}
    >
      {/* Full-bleed image backdrop — crossfades between slides */}
      {HERO_SLIDES.map((s, i) => (
        <div
          key={i}
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${s.image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: i === index ? 1 : 0,
            transition: "opacity 700ms ease",
            zIndex: 0,
          }}
        />
      ))}

      {/* Scrim so text stays legible and the bottom fades into black */}
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.80) 78%, #000 100%)",
          zIndex: 1,
        }}
      />

      {/* Foreground content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "calc(env(safe-area-inset-top, 0px) + 300px) 24px 0",
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
            color: "rgba(255,255,255,0.7)",
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
            textShadow: "0 2px 18px rgba(0,0,0,0.5)",
          }}
        >
          {ar ? slide.titleAr : slide.title}
        </h1>
        <p
          style={{
            fontSize: 14.5,
            lineHeight: 1.5,
            color: "rgba(255,255,255,0.82)",
            margin: "0 0 22px",
            maxWidth: 320,
            textShadow: "0 1px 10px rgba(0,0,0,0.5)",
          }}
        >
          {ar ? slide.subtitleAr : slide.subtitle}
        </p>
        <button
          onClick={onStartWriting}
          style={{
            background: "#fff",
            color: "#000",
            border: "none",
            borderRadius: 999,
            padding: "14px 32px",
            fontSize: 15,
            fontWeight: 700,
            fontFamily: SF,
            cursor: "pointer",
            boxShadow: "0 6px 24px rgba(0,0,0,0.4)",
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
                background: i === index ? "#fff" : "rgba(255,255,255,0.4)",
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
