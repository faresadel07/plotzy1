// Writer Protection — dark espresso edition.
//
// Faris saw the espresso protection band on the landing and asked for
// the whole page in the same key: dark brown canvas, light-brown type,
// serif headlines with handwritten margin notes (Caveat / Aref Ruqaa),
// his real sticky-note photo, masking-tape pillar cards, crumpled
// paper balls, the "never" pact still on the light crumpled-paper
// photo (real paper on a dark desk), and his own Severus Snape
// drawing beside the hero's "Always" — because always.

import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, ArrowLeft, X as XIcon } from "lucide-react";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/language-context";
import type { TranslationKey } from "@/lib/i18n";
import { StickyNote } from "@/components/mobile/StickyNote";
import { PaperBall } from "@/components/mobile/PaperBall";
import { ensureHomeFonts, HAND_AR, HAND_EN, SERIF_AR, SERIF_EN } from "@/components/mobile/fonts";

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif";

/* Dark espresso tokens — the landing protection band, page-sized.
   Light browns on dark brown, nothing else. */
const BG  = "#221b11";
const C1  = "#332a1b";                       // lifted dark card
const B   = "rgba(244,239,226,0.14)";
const B2  = "rgba(244,239,226,0.08)";
const T   = "#e6cda4";                       // headings
const TS  = "rgba(222,196,155,0.85)";        // body
const TD  = "rgba(216,185,140,0.55)";        // dim
const ACC = "#d8b98c";                       // handwriting
const ESP = "#292115";
const PAPER = "#f4efe2";
const RED = "#c9705a"; // warm brick, lightened for the dark canvas

const PILLAR_KEYS: { title: TranslationKey; desc: TranslationKey }[] = [
  { title: "ptP1T", desc: "ptP1D" },
  { title: "ptP2T", desc: "ptP2D" },
  { title: "ptP3T", desc: "ptP3D" },
  { title: "ptP4T", desc: "ptP4D" },
  { title: "ptP5T", desc: "ptP5D" },
  { title: "ptP6T", desc: "ptP6D" },
  { title: "ptP7T", desc: "ptP7D" },
  { title: "ptP8T", desc: "ptP8D" },
];

const NEVER_KEYS: TranslationKey[] = [
  "ptNever1", "ptNever2", "ptNever3", "ptNever4",
  "ptNever5", "ptNever6", "ptNever7", "ptNever8",
];

const TECH_KEYS: { title: TranslationKey; text: TranslationKey }[] = [
  { title: "ptTech1T", text: "ptTech1X" },
  { title: "ptTech2T", text: "ptTech2X" },
  { title: "ptTech3T", text: "ptTech3X" },
  { title: "ptTech4T", text: "ptTech4X" },
  { title: "ptTech5T", text: "ptTech5X" },
];

/* Tiny rotations so the pillar cards read as pinned paper, not a grid
   of identical rectangles. */
const CARD_ROT = [-0.6, 0.45, -0.3, 0.55, 0.35, -0.5, 0.4, -0.35];

export default function Protection() {
  const { t, lang, isRTL } = useLanguage();
  const ar = lang === "ar";
  const SERIF = ar ? SERIF_AR : SERIF_EN;
  const HAND = ar ? HAND_AR : HAND_EN;

  useEffect(() => { ensureHomeFonts(); }, []);

  return (
    <Layout darkNav>
      <SEO
        title={t("ptSeoTitle")}
        description={t("ptSeoDesc")}
      />

      <div style={{
        minHeight: "100vh",
        background: BG,
        backgroundImage: "radial-gradient(circle, rgba(244,239,226,0.045) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
        color: T,
        fontFamily: SF,
        overflowX: "clip",
      }}>

        {/* Decorations disappear on phones so they never crowd copy. */}
        <style>{`
          @media (max-width: 900px) { .pt-decor { display: none !important; } }
        `}</style>

        {/* ===== BACK BUTTON (fixed, top inline-start) ===== */}
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) window.history.back();
            else window.location.href = "/";
          }}
          aria-label={t("abGoBack")}
          style={{
            position: "fixed",
            top: 76,
            insetInlineStart: 20,
            zIndex: 50,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderRadius: 999,
            background: PAPER,
            border: "1px solid rgba(244,239,226,0.2)",
            color: ESP,
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.2s",
            fontFamily: SF,
            boxShadow: "0 6px 16px -8px rgba(0,0,0,0.5)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#fffdf7"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = PAPER; }}
        >
          <ArrowLeft style={{ width: 14, height: 14, transform: isRTL ? "scaleX(-1)" : undefined }} />
          {t("abBack")}
        </button>

        {/* ===== HERO ===== */}
        <section style={{ position: "relative", padding: "72px 24px 36px", textAlign: "center", maxWidth: 880, margin: "0 auto" }}>
          {/* The promise that matters most, on Faris's real sticky note. */}
          <div className="pt-decor" style={{ position: "absolute", top: 24, insetInlineStart: -44, zIndex: 2 }}>
            <StickyNote
              ar={ar}
              text={ar ? "كلماتك ملكك 100%" : "100% yours. always."}
              size={104}
              rot={-5}
            />
          </div>

          {/* Faris's own Severus Snape drawing, taped beside "Always".
              If you know, you know. The artwork is his. */}
          <div className="pt-decor" style={{ position: "absolute", top: 68, insetInlineEnd: -96, zIndex: 2, transform: "rotate(2.5deg)", width: 172 }}>
            <div style={{ position: "relative" }}>
              <div aria-hidden style={{
                position: "absolute",
                top: -9,
                left: "50%",
                transform: "translateX(-50%) rotate(-3deg)",
                width: 58,
                height: 17,
                background: "rgba(214,196,150,0.5)",
                border: "1px solid rgba(244,239,226,0.12)",
                borderRadius: 2,
                zIndex: 2,
              }} />
              <img
                src="/images/snape-always.jpg"
                alt={ar ? "رسمة سيفروس سنيب بريشة فارس" : "Severus Snape, drawn by Faris"}
                loading="lazy"
                draggable={false}
                style={{
                  width: "100%",
                  display: "block",
                  borderRadius: 10,
                  border: "1px solid rgba(244,239,226,0.14)",
                  boxShadow: "0 18px 36px -16px rgba(0,0,0,0.6)",
                  userSelect: "none",
                }}
              />
            </div>
            <div style={{
              marginTop: 8,
              fontFamily: HAND,
              fontSize: ar ? 16 : 19,
              color: ACC,
              textAlign: "center",
              transform: "rotate(-1deg)",
            }}>
              {ar ? "دائماً." : "always."}
            </div>
          </div>

          <div className="pt-decor" style={{ position: "absolute", bottom: -8, insetInlineStart: -26 }}>
            <PaperBall size={44} rot={-18} />
          </div>

          <p style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: TD,
            marginBottom: 18,
          }}>
            {t("ptEyebrow")}
          </p>
          <h1 style={{
            fontFamily: SERIF,
            fontSize: "clamp(2.4rem, 6vw, 4.2rem)",
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: "-0.02em",
            color: T,
            marginBottom: 14,
          }}>
            {t("ptHeroTitle")}
          </h1>
          <p style={{
            fontFamily: HAND,
            fontSize: "clamp(1.15rem, 2vw, 1.45rem)",
            color: ACC,
            marginBottom: 18,
            transform: "rotate(-0.6deg)",
            display: "inline-block",
          }}>
            {ar ? "(نعني كل كلمة هنا)" : "(we mean every word of this)"}
          </p>
          <p style={{
            fontSize: "clamp(1rem, 1.5vw, 1.2rem)",
            fontWeight: 400,
            lineHeight: 1.65,
            color: TS,
            maxWidth: 620,
            margin: "0 auto",
          }}>
            {t("ptHeroSub")}
          </p>
        </section>

        {/* ===== PILLARS GRID — taped paper cards ===== */}
        <section style={{ position: "relative", padding: "24px 24px 48px", maxWidth: 1200, margin: "0 auto" }}>
          <div className="pt-decor" style={{ position: "absolute", top: 6, insetInlineStart: 34 }}>
            <PaperBall size={30} rot={24} />
          </div>
          <div className="pt-decor" style={{ position: "absolute", bottom: 14, insetInlineEnd: 44 }}>
            <PaperBall size={38} rot={-30} />
          </div>

          <div style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 22,
          }}>
            {PILLAR_KEYS.map((pillar, i) => (
              <div key={i} style={{
                position: "relative",
                flex: "1 1 280px",
                maxWidth: 360,
                background: C1,
                border: `1px solid ${B}`,
                borderRadius: 14,
                padding: "30px 24px 26px",
                boxShadow: "0 10px 26px -18px rgba(41,33,21,0.35)",
                transform: `rotate(${CARD_ROT[i % CARD_ROT.length]}deg)`,
                transition: "transform 0.25s ease, box-shadow 0.25s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "rotate(0deg) translateY(-3px)";
                e.currentTarget.style.boxShadow = "0 16px 32px -18px rgba(41,33,21,0.45)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = `rotate(${CARD_ROT[i % CARD_ROT.length]}deg)`;
                e.currentTarget.style.boxShadow = "0 10px 26px -18px rgba(41,33,21,0.35)";
              }}
              >
                {/* Masking-tape strip pinning the card to the page. */}
                <div aria-hidden style={{
                  position: "absolute",
                  top: -9,
                  left: "50%",
                  transform: `translateX(-50%) rotate(${i % 2 === 0 ? -2 : 2}deg)`,
                  width: 58,
                  height: 17,
                  background: "rgba(214,196,150,0.55)",
                  border: "1px solid rgba(66,53,33,0.10)",
                  borderRadius: 2,
                }} />
                <h3 style={{
                  fontFamily: SERIF,
                  fontSize: 18,
                  fontWeight: 700,
                  color: T,
                  marginBottom: 10,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.3,
                }}>
                  {t(pillar.title)}
                </h3>
                <p style={{
                  fontSize: 14,
                  fontWeight: 400,
                  color: TS,
                  lineHeight: 1.65,
                  margin: 0,
                }}>
                  {t(pillar.desc)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== WHAT WE NEVER DO — a crumpled paper pact ===== */}
        <section style={{ position: "relative", padding: "20px 24px 48px" }}>
          <div className="pt-decor" style={{ position: "absolute", top: 40, insetInlineEnd: "8%", zIndex: 2 }}>
            <StickyNote
              ar={ar}
              text={ar ? "الذكاء لا يتدرب على نصك" : "AI never trains on you"}
              size={100}
              rot={-5}
            />
          </div>

          <div style={{
            maxWidth: 880,
            margin: "0 auto",
            borderRadius: 20,
            border: `1px solid ${B}`,
            // Faris's real crumpled-paper photo under a cream wash — the
            // pact reads like a promise written on rescued paper.
            backgroundImage: "linear-gradient(rgba(246,240,226,0.55), rgba(246,240,226,0.55)), url(/images/crumpled-paper.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            boxShadow: "0 18px 40px -24px rgba(41,33,21,0.4)",
            padding: "40px 28px 34px",
          }}>
            {/* The pact card is REAL light paper on the dark desk, so
                everything inside it stays ink-dark on purpose. */}
            <div style={{ textAlign: "center", marginBottom: 26 }}>
              <p style={{
                fontFamily: "'Courier New', monospace",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#a13c2c",
                marginBottom: 12,
              }}>
                {t("ptPromisesEyebrow")}
              </p>
              <h2 style={{
                fontFamily: SERIF,
                fontSize: "clamp(1.9rem, 4vw, 2.8rem)",
                fontWeight: 700,
                color: "#2f2618",
                letterSpacing: "-0.02em",
                lineHeight: 1.12,
                marginBottom: 8,
              }}>
                {t("ptNeverTitle")}
              </h2>
              <p style={{
                fontFamily: HAND,
                fontSize: 19,
                color: "#a13c2c",
                margin: "0 0 10px",
                transform: "rotate(-0.5deg)",
                display: "inline-block",
              }}>
                {ar ? "(وعود مكتوبة، لا كلام تسويق)" : "(promises in writing, not marketing)"}
              </p>
              <p style={{
                fontSize: 15.5,
                color: "#6d6354",
                lineHeight: 1.6,
                maxWidth: 520,
                margin: "0 auto",
              }}>
                {t("ptNeverSub")}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 720, margin: "0 auto" }}>
              {NEVER_KEYS.map((item, i) => (
                <div key={i} style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "13px 18px",
                  background: "rgba(255,253,247,0.85)",
                  border: "1px solid rgba(66,53,33,0.1)",
                  borderRadius: 12,
                }}>
                  <span style={{
                    flexShrink: 0,
                    marginTop: 2,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "rgba(161,60,44,0.12)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <XIcon size={11} color="#a13c2c" strokeWidth={3} />
                  </span>
                  <p style={{
                    fontSize: 15,
                    color: "#2f2618",
                    lineHeight: 1.55,
                    margin: 0,
                    fontWeight: 400,
                  }}>
                    {t(item)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== TECHNICAL TRANSPARENCY ===== */}
        <section style={{ position: "relative", padding: "24px 24px 48px", maxWidth: 880, margin: "0 auto" }}>
          <div className="pt-decor" style={{ position: "absolute", top: 66, insetInlineStart: -74 }}>
            <PaperBall size={34} rot={12} />
          </div>

          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <p style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: TD,
              marginBottom: 12,
            }}>
              {t("ptTransparencyEyebrow")}
            </p>
            <h2 style={{
              fontFamily: SERIF,
              fontSize: "clamp(1.9rem, 4vw, 2.8rem)",
              fontWeight: 700,
              color: T,
              letterSpacing: "-0.02em",
              lineHeight: 1.12,
              marginBottom: 8,
            }}>
              {t("ptTransparencyTitle")}
            </h2>
            <p style={{
              fontFamily: HAND,
              fontSize: 19,
              color: ACC,
              margin: "0 0 10px",
              transform: "rotate(0.4deg)",
              display: "inline-block",
            }}>
              {ar ? "(التفاصيل التقنية، بصراحة)" : "(the boring details, honestly)"}
            </p>
            <p style={{
              fontSize: 15.5,
              color: TS,
              lineHeight: 1.6,
              maxWidth: 520,
              margin: "0 auto",
            }}>
              {t("ptTransparencySub")}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {TECH_KEYS.map((b) => (
              <TechBlock key={b.title} title={t(b.title)} text={t(b.text)} serif={SERIF} />
            ))}
          </div>
        </section>

        {/* ===== DMCA / COPYRIGHT ===== */}
        <section style={{ position: "relative", padding: "20px 24px 48px" }}>
          <div className="pt-decor" style={{ position: "absolute", bottom: 26, insetInlineEnd: "10%", zIndex: 2 }}>
            <StickyNote
              ar={ar}
              text={ar ? "حقوقك؟ نحن معك" : "we fight for your rights"}
              size={96}
              rot={4}
            />
          </div>
          <div className="pt-decor" style={{ position: "absolute", top: 30, insetInlineStart: "12%" }}>
            <PaperBall size={26} rot={-8} />
          </div>

          <div style={{
            maxWidth: 720,
            margin: "0 auto",
            textAlign: "center",
            background: C1,
            border: `1px solid ${B}`,
            borderRadius: 18,
            padding: "38px 28px",
            boxShadow: "0 14px 32px -22px rgba(41,33,21,0.4)",
          }}>
            <h2 style={{
              fontFamily: SERIF,
              fontSize: "clamp(1.7rem, 3.5vw, 2.3rem)",
              fontWeight: 700,
              color: T,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              marginBottom: 14,
            }}>
              {t("ptDmcaTitle")}
            </h2>
            <p style={{
              fontSize: 15.5,
              color: TS,
              lineHeight: 1.65,
              marginBottom: 24,
            }}>
              {t("ptDmcaBody")}
            </p>
            <a
              href="mailto:legal@plotzy.co?subject=DMCA%20Takedown%20Request"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 28px",
                borderRadius: 999,
                background: PAPER,
                color: ESP,
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
                transition: "transform 0.2s",
                boxShadow: "0 8px 20px -10px rgba(0,0,0,0.55)",
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.04)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              {t("ptSendDmca")}
            </a>
          </div>
        </section>

        {/* ===== CTA FOOTER ===== */}
        <section style={{ padding: "24px 24px 72px", textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: SERIF,
            fontSize: "clamp(1.7rem, 3.5vw, 2.3rem)",
            fontWeight: 700,
            color: T,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            marginBottom: 10,
          }}>
            {t("ptCtaTitle")}
          </h2>
          <p style={{
            fontSize: 15.5,
            color: TS,
            lineHeight: 1.65,
            marginBottom: 24,
          }}>
            {t("ptCtaSub")}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 28px",
              borderRadius: 999,
              background: PAPER,
              color: ESP,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
              boxShadow: "0 8px 20px -10px rgba(0,0,0,0.55)",
            }}>
              {t("abStartWriting")} <ArrowRight style={{ width: 16, height: 16, transform: isRTL ? "scaleX(-1)" : undefined }} />
            </Link>
            <Link href="/privacy" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 28px",
              borderRadius: 999,
              background: C1,
              border: `1px solid ${B}`,
              color: TS,
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
            }}>
              {t("ptReadPrivacy")}
            </Link>
            <Link href="/terms" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 28px",
              borderRadius: 999,
              background: C1,
              border: `1px solid ${B}`,
              color: TS,
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
            }}>
              {t("ptReadTerms")}
            </Link>
          </div>
        </section>

      </div>
    </Layout>
  );
}

function TechBlock({ title, text, serif }: { title: string; text: string; serif: string }) {
  return (
    <div style={{
      padding: "22px 24px",
      background: C1,
      border: `1px solid ${B}`,
      borderRadius: 14,
      boxShadow: "0 8px 22px -18px rgba(41,33,21,0.35)",
    }}>
      <h3 style={{
        fontFamily: serif,
        fontSize: 17,
        fontWeight: 700,
        color: T,
        marginBottom: 8,
        letterSpacing: "-0.01em",
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: 14.5,
        color: TS,
        lineHeight: 1.65,
        margin: 0,
      }}>
        {text}
      </p>
    </div>
  );
}
