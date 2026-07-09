import { Link } from "wouter";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/language-context";
import type { TranslationKey } from "@/lib/i18n";

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif";

const PILLAR_KEYS: { title: TranslationKey; desc: TranslationKey }[] = [
  { title: "abP1T", desc: "abP1D" },
  { title: "abP2T", desc: "abP2D" },
  { title: "abP3T", desc: "abP3D" },
  { title: "abP4T", desc: "abP4D" },
  { title: "abP5T", desc: "abP5D" },
  { title: "abP6T", desc: "abP6D" },
  { title: "abP7T", desc: "abP7D" },
  { title: "abP8T", desc: "abP8D" },
];

export default function About() {
  const { t, lang } = useLanguage();
  const ar = lang === "ar";
  return (
    <Layout>
      <SEO
        title={t("abSeoTitle")}
        description={t("abSeoDesc")}
      />

      <div className={"plotzy-legal" + (ar ? " is-ar" : "")} style={{ minHeight: "100vh", background: "#f4efe2", color: "#2f2618" }}>

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
            background: "rgba(255,253,247,0.9)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(66,53,33,0.15)",
            color: "#423521",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.2s",
            fontFamily: SF,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(246,240,225,0.98)";
            e.currentTarget.style.borderColor = "rgba(66,53,33,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,253,247,0.9)";
            e.currentTarget.style.borderColor = "rgba(66,53,33,0.15)";
          }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          {t("abBack")}
        </button>

        {/* ===== HERO ===== */}
        <section style={{ padding: "80px 24px 40px", textAlign: "center", maxWidth: 880, margin: "0 auto" }}>
          <p style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#7b7366",
            marginBottom: 20,
          }}>
            {t("abEyebrow")}
          </p>
          <h1 style={{
            fontSize: "clamp(2.4rem, 5.5vw, 4rem)",
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            color: "#2f2618",
            marginBottom: 24,
          }}>
            {t("abHeroTitle")}
          </h1>
          <p style={{
            fontSize: "clamp(1rem, 1.5vw, 1.25rem)",
            fontWeight: 400,
            lineHeight: 1.6,
            color: "#6d6354",
            maxWidth: 640,
            margin: "0 auto",
          }}>
            {t("abHeroSub")}
          </p>
        </section>

        {/* ===== THE STORY ===== */}
        <section style={{ padding: "32px 24px 60px", maxWidth: 760, margin: "0 auto" }}>
          <p style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#8a8070",
            marginBottom: 16,
            textAlign: "center",
          }}>
            {t("abStoryEyebrow")}
          </p>
          <h2 style={{
            fontSize: "clamp(1.8rem, 3.4vw, 2.6rem)",
            fontWeight: 800,
            color: "#2f2618",
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            marginBottom: 28,
            textAlign: "center",
          }}>
            {t("abStoryTitle")}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "#4a4132", margin: 0 }}>
              {t("abStory1")}
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "#4a4132", margin: 0 }}>
              {t("abStory2")}
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "#4a4132", margin: 0 }}>
              {t("abStory3")}
            </p>
          </div>
        </section>

        {/* ===== WHAT MAKES PLOTZY DIFFERENT ===== */}
        <section style={{ padding: "60px 24px", background: "#f4efe2" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <p style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#8a8070",
                marginBottom: 16,
              }}>
                {t("abDiffEyebrow")}
              </p>
              <h2 style={{
                fontSize: "clamp(1.8rem, 3.4vw, 2.6rem)",
                fontWeight: 800,
                color: "#2f2618",
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
                marginBottom: 16,
              }}>
                {t("abDiffTitle")}
              </h2>
              <p style={{
                fontSize: 16,
                color: "#7b7366",
                lineHeight: 1.6,
                maxWidth: 560,
                margin: "0 auto",
              }}>
                {t("abDiffSub")}
              </p>
            </div>

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
                  background: "#fffdf7",
                  border: "1px solid rgba(66,53,33,0.13)",
                  borderRadius: 20,
                  padding: "28px 24px",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f6f0e1";
                  e.currentTarget.style.borderColor = "rgba(66,53,33,0.22)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#fffdf7";
                  e.currentTarget.style.borderColor = "rgba(66,53,33,0.13)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
                >
                  <h3 style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: "#2f2618",
                    marginBottom: 10,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.3,
                  }}>
                    {t(pillar.title)}
                  </h3>
                  <p style={{
                    fontSize: 14,
                    fontWeight: 400,
                    color: "#6d6354",
                    lineHeight: 1.6,
                    margin: 0,
                  }}>
                    {t(pillar.desc)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== THE VISION ===== */}
        <section style={{ padding: "60px 24px", maxWidth: 760, margin: "0 auto" }}>
          <p style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#7b5e3b",
            marginBottom: 16,
            textAlign: "center",
          }}>
            {t("abVisionEyebrow")}
          </p>
          <h2 style={{
            fontSize: "clamp(1.8rem, 3.4vw, 2.6rem)",
            fontWeight: 800,
            color: "#2f2618",
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            marginBottom: 28,
            textAlign: "center",
          }}>
            {t("abVisionTitle")}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "#4a4132", margin: 0 }}>
              {t("abVision1")}
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "#4a4132", margin: 0 }}>
              {t("abVision2")}
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "#4a4132", margin: 0 }}>
              {t("abVision3")}
            </p>
          </div>
        </section>

        {/* ===== THE FOUNDER ===== */}
        <section style={{ padding: "60px 24px", background: "#f4efe2" }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <p style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#8a8070",
              marginBottom: 16,
              textAlign: "center",
            }}>
              {t("abFounderEyebrow")}
            </p>
            <h2 style={{
              fontSize: "clamp(1.8rem, 3.4vw, 2.6rem)",
              fontWeight: 800,
              color: "#2f2618",
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              marginBottom: 28,
              textAlign: "center",
            }}>
              {t("abFounderName")}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: "#4a4132", margin: 0 }}>
                {t("abFounder1")}
              </p>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: "#4a4132", margin: 0 }}>
                {t("abFounder2a")} {" "}
                <a href="mailto:hello@plotzy.co" style={{ color: "#2f2618", textDecoration: "underline", textDecorationColor: "rgba(66,53,33,0.35)", textUnderlineOffset: 4 }}>
                  hello@plotzy.co
                </a>
                {t("abFounder2b")}
              </p>
            </div>
          </div>
        </section>

        {/* ===== THE LOGO ===== */}
        <section style={{ padding: "60px 24px", maxWidth: 760, margin: "0 auto" }}>
          <p style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#8a8070",
            marginBottom: 16,
            textAlign: "center",
          }}>
            {t("abLogoEyebrow")}
          </p>
          <h2 style={{
            fontSize: "clamp(1.8rem, 3.4vw, 2.6rem)",
            fontWeight: 800,
            color: "#2f2618",
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            marginBottom: 28,
            textAlign: "center",
          }}>
            {t("abLogoTitle")}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "#4a4132", margin: 0 }}>
              {t("abLogo1")}
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "#4a4132", margin: 0 }}>
              {t("abLogo2")}
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "#4a4132", margin: 0 }}>
              {t("abLogo3")}
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "#4a4132", margin: 0 }}>
              {t("abLogo4")}
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "#4a4132", margin: 0, fontStyle: "italic" }}>
              {t("abLogo5")}
            </p>
          </div>
        </section>

        {/* ===== CTA FOOTER ===== */}
        <section style={{ padding: "60px 24px 80px", textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{
            fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)",
            fontWeight: 800,
            color: "#2f2618",
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            marginBottom: 16,
          }}>
            {t("abCtaTitle")}
          </h2>
          <p style={{
            fontSize: 16,
            color: "#6d6354",
            lineHeight: 1.65,
            marginBottom: 28,
          }}>
            {t("abCtaSub")}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 28px",
              borderRadius: 999,
              background: "#292115",
              color: "#f7f2e4",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
            }}>
              {t("abStartWriting")} <ArrowRight style={{ width: 16, height: 16 }} />
            </Link>
            <Link href="/protection" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 28px",
              borderRadius: 999,
              background: "#f6f0e1",
              border: "1px solid rgba(66,53,33,0.2)",
              color: "#423521",
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
            }}>
              {t("abReadProtection")}
            </Link>
          </div>
        </section>

      </div>
    </Layout>
  );
}
