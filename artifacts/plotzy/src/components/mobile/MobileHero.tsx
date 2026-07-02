// The Apple-TV-style hero for the mobile home.
//
// Matches Apple TV's motion precisely:
//   - The hero fills ~78% of the viewport so the first content row
//     peeks below it, inviting the scroll.
//   - The headline / CTA / dots sit at the BOTTOM of the hero over a
//     dark gradient, not floating in the middle.
//   - As you scroll, the background image drifts UP more slowly than
//     the page (parallax) — the signature Apple TV feel — while the
//     whole block still scrolls away naturally (no fade, no gap).
//
// All three slides pitch writing; the CTA opens the book-creation
// wizard via onStartWriting. Auto-advances, swipeable.

import { useEffect, useRef, useState } from "react";
import { HERO_SLIDES } from "./mobile-content";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export function MobileHero({ ar, onStartWriting }: { ar: boolean; onStartWriting: () => void }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const slide = HERO_SLIDES[index];

  // Auto-advance slides.
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(id);
  }, [index]);

  // Parallax: drift the backdrop up at ~35% of the scroll distance.
  // CRITICAL for smoothness: we write element.style.transform DIRECTLY
  // inside a requestAnimationFrame, never through React state. A state
  // update on every scroll frame re-renders the whole component and
  // makes the motion stutter; a direct DOM write on the GPU-composited
  // `transform` property stays buttery at 60fps.
  useEffect(() => {
    let raf = 0;
    let ticking = false;
    const update = () => {
      ticking = false;
      const el = backdropRef.current;
      const section = sectionRef.current;
      if (!el || !section) return;
      const top = section.getBoundingClientRect().top; // 0 at rest, negative as we scroll
      const shift = Math.max(0, -top) * 0.35;
      el.style.transform = `translate3d(0, ${shift}px, 0)`;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
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
        // Fills most of the viewport; the next row peeks below.
        height: "78vh",
        minHeight: 520,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {/* Full-bleed image backdrop with parallax + crossfade. One
          ref'd container is translated (GPU transform, updated via rAF)
          so all slides share the same smooth parallax. The box is 25%
          taller than the hero so the shift never exposes an edge. */}
      <div
        ref={backdropRef}
        aria-hidden
        style={{
          position: "absolute",
          top: "-12%",
          left: 0,
          right: 0,
          height: "124%",
          zIndex: 0,
          willChange: "transform",
        }}
      >
        {HERO_SLIDES.map((s, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${s.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: i === index ? 1 : 0,
              transition: "opacity 700ms ease",
            }}
          />
        ))}
      </div>

      {/* Gradient — legible text + smooth fade into the black page. */}
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.10) 35%, rgba(0,0,0,0.55) 68%, rgba(0,0,0,0.92) 90%, #000 100%)",
          zIndex: 1,
        }}
      />

      {/* Foreground — anchored to the bottom of the hero. */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "0 24px 22px",
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
            color: "rgba(255,255,255,0.72)",
            marginBottom: 10,
          }}
        >
          {ar ? slide.eyebrowAr : slide.eyebrow}
        </div>
        <h1
          style={{
            fontSize: 31,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
            color: "#fff",
            margin: "0 0 12px",
            maxWidth: 340,
            textShadow: "0 2px 20px rgba(0,0,0,0.6)",
          }}
        >
          {ar ? slide.titleAr : slide.title}
        </h1>
        <p
          style={{
            fontSize: 14.5,
            lineHeight: 1.5,
            color: "rgba(255,255,255,0.85)",
            margin: "0 0 22px",
            maxWidth: 320,
            textShadow: "0 1px 12px rgba(0,0,0,0.6)",
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
            padding: "14px 34px",
            fontSize: 15,
            fontWeight: 700,
            fontFamily: SF,
            cursor: "pointer",
            boxShadow: "0 6px 24px rgba(0,0,0,0.45)",
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
