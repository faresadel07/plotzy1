// Collapsing Parallax Hero — the Apple TV motion, done correctly.
//
// ARCHITECTURE (this is what fixes the bleed-through / overlap bugs):
//   - The hero is `position: sticky` inside a tall wrapper (in
//     MobileHome). It PINS at the top of the viewport while you scroll.
//   - The content rows live in a SEPARATE container with a solid paper
//     background and a higher z-index, so as you scroll they slide UP
//     and cover the pinned hero completely. No transparency, no
//     bleed-through, no z-index confusion.
//
// COLLAPSE (scroll-linked, eased, reverses on scroll up):
//   - Backdrop zooms in and dissolves into a paper wash as you descend.
//   - The ink headline / subtitle / CTA / dots never change colour;
//     they disappear purely by motion: they slide up with the scroll
//     and are then cleanly covered by the solid-paper content layer
//     rising over them. No two titles on screen at once.
//
// PERFORMANCE: reads window.scrollY (never getBoundingClientRect —
// that forces a reflow every frame), animates only transform + opacity
// (GPU-composited), one rAF-throttled handler writing element.style
// directly. 60fps on iOS Safari.

import { useEffect, useRef, useState } from "react";
import { HERO_SLIDES } from "./mobile-content";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export function MobileHero({ ar, onStartWriting, heroHeight }: { ar: boolean; onStartWriting: () => void; heroHeight: number }) {
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
    const apply = () => {
      ticking = false;
      const y = window.scrollY;
      // Collapse over 60% of the (fixed, px) hero height. Using a px
      // height captured once — NOT vh — means the address bar showing/
      // hiding on mobile never resizes anything, so there are no jumps.
      const range = heroHeight * 0.6;
      const p = Math.max(0, Math.min(1, y / range));
      const bg = bgRef.current, dim = dimRef.current, fg = fgRef.current;
      // Barely-there parallax zoom, 1.0 -> 1.05 max.
      if (bg) bg.style.transform = `scale(${1 + p * 0.05})`;
      if (dim) dim.style.opacity = `${0.24 + p * 0.58}`;
      if (fg) {
        // The text stays FULLY WHITE (no opacity/colour change). It
        // disappears purely by motion: it slides up with the scroll and
        // is then cleanly covered by the solid-black content layer
        // rising over it. No fade, no scale.
        fg.style.transform = `translate3d(0, ${-y * 0.35}px, 0)`;
      }
    };
    const onScroll = () => { if (ticking) return; ticking = true; requestAnimationFrame(apply); };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); };
  }, [heroHeight]);

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
        // Sticky: pins to the top while the content scrolls up and over
        // it. PROBLEM 2 fix: FIXED px height (never vh) so nothing
        // resizes mid-scroll — no jumps, no black gap. All motion is
        // transform + opacity only; height/margin/padding never change.
        position: "sticky",
        top: 0,
        height: heroHeight,
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

      {/* Static base gradient for legibility + fade to PAPER at the
          bottom: the collage sinks into the warm page instead of into
          black, and the ink headline sits on the cream zone. */}
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, zIndex: 1,
          background: "linear-gradient(180deg, rgba(41,33,21,0.30) 0%, rgba(41,33,21,0.06) 32%, rgba(244,239,226,0.55) 60%, rgba(244,239,226,0.93) 82%, #f4efe2 100%)",
        }}
      />

      {/* Dynamic dim layer — a paper wash that deepens as the hero
          collapses, so the collage dissolves into the page. */}
      <div ref={dimRef} aria-hidden style={{ position: "absolute", inset: 0, zIndex: 1, background: "#f4efe2", opacity: 0.22, willChange: "opacity" }} />

      {/* Foreground — stays white, slides up and is covered on scroll */}
      <div
        ref={fgRef}
        style={{
          position: "relative", zIndex: 2,
          padding: "0 24px 24px",
          textAlign: "center",
          display: "flex", flexDirection: "column", alignItems: "center",
          willChange: "transform",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b7366", marginBottom: 10 }}>
          {ar ? slide.eyebrowAr : slide.eyebrow}
        </div>
        <h1 style={{ fontSize: 31, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.08, color: "#2f2618", margin: "0 0 12px", maxWidth: 340, textShadow: "0 1px 16px rgba(244,239,226,0.85)" }}>
          {ar ? slide.titleAr : slide.title}
        </h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.5, color: "#423521", margin: "0 0 22px", maxWidth: 320, textShadow: "0 1px 10px rgba(244,239,226,0.8)" }}>
          {ar ? slide.subtitleAr : slide.subtitle}
        </p>
        <button
          onClick={onStartWriting}
          style={{
            background: "#292115", color: "#f7f2e4", border: "none", borderRadius: 999,
            padding: "14px 34px", fontSize: 15, fontWeight: 700, fontFamily: SF,
            cursor: "pointer", boxShadow: "0 10px 26px -8px rgba(41,33,21,0.55)",
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
                background: i === index ? "#2f2618" : "rgba(66,53,33,0.35)",
                transition: "all 240ms ease", cursor: "pointer",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
