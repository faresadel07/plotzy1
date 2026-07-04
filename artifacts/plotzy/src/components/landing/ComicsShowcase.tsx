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
  const featured = COMICS.slice(0, 18);

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

      {/* Cover strip — the same self-scrolling marquee as the book
          carousels above it: doubled content sliding 0 to -50%,
          paused while hovered so covers stay clickable. */}
      <div className="comics-marquee-clip" style={{ overflow: "hidden", padding: "8px 0 14px" }}>
        <div
          dir="ltr"
          className="comics-marquee-track"
          style={{ display: "flex", gap: 18, width: "max-content", animation: "comicsMarquee 55s linear infinite" }}
        >
          {[...featured, ...featured].map((c, i) => (
            <button
              key={`${c.id}-${i}`}
              onClick={() => navigate(`/comics/${c.id}`)}
              className="comics-showcase-card"
              tabIndex={i >= featured.length ? -1 : 0}
              aria-hidden={i >= featured.length}
              style={{
                flex: "0 0 auto", width: 148, background: "transparent", border: "none",
                padding: 0, cursor: "pointer", textAlign: "left", fontFamily: SF,
              }}
            >
              <div
                className="comics-showcase-cover"
                style={{
                  width: "100%", aspectRatio: "2 / 3", borderRadius: 10, overflow: "hidden",
                  background: "#141416", boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
                  transition: "transform 200ms cubic-bezier(0.2, 0.8, 0.4, 1), box-shadow 200ms ease",
                }}
              >
                <ShowcaseCover id={c.id} alt={c.title} />
              </div>
              <div style={{ marginTop: 9, fontSize: 12.5, fontWeight: 600, color: "#f0efe8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.title}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
                {c.year || c.series}
              </div>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes comicsMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .comics-marquee-clip:hover .comics-marquee-track { animation-play-state: paused; }
        .comics-showcase-card:hover .comics-showcase-cover {
          transform: translateY(-5px) scale(1.03);
          box-shadow: 0 18px 44px rgba(0,0,0,0.7);
        }
      `}</style>
    </section>
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
