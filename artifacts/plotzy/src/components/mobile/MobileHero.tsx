// Collapsing Parallax Hero — the Apple TV motion, done correctly.
//
// ARCHITECTURE (this is what fixes the bleed-through / overlap bugs):
//   - The hero is `position: sticky` inside a tall wrapper (in
//     MobileHome). It PINS at the top of the viewport while you scroll.
//   - The content rows live in a SEPARATE container with a solid black
//     background and a higher z-index, so as you scroll they slide UP
//     and cover the pinned hero completely. No transparency, no
//     bleed-through, no z-index confusion.
//
// COLLAPSE (scroll-linked, eased, reverses on scroll up):
//   - Backdrop zooms in and dims as you descend, sinking away.
//   - The headline / subtitle / CTA / dots fade to 0 AND scale down,
//     folding the hero away. They're fully invisible by ~55% of the
//     scroll, well before the content covers them, so two titles are
//     never on screen at once.
//
// PERFORMANCE: reads window.scrollY (never getBoundingClientRect —
// that forces a reflow every frame), animates only transform + opacity
// (GPU-composited), one rAF-throttled handler writing element.style
// directly. 60fps on iOS Safari.

import { useEffect, useRef, useState } from "react";
import { HERO_SLIDES } from "./mobile-content";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export function MobileHero({ ar, onStartWriting }: { ar: boolean; onStartWriting: () => void }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const slide = HERO_SLIDES[index];

  const bgRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(id);
  }, [index]);

  useEffect(() => {
    let ticking = false;
    // Collapse over the first 62% of a viewport height of scrolling, so
    // the hero is fully gone before the content (which starts ~86vh
    // down) can overlap it.
    const range = () => window.innerHeight * 0.62;

    const apply = () => {
      ticking = false;
      const y = window.scrollY;
      const p = Math.max(0, Math.min(1, y / range()));
      const bg = bgRef.current, dim = dimRef.current, fg = fgRef.current;
      if (bg) bg.style.transform = `scale(${1 + p * 0.16})`;
      if (dim) dim.style.opacity = `${0.22 + p * 0.7}`;
      if (fg) {
        // Fade fully by ~55% of the range; lift + shrink as it goes.
        fg.style.opacity = `${Math.max(0, 1 - p * 1.8)}`;
        fg.style.transform = `translate3d(0, ${-y * 0.25}px, 0) scale(${1 - p * 0.14})`;
      }
    };
    const onScroll = () => { if (ticking) return; ticking = true; requestAnimationFrame(apply); };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", apply);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", apply); };
  }, []);

  const go = (dir: number) => setIndex((i) => (i + dir + HERO_SLIDES.length) % HERO_SLIDES.length);

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
        // Sticky: the hero pins to the top while the content scrolls up
        // and over it (content has a solid bg + higher z-index).
        position: "sticky",
        top: 0,
        height: "84vh",
        minHeight: 520,
        fontFamily: SF,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {/* Backdrop (zoom + crossfade) */}
      <div ref={bgRef} aria-hidden style={{ position: "absolute", inset: 0, zIndex: 0, willChange: "transform" }}>
        {HERO_SLIDES.map((s, i) => (
          <div
            key={i}
            style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${s.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: i === index ? 1 : 0,
              transition: "opacity 700ms ease",
            }}
          />
        ))}
      </div>

      {/* Static base gradient for legibility + fade to black at the bottom */}
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, zIndex: 1,
          background: "linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.95) 92%, #000 100%)",
        }}
      />

      {/* Dynamic dim layer — deepens as the hero collapses */}
      <div ref={dimRef} aria-hidden style={{ position: "absolute", inset: 0, zIndex: 1, background: "#000", opacity: 0.22, willChange: "opacity" }} />

      {/* Foreground — fades + scales away on scroll */}
      <div
        ref={fgRef}
        style={{
          position: "relative", zIndex: 2,
          padding: "0 24px 24px",
          textAlign: "center",
          display: "flex", flexDirection: "column", alignItems: "center",
          willChange: "transform, opacity",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.72)", marginBottom: 10 }}>
          {ar ? slide.eyebrowAr : slide.eyebrow}
        </div>
        <h1 style={{ fontSize: 31, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.08, color: "#fff", margin: "0 0 12px", maxWidth: 340, textShadow: "0 2px 20px rgba(0,0,0,0.6)" }}>
          {ar ? slide.titleAr : slide.title}
        </h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.5, color: "rgba(255,255,255,0.85)", margin: "0 0 22px", maxWidth: 320, textShadow: "0 1px 12px rgba(0,0,0,0.6)" }}>
          {ar ? slide.subtitleAr : slide.subtitle}
        </p>
        <button
          onClick={onStartWriting}
          style={{
            background: "#fff", color: "#000", border: "none", borderRadius: 999,
            padding: "14px 34px", fontSize: 15, fontWeight: 700, fontFamily: SF,
            cursor: "pointer", boxShadow: "0 6px 24px rgba(0,0,0,0.45)",
          }}
        >
          {ar ? slide.ctaAr : slide.cta}
        </button>

        <div style={{ display: "flex", gap: 7, marginTop: 22 }}>
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: i === index ? 22 : 7, height: 7, borderRadius: 999,
                border: "none", padding: 0,
                background: i === index ? "#fff" : "rgba(255,255,255,0.4)",
                transition: "all 240ms ease", cursor: "pointer",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
