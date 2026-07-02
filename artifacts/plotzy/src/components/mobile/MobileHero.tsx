// Collapsing Parallax Hero — the Apple TV motion.
//
// At rest the hero fills the screen: a full-bleed backdrop of book
// covers behind a headline, CTA, and page dots. As you scroll down,
// three scroll-linked effects run together and reverse on scroll up:
//   1. Parallax  — the backdrop drifts up SLOWER than the page and
//                  zooms in slightly, so it recedes behind the text.
//   2. Dim       — a dark overlay deepens, sinking the backdrop away.
//   3. Collapse  — the headline / subtitle / CTA / dots fade and lift,
//                  so the hero folds away and the rows below take over.
//
// PERFORMANCE (the whole reason the earlier version stuttered on iOS):
//   - We read window.scrollY, NEVER getBoundingClientRect — the latter
//     forces a synchronous layout/reflow every frame, which is the
//     real source of scroll jank.
//   - We animate ONLY transform and opacity (both GPU-composited),
//     never blur or layout properties.
//   - Updates run inside a single rAF, throttled with a tick guard, and
//     write element.style directly (no React re-render per frame).

import { useEffect, useRef, useState } from "react";
import { HERO_SLIDES } from "./mobile-content";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export function MobileHero({ ar, onStartWriting }: { ar: boolean; onStartWriting: () => void }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const slide = HERO_SLIDES[index];

  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<HTMLDivElement>(null);

  // Auto-advance slides.
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(id);
  }, [index]);

  // Scroll-linked collapse. Height is measured ONCE (offsetHeight is a
  // one-time read on mount + resize, not per-frame), then every frame
  // we use the cheap window.scrollY.
  useEffect(() => {
    let ticking = false;
    let heroH = sectionRef.current?.offsetHeight || window.innerHeight;

    const apply = () => {
      ticking = false;
      const y = window.scrollY;
      // progress 0..1 over the first ~85% of the hero's height.
      const p = Math.max(0, Math.min(1, y / (heroH * 0.85)));

      const bg = bgRef.current, dim = dimRef.current, fg = fgRef.current;
      // Backdrop: parallax down (0.4x) so it appears to rise at 0.6x,
      // plus a slow zoom in.
      if (bg) bg.style.transform = `translate3d(0, ${y * 0.4}px, 0) scale(${1 + p * 0.14})`;
      // Dim overlay deepens as we descend.
      if (dim) dim.style.opacity = `${0.25 + p * 0.6}`;
      // Foreground folds away: lifts a touch faster and fades out by
      // ~two-thirds of the scroll.
      if (fg) {
        fg.style.transform = `translate3d(0, ${-y * 0.12}px, 0)`;
        fg.style.opacity = `${Math.max(0, 1 - p * 1.5)}`;
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    };
    const onResize = () => { heroH = sectionRef.current?.offsetHeight || window.innerHeight; apply(); };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize); };
  }, []);

  const go = (dir: number) => setIndex((i) => (i + dir + HERO_SLIDES.length) % HERO_SLIDES.length);

  return (
    <section
      ref={sectionRef}
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
        height: "86vh",
        minHeight: 540,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {/* Backdrop layer (parallax + zoom). Box is 24% taller than the
          hero so the parallax shift never exposes an edge. */}
      <div
        ref={bgRef}
        aria-hidden
        style={{
          position: "absolute", top: "-12%", left: 0, right: 0, height: "124%",
          zIndex: 0, willChange: "transform",
        }}
      >
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

      {/* Static base gradient — keeps text legible + fades into black. */}
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, zIndex: 1,
          background: "linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.95) 92%, #000 100%)",
        }}
      />

      {/* Dynamic dim layer — deepens as the hero collapses. */}
      <div
        ref={dimRef}
        aria-hidden
        style={{ position: "absolute", inset: 0, zIndex: 1, background: "#000", opacity: 0.25, willChange: "opacity" }}
      />

      {/* Foreground (collapses on scroll). */}
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

        {/* Page dots */}
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
