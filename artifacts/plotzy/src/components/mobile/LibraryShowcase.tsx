// Sudowrite-plugins-style showcase for a library: three tilted covers
// fanned above a kicker, a serif headline, one supporting line, and a
// green call to action, all inside a big rounded section. Dark
// (espresso) and light (deep paper) variants alternate down the page.

import { useLocation } from "wouter";
import { SERIF_EN, SERIF_AR } from "./fonts";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';
const GREEN = "#26ad5f";

export interface LibraryShowcaseProps {
  ar: boolean;
  dark?: boolean;
  kicker: string;
  kickerAr: string;
  title: string;
  titleAr: string;
  sub: string;
  subAr: string;
  cta: string;
  ctaAr: string;
  href: string;
  /** Exactly three cover image urls: [left, center, right]. */
  covers: [string, string, string];
}

export function LibraryShowcase({ ar, dark = false, kicker, kickerAr, title, titleAr, sub, subAr, cta, ctaAr, href, covers }: LibraryShowcaseProps) {
  const [, navigate] = useLocation();
  const serif = ar ? SERIF_AR : SERIF_EN;

  const coverCard = (src: string, style: React.CSSProperties, dim = false) => (
    <div
      style={{
        position: "absolute",
        width: 106,
        aspectRatio: "2 / 3",
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: dark ? "0 14px 30px -10px rgba(0,0,0,0.6)" : "0 14px 30px -10px rgba(41,33,21,0.4)",
        border: dark ? "1px solid rgba(244,239,226,0.14)" : "1px solid rgba(66,53,33,0.16)",
        background: dark ? "#3a2f1e" : "#e7dfcc",
        ...style,
      }}
    >
      <img src={src} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      {dim && <div aria-hidden style={{ position: "absolute", inset: 0, background: dark ? "rgba(41,33,21,0.35)" : "rgba(244,239,226,0.28)" }} />}
    </div>
  );

  return (
    <section dir={ar ? "rtl" : "ltr"} style={{ padding: "0 14px", marginBottom: 26, fontFamily: SF }}>
      <div
        style={{
          background: dark ? "#292115" : "#ece5d2",
          border: dark ? "1px solid rgba(66,53,33,0.35)" : "1px solid rgba(66,53,33,0.14)",
          borderRadius: 26,
          padding: "34px 20px 24px",
          textAlign: "center",
          overflow: "hidden",
          boxShadow: dark ? "0 18px 40px -18px rgba(20,16,10,0.5)" : "0 10px 26px -14px rgba(41,33,21,0.2)",
        }}
      >
        {/* Tilted covers fan */}
        <div style={{ position: "relative", height: 212, marginBottom: 22 }}>
          {coverCard(covers[0], { top: 26, left: "50%", marginLeft: -140, transform: "rotate(-10deg)" }, true)}
          {coverCard(covers[2], { top: 26, left: "50%", marginLeft: 34, transform: "rotate(10deg)" }, true)}
          {coverCard(covers[1], { top: 0, left: "50%", marginLeft: -64, width: 128, zIndex: 2, borderRadius: 12 })}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: dark ? "rgba(244,239,226,0.5)" : "#7b7366", marginBottom: 10 }}>
          {ar ? kickerAr : kicker}
        </div>
        <h2 style={{ fontFamily: serif, fontSize: ar ? 25 : 27, fontWeight: 700, lineHeight: ar ? 1.5 : 1.2, letterSpacing: ar ? 0 : "-0.01em", color: dark ? "#f7f2e4" : "#2f2618", margin: "0 0 10px" }}>
          {ar ? titleAr : title}
        </h2>
        <p style={{ fontSize: ar ? 13.5 : 14, lineHeight: 1.65, color: dark ? "rgba(244,239,226,0.6)" : "#7b7366", maxWidth: 300, margin: "0 auto 20px" }}>
          {ar ? subAr : sub}
        </p>

        <button
          onClick={() => navigate(href)}
          style={{
            width: "100%",
            background: GREEN,
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "14px 20px",
            fontSize: 15,
            fontWeight: 700,
            fontFamily: SF,
            cursor: "pointer",
            boxShadow: "0 10px 24px -8px rgba(38,173,95,0.55), inset 0 1px 0 rgba(255,255,255,0.22)",
          }}
        >
          {ar ? ctaAr : cta}
        </button>
      </div>
    </section>
  );
}
