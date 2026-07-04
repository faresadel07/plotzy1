// Desktop landing section for the Classic Comics library. A dark
// cinematic band: eyebrow + title on the start side, a Browse-all
// button, and a horizontally scrolling strip of covers that link
// straight into the reader. Phones never render this (the mobile home
// has its own comics shelf); it sits between the landing carousels.

import { useLocation } from "wouter";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useState } from "react";
import { COMICS, comicCover, comicCoverRemote, comicCoverFallback } from "@/lib/comics";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export function ComicsShowcase() {
  const { lang, isRTL } = useLanguage();
  const ar = lang === "ar";
  const [, navigate] = useLocation();
  const Arrow = ar ? ArrowLeft : ArrowRight;

  if (COMICS.length === 0) return null;
  // Two counter-scrolling rows, exactly like the book carousels above.
  // Sample across the catalogue so all genres show, not just the first.
  const step = Math.max(1, Math.floor(COMICS.length / 36));
  const featured = COMICS.filter((_, i) => i % step === 0).slice(0, 36);
  const rowA = featured.slice(0, 18);
  const rowB = featured.slice(18, 36);

  return (
    <section dir={isRTL ? "rtl" : "ltr"} style={{ background: "#080808", padding: "72px 0 76px", fontFamily: SF, overflow: "hidden" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, marginBottom: 30, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", margin: "0 0 12px" }}>
              {ar ? "من العصر الذهبي" : "From the golden age"}
            </p>
            <h2 style={{ fontSize: "clamp(1.7rem, 3.2vw, 2.6rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.035em", lineHeight: 1.1, margin: "0 0 10px" }}>
              {ar ? "كوميكس كلاسيكيّة" : "Classic Comics"}
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, maxWidth: 520, margin: 0 }}>
              {ar
                ? "قصص مصوّرة أصليّة من الأربعينات والخمسينات، ملكيّة عامّة ومجّانيّة بالكامل."
                : "Original comic books from the 1940s and 1950s, fully public domain and free to read."}
            </p>
          </div>
          <button
            onClick={() => navigate("/comics")}
            style={{
              display: "inline-flex", alignItems: "center", gap: 9,
              padding: "13px 26px", borderRadius: 999, flexShrink: 0,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)",
              color: "#fff", fontWeight: 600, fontSize: 14, fontFamily: SF, cursor: "pointer",
              transition: "all 0.25s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; }}
          >
            {ar ? "تصفّح الكل" : "Browse all"} <Arrow size={16} style={{ opacity: 0.7 }} />
          </button>
        </div>
      </div>

      {/* Cover strip — the same two counter-scrolling marquee rows and
          90x135 cover size as the book carousels above, with the edge
          fades matched to this section's dark background. */}
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: 140, height: "100%", background: "linear-gradient(to right,#080808,transparent)", zIndex: 2, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: 140, height: "100%", background: "linear-gradient(to left,#080808,transparent)", zIndex: 2, pointerEvents: "none" }} />
        <ComicTrack comics={rowA} onOpen={(id) => navigate(`/comics/${id}`)} />
        <div style={{ height: 14 }} />
        <ComicTrack comics={rowB} onOpen={(id) => navigate(`/comics/${id}`)} reverse />
      </div>

      <style>{`
        @keyframes comicsMarquee    { from { transform: translateX(0);    } to { transform: translateX(-50%); } }
        @keyframes comicsMarqueeRev { from { transform: translateX(-50%); } to { transform: translateX(0);    } }
      `}</style>
    </section>
  );
}

// One marquee row: doubled max-content flex sliding 0 to -50% (or the
// reverse), paused on hover — identical mechanics to BookCarousel.
function ComicTrack({ comics, onOpen, reverse }: {
  comics: typeof COMICS;
  onOpen: (id: string) => void;
  reverse?: boolean;
}) {
  const doubled = [...comics, ...comics];
  return (
    <div dir="ltr" className="group" style={{ overflow: "hidden" }}>
      <div
        style={{ display: "flex", direction: "ltr", width: "max-content", animation: `${reverse ? "comicsMarqueeRev" : "comicsMarquee"} 45s linear infinite` }}
        className="group-hover:[animation-play-state:paused]"
      >
        {doubled.map((c, i) => (
          <button
            key={`${c.id}-${i}`}
            onClick={() => onOpen(c.id)}
            tabIndex={i >= comics.length ? -1 : 0}
            aria-hidden={i >= comics.length}
            className="group/comic flex-shrink-0 mx-2.5"
            style={{ width: 90, background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
          >
            <div
              className="relative overflow-hidden transition-transform duration-300 group-hover/comic:scale-[1.06]"
              style={{
                width: 90, height: 135, borderRadius: 5,
                boxShadow: "4px 5px 16px rgba(0,0,0,0.45), 1px 1px 4px rgba(0,0,0,0.25)",
                background: "#141416",
              }}
            >
              <ShowcaseCover id={c.id} alt={c.title} />
              {/* Spine shadow, matching the book covers above */}
              <div style={{ position: "absolute", top: 0, left: 0, width: 7, height: "100%", background: "linear-gradient(to right,rgba(0,0,0,0.28),transparent)", pointerEvents: "none" }} />
              {/* Hover title */}
              <div
                className="absolute inset-x-0 bottom-0 opacity-0 group-hover/comic:opacity-100 transition-opacity duration-200"
                style={{ background: "linear-gradient(to top,rgba(0,0,0,0.85),transparent)", padding: "20px 6px 6px" }}
              >
                <p style={{ fontSize: 8.5, color: "rgba(255,255,255,0.92)", textAlign: "center", lineHeight: 1.3, margin: 0, fontFamily: SF }}>
                  {c.title}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ShowcaseCover({ id, alt }: { id: string; alt: string }) {
  const [step, setStep] = useState(0);
  const src = step === 0 ? comicCover(id) : step === 1 ? comicCoverRemote(id) : comicCoverFallback(id);
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setStep((s) => Math.min(s + 1, 2))}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
  );
}
