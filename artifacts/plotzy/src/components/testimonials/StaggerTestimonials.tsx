// Phone testimonials as a staggered card stack: the center quote sits
// forward, its neighbours fan out behind it with a folded corner, and
// prev/next buttons (or a tap on any card) shuffle the deck. Adapted
// from a 21st.dev pattern to Plotzy's real testimonials, dark mobile
// theme, both languages, and RTL. Deliberately different from the
// desktop wall.

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TESTIMONIALS, type Testimonial } from "./testimonials-data";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';
const SQRT_5000 = Math.sqrt(5000);

interface Deck {
  key: number;
  t: Testimonial;
}

interface CardProps {
  position: number;
  deck: Deck;
  onMove: (steps: number) => void;
  w: number;
  h: number;
  ar: boolean;
}

function Card({ position, deck, onMove, w, h, ar }: CardProps) {
  const { t } = deck;
  const isCenter = position === 0;
  const accent = t.accent;

  return (
    <div
      onClick={() => onMove(position)}
      dir={ar ? "rtl" : "ltr"}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: w,
        height: h,
        cursor: "pointer",
        fontFamily: SF,
        padding: "22px 20px",
        boxSizing: "border-box",
        transition: "transform 500ms cubic-bezier(0.22,1,0.36,1), border-color 400ms, box-shadow 400ms, opacity 400ms",
        zIndex: isCenter ? 10 : 0,
        opacity: isCenter ? 1 : Math.abs(position) > 2 ? 0 : 0.85,
        background: isCenter
          ? "linear-gradient(160deg, #1d1d24 0%, #131317 100%)"
          : "linear-gradient(160deg, #141418 0%, #0c0c0f 100%)",
        border: `1.5px solid ${isCenter ? accent : "rgba(255,255,255,0.09)"}`,
        color: "#fff",
        clipPath:
          "polygon(44px 0%, calc(100% - 0px) 0%, 100% 0px, 100% 100%, 44px 100%, 0 100%, 0 44px)",
        transform: `translate(-50%, -50%) translateX(${(w / 1.65) * position}px) translateY(${
          isCenter ? -28 : position % 2 ? 16 : -16
        }px) rotate(${isCenter ? 0 : position % 2 ? 2.4 : -2.4}deg)`,
        boxShadow: isCenter
          ? `0 18px 40px -12px rgba(0,0,0,0.7), 0 0 0 1px ${accent}22, 0 0 34px -10px ${accent}`
          : "0 10px 24px -14px rgba(0,0,0,0.6)",
      }}
    >
      {/* folded-corner diagonal line */}
      <span
        style={{
          position: "absolute",
          top: 30,
          left: -2,
          width: SQRT_5000,
          height: 1.5,
          background: isCenter ? accent : "rgba(255,255,255,0.12)",
          transformOrigin: "top left",
          transform: "rotate(45deg)",
          pointerEvents: "none",
        }}
      />

      {/* photo, sticker style with an offset accent shadow */}
      <div
        style={{
          width: 46,
          height: 54,
          marginBottom: 14,
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: `3px 3px 0 0 ${isCenter ? accent : "rgba(255,255,255,0.14)"}`,
        }}
      >
        <img
          src={t.photo}
          alt={ar ? t.nameAr : t.name}
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: t.pos, display: "block" }}
        />
      </div>

      {/* quote */}
      <p
        style={{
          margin: 0,
          fontSize: w < 280 ? 14 : 15,
          lineHeight: 1.5,
          fontWeight: 500,
          color: isCenter ? "#fff" : "rgba(255,255,255,0.62)",
          textAlign: ar ? "right" : "left",
          display: "-webkit-box",
          WebkitLineClamp: 5,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {ar ? `"${t.quoteAr}"` : `"${t.quote}"`}
      </p>

      {/* attribution pinned to the bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          insetInlineStart: 20,
          insetInlineEnd: 20,
          textAlign: ar ? "right" : "left",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: isCenter ? "#fff" : "rgba(255,255,255,0.8)" }}>
          {ar ? t.nameAr : t.name}
        </div>
        <div style={{ fontSize: 11.5, fontStyle: "italic", color: isCenter ? `${accent}` : "rgba(255,255,255,0.4)" }}>
          {ar ? t.roleAr : t.role}
        </div>
      </div>
    </div>
  );
}

export function StaggerTestimonials({ ar }: { ar: boolean }) {
  const [size, setSize] = useState({ w: 276, h: 316 });
  const [deck, setDeck] = useState<Deck[]>(() => TESTIMONIALS.map((t, i) => ({ key: i, t })));
  const [seq, setSeq] = useState(TESTIMONIALS.length);

  useEffect(() => {
    const update = () => {
      const wide = window.matchMedia("(min-width: 480px)").matches;
      setSize(wide ? { w: 300, h: 330 } : { w: 264, h: 312 });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Advancing in the reading direction: in RTL, the visual "forward"
  // button should still move the deck forward.
  const move = (steps: number) => {
    if (steps === 0) return;
    setDeck((prev) => {
      const next = [...prev];
      let s = seq;
      if (steps > 0) {
        for (let i = 0; i < steps; i++) {
          const item = next.shift();
          if (!item) break;
          next.push({ ...item, key: s++ });
        }
      } else {
        for (let i = 0; i < -steps; i++) {
          const item = next.pop();
          if (!item) break;
          next.unshift({ ...item, key: s++ });
        }
      }
      setSeq(s);
      return next;
    });
  };

  const Back = ar ? ChevronRight : ChevronLeft;
  const Fwd = ar ? ChevronLeft : ChevronRight;

  return (
    <div
      dir="ltr"
      style={{
        position: "relative",
        width: "100%",
        height: size.h + 150,
        overflow: "hidden",
        fontFamily: SF,
      }}
    >
      {deck.map((d, index) => (
        <Card
          key={d.key}
          deck={d}
          onMove={move}
          position={index - Math.floor(deck.length / 2)}
          w={size.w}
          h={size.h}
          ar={ar}
        />
      ))}

      {/* nav */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 10,
          zIndex: 20,
        }}
      >
        {[
          { fn: () => move(-1), Icon: Back, label: ar ? "السابق" : "Previous" },
          { fn: () => move(1), Icon: Fwd, label: ar ? "التالي" : "Next" },
        ].map(({ fn, Icon, label }, i) => (
          <button
            key={i}
            onClick={fn}
            aria-label={label}
            style={{
              width: 46,
              height: 46,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#fff",
              cursor: "pointer",
              transition: "background 150ms, border-color 150ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
            }}
          >
            <Icon size={20} aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}
