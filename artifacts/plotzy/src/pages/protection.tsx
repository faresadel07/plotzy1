import { Link } from "wouter";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/language-context";
import type { TranslationKey } from "@/lib/i18n";

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif";

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

export default function Protection() {
  const { t } = useLanguage();
  return (
    <Layout>
      <SEO
        title={t("ptSeoTitle")}
        description={t("ptSeoDesc")}
      />

      <div style={{ minHeight: "100vh", background: "#0A0A0A", color: "#f7f2e4", fontFamily: SF }}>

        {/* ===== BACK BUTTON (fixed, top-left) ===== */}
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
            left: 20,
            zIndex: 50,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderRadius: 999,
            background: "rgba(20,20,20,0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(244,239,226,0.1)",
            color: "rgba(244,239,226,0.85)",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.2s",
            fontFamily: SF,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(35,35,35,0.95)";
            e.currentTarget.style.borderColor = "rgba(244,239,226,0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(20,20,20,0.85)";
            e.currentTarget.style.borderColor = "rgba(244,239,226,0.1)";
          }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          {t("abBack")}
        </button>

        {/* ===== HERO ===== */}
        <section style={{ padding: "60px 24px 32px", textAlign: "center", maxWidth: 880, margin: "0 auto" }}>
          <p style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(244,239,226,0.45)",
            marginBottom: 20,
          }}>
            {t("ptEyebrow")}
          </p>
          <h1 style={{
            fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            color: "#f7f2e4",
            marginBottom: 24,
          }}>
            {t("ptHeroTitle")}
          </h1>
          <p style={{
            fontSize: "clamp(1rem, 1.5vw, 1.25rem)",
            fontWeight: 400,
            lineHeight: 1.6,
            color: "rgba(244,239,226,0.55)",
            maxWidth: 620,
            margin: "0 auto",
          }}>
            {t("ptHeroSub")}
          </p>
        </section>

        {/* ===== PILLARS GRID ===== */}
        <section style={{ padding: "16px 24px 40px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 20,
          }}>
            {PILLAR_KEYS.map((pillar, i) => (
              <div key={i} style={{
                flex: "1 1 280px",
                maxWidth: 360,
                background: "rgba(244,239,226,0.03)",
                border: "1px solid rgba(244,239,226,0.08)",
                borderRadius: 20,
                padding: "28px 24px",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(244,239,226,0.05)";
                e.currentTarget.style.borderColor = "rgba(244,239,226,0.14)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(244,239,226,0.03)";
                e.currentTarget.style.borderColor = "rgba(244,239,226,0.08)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
              >
                <h3 style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#f7f2e4",
                  marginBottom: 10,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.3,
                }}>
                  {t(pillar.title)}
                </h3>
                <p style={{
                  fontSize: 14,
                  fontWeight: 400,
                  color: "rgba(244,239,226,0.55)",
                  lineHeight: 1.6,
                  margin: 0,
                }}>
                  {t(pillar.desc)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== WHAT WE NEVER DO ===== */}
        <section style={{
          padding: "44px 24px",
          background: "#0A0A0A",
        }}>
          <div style={{ maxWidth: 880, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <p style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(255,80,80,0.55)",
                marginBottom: 16,
              }}>
                {t("ptPromisesEyebrow")}
              </p>
              <h2 style={{
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: 800,
                color: "#f7f2e4",
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                marginBottom: 16,
              }}>
                {t("ptNeverTitle")}
              </h2>
              <p style={{
                fontSize: 16,
                color: "rgba(244,239,226,0.5)",
                lineHeight: 1.6,
                maxWidth: 520,
                margin: "0 auto",
              }}>
                {t("ptNeverSub")}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {NEVER_KEYS.map((item, i) => (
                <div key={i} style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  padding: "16px 20px",
                  background: "rgba(244,239,226,0.02)",
                  border: "1px solid rgba(255,80,80,0.12)",
                  borderRadius: 14,
                }}>
                  <span style={{
                    flexShrink: 0,
                    marginTop: 6,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "rgba(255,80,80,0.6)",
                  }} />
                  <p style={{
                    fontSize: 15,
                    color: "rgba(244,239,226,0.78)",
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
        <section style={{ padding: "44px 24px", maxWidth: 880, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <p style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(140,180,255,0.6)",
              marginBottom: 16,
            }}>
              {t("ptTransparencyEyebrow")}
            </p>
            <h2 style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 800,
              color: "#f7f2e4",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              marginBottom: 16,
            }}>
              {t("ptTransparencyTitle")}
            </h2>
            <p style={{
              fontSize: 16,
              color: "rgba(244,239,226,0.5)",
              lineHeight: 1.6,
              maxWidth: 520,
              margin: "0 auto",
            }}>
              {t("ptTransparencySub")}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {TECH_KEYS.map((b) => (
              <TechBlock key={b.title} title={t(b.title)} text={t(b.text)} />
            ))}
          </div>
        </section>

        {/* ===== DMCA / COPYRIGHT ===== */}
        <section style={{
          padding: "44px 24px",
          background: "#0A0A0A",
        }}>
          <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <h2 style={{
              fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)",
              fontWeight: 800,
              color: "#f7f2e4",
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              marginBottom: 16,
            }}>
              {t("ptDmcaTitle")}
            </h2>
            <p style={{
              fontSize: 16,
              color: "rgba(244,239,226,0.55)",
              lineHeight: 1.65,
              marginBottom: 28,
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
                background: "#f7f2e4",
                color: "#221b11",
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.04)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              {t("ptSendDmca")}
            </a>
          </div>
        </section>

        {/* ===== CTA FOOTER ===== */}
        <section style={{ padding: "44px 24px 60px", textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{
            fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)",
            fontWeight: 800,
            color: "#f7f2e4",
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            marginBottom: 16,
          }}>
            {t("ptCtaTitle")}
          </h2>
          <p style={{
            fontSize: 16,
            color: "rgba(244,239,226,0.55)",
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
              background: "#f7f2e4",
              color: "#221b11",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
            }}>
              {t("abStartWriting")} <ArrowRight style={{ width: 16, height: 16 }} />
            </Link>
            <Link href="/privacy" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 28px",
              borderRadius: 999,
              background: "rgba(244,239,226,0.05)",
              border: "1px solid rgba(244,239,226,0.12)",
              color: "rgba(244,239,226,0.85)",
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
              background: "rgba(244,239,226,0.05)",
              border: "1px solid rgba(244,239,226,0.12)",
              color: "rgba(244,239,226,0.85)",
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

function TechBlock({ title, text }: { title: string; text: string }) {
  return (
    <div style={{
      padding: "24px 24px",
      background: "rgba(244,239,226,0.02)",
      border: "1px solid rgba(244,239,226,0.07)",
      borderRadius: 16,
    }}>
      <h3 style={{
        fontSize: 17,
        fontWeight: 700,
        color: "#f7f2e4",
        marginBottom: 8,
        letterSpacing: "-0.01em",
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: 14.5,
        color: "rgba(244,239,226,0.6)",
        lineHeight: 1.65,
        margin: 0,
      }}>
        {text}
      </p>
    </div>
  );
}
