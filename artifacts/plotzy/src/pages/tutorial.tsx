import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { JsonLd } from "@/components/JsonLd";
import { buildBreadcrumbSchema } from "@/lib/seo-schema";
import { Play, X, Image as ImageIcon, Film, Check } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import type { TranslationKey } from "@/lib/i18n";
import {
  FEATURED_VIDEO,
  TUTORIAL_GUIDES,
  type TutorialGuide,
} from "@/data/tutorial-guides";

const SF = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif";
const BG = "#000";
const C2 = "#111";
const C3 = "#1a1a1a";
const B = "rgba(255,255,255,0.07)";
const T = "#fff";
const TS = "rgba(255,255,255,0.55)";
const TD = "rgba(255,255,255,0.25)";

const CATEGORIES: { id: string; labelKey: TranslationKey }[] = [
  { id: "all", labelKey: "tuCatAll" },
  { id: "getting-started", labelKey: "tuCatGettingStarted" },
  { id: "writing", labelKey: "tuCatWriting" },
  { id: "ai-tools", labelKey: "tuCatAiTools" },
  { id: "publishing", labelKey: "tuCatPublishing" },
  { id: "cover-design", labelKey: "tuCatCoverDesign" },
  { id: "community", labelKey: "tuCatCommunity" },
  { id: "advanced", labelKey: "tuCatAdvanced" },
];

function toEmbedUrl(url: string): string {
  // YouTube: watch?v=ID, youtu.be/ID, shorts/ID, live/ID
  let m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]+)/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  if (url.includes("youtube.com/embed/")) return url;
  // Vimeo
  m = url.match(/vimeo\.com\/(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  if (url.includes("player.vimeo.com/video/")) return url;
  return url;
}

// Pull the language-correct field off a bilingual block. Returns the
// Arabic copy when the user is on AR, English otherwise. Used dozens
// of times below, so the lookup gets its own helper.
function pickLang<T>(v: { en: T; ar: T }, lang: string): T {
  return lang === "ar" ? v.ar : v.en;
}

/* ─── Featured video card ─── */
function FeaturedVideoCard({ onOpen }: { onOpen: () => void }) {
  const { t, lang } = useLanguage();
  const [hovered, setHovered] = useState(false);
  if (!FEATURED_VIDEO.url) return null;

  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{
        fontFamily: SF,
        fontSize: 12,
        fontWeight: 600,
        color: TS,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 12,
      }}>
        {t("tuFeaturedVideo")}
      </div>

      <div
        onClick={onOpen}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: C2,
          borderRadius: 16,
          border: `1px solid ${hovered ? "rgba(255,255,255,0.15)" : B}`,
          overflow: "hidden",
          cursor: "pointer",
          transition: "border-color 0.2s, transform 0.2s",
        }}
      >
        {/* Big poster */}
        <div style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16/9",
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{
            width: 76,
            height: 76,
            borderRadius: "50%",
            background: hovered ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(6px)",
            transition: "background 0.2s",
          }}>
            <Play size={28} color={T} fill={T} style={{ marginLeft: 4 }} />
          </div>

          <span style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: SF,
            color: T,
          }}>
            {FEATURED_VIDEO.duration}
          </span>
        </div>

        <div style={{ padding: "18px 22px 22px" }}>
          <h2 style={{
            fontFamily: SF,
            fontSize: 19,
            fontWeight: 700,
            color: T,
            margin: 0,
            marginBottom: 6,
            letterSpacing: "-0.02em",
          }}>
            {pickLang(FEATURED_VIDEO.title, lang)}
          </h2>
          <p style={{
            fontFamily: SF,
            fontSize: 13.5,
            color: TS,
            margin: 0,
            lineHeight: 1.6,
            maxWidth: 640,
          }}>
            {pickLang(FEATURED_VIDEO.description, lang)}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Photo / Video Guide card ─── */
function GuideCard({ guide, onClick }: { guide: TutorialGuide; onClick: () => void }) {
  const { t, lang } = useLanguage();
  const [hovered, setHovered] = useState(false);
  // A guide can carry a video, a list of images, or both. Prefer the
  // video as the card thumbnail when present — autoplaying-muted-loop
  // it gives the strongest hint of what the section actually does.
  // Fall back to the first screenshot, then to an icon placeholder.
  const cover = guide.images?.[0];
  const imageCount = guide.images?.length ?? 0;
  const stepBadge = guide.video
    ? t("tuVideo")
    : imageCount === 1
      ? t("tuOneImage")
      : t("tuNImages").replace("{n}", String(imageCount));

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C2,
        borderRadius: 12,
        border: `1px solid ${hovered ? "rgba(255,255,255,0.15)" : B}`,
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.2s, transform 0.2s",
        transform: hovered ? "translateY(-2px)" : "none",
      }}
    >
      {/* Cover — video loop when available, otherwise the first screenshot. */}
      <div style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16/9",
        background: C3,
        overflow: "hidden",
        borderRadius: "12px 12px 0 0",
      }}>
        {guide.video ? (
          <video
            src={guide.video.src}
            poster={guide.video.poster}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : cover ? (
          <img
            src={cover.src}
            alt={pickLang(cover.alt, lang)}
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ImageIcon size={28} color={TD} />
          </div>
        )}

        {/* Step count / video badge */}
        <span style={{
          position: "absolute",
          top: 10,
          right: 10,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
          borderRadius: 6,
          padding: "3px 9px",
          fontSize: 11,
          fontWeight: 600,
          fontFamily: SF,
          color: T,
          letterSpacing: "0.02em",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}>
          {guide.video && <Film size={11} />}
          {stepBadge}
        </span>
      </div>

      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{
          fontFamily: SF,
          fontSize: 14,
          fontWeight: 600,
          color: T,
          marginBottom: 8,
          lineHeight: 1.3,
        }}>
          {pickLang(guide.title, lang)}
        </div>
        <span style={{
          display: "inline-block",
          background: "rgba(255,255,255,0.06)",
          border: `1px solid ${B}`,
          borderRadius: 20,
          padding: "2px 10px",
          fontSize: 11,
          fontWeight: 500,
          fontFamily: SF,
          color: TS,
          marginBottom: 8,
        }}>
          {(() => { const c = CATEGORIES.find(c => c.id === guide.category); return c ? t(c.labelKey) : guide.category; })()}
        </span>
        <div style={{
          fontFamily: SF,
          fontSize: 12.5,
          color: TD,
          lineHeight: 1.55,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as any,
          overflow: "hidden",
        }}>
          {pickLang(guide.description, lang)}
        </div>
      </div>
    </div>
  );
}

/* ─── Video Modal (cinema) ─── */
function VideoModal({ onClose }: { onClose: () => void }) {
  const { lang } = useLanguage();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!FEATURED_VIDEO.url) return null;
  const embedUrl = toEmbedUrl(FEATURED_VIDEO.url);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 960, position: "relative" }}>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: -48,
            right: 0,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "50%",
            width: 38,
            height: 38,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={18} color={T} />
        </button>

        <div style={{
          width: "100%",
          aspectRatio: "16/9",
          borderRadius: 14,
          overflow: "hidden",
          background: "#000",
          border: `1px solid ${B}`,
        }}>
          <iframe
            src={embedUrl}
            title={pickLang(FEATURED_VIDEO.title, lang)}
            style={{ width: "100%", height: "100%", border: "none" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        <div style={{ marginTop: 20 }}>
          <h2 style={{
            fontFamily: SF,
            fontSize: 20,
            fontWeight: 700,
            color: T,
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}>
            {pickLang(FEATURED_VIDEO.title, lang)}
          </h2>
          <p style={{
            fontFamily: SF,
            fontSize: 14,
            color: TS,
            lineHeight: 1.7,
            margin: 0,
            maxWidth: 700,
          }}>
            {pickLang(FEATURED_VIDEO.description, lang)}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Photo Guide Modal — vertical scroll of all steps ─── */
function GuideModal({ guide, onClose }: { guide: TutorialGuide; onClose: () => void }) {
  const { t, lang } = useLanguage();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(14px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflowY: "auto",
        padding: "60px 16px 60px",
      }}
    >
      <div style={{
        width: "100%",
        maxWidth: 920,
        position: "relative",
      }}>
        {/* Close button — sticks to the top-right of the viewport so it
            stays reachable while the user scrolls a long guide. */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "fixed",
            top: 18,
            right: 18,
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "50%",
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 2,
            transition: "background 0.2s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.22)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)"; }}
        >
          <X size={18} color={T} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <span style={{
            display: "inline-block",
            background: "rgba(255,255,255,0.06)",
            border: `1px solid ${B}`,
            borderRadius: 20,
            padding: "3px 12px",
            fontSize: 11,
            fontWeight: 500,
            fontFamily: SF,
            color: TS,
            marginBottom: 14,
          }}>
            {(() => { const c = CATEGORIES.find(c => c.id === guide.category); return c ? t(c.labelKey) : guide.category; })()}
          </span>
          <h2 style={{
            fontFamily: SF,
            fontSize: "clamp(22px, 3.4vw, 28px)",
            fontWeight: 700,
            color: T,
            margin: 0,
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}>
            {pickLang(guide.title, lang)}
          </h2>
          <p style={{
            fontFamily: SF,
            fontSize: 14.5,
            color: TS,
            lineHeight: 1.65,
            margin: "0 auto",
            maxWidth: 620,
          }}>
            {pickLang(guide.description, lang)}
          </p>
        </div>

        {/* Video + features layout. Side-by-side on desktop, stacked
            on mobile. The video uses autoplay-muted-loop so a silent
            screen recording reads like an animated illustration. */}
        {(guide.video || (guide.features && guide.features.length > 0)) && (
          <>
            <style>{`
              .plotzy-guide-split {
                display: grid;
                grid-template-columns: ${guide.video && guide.features?.length ? "1.15fr 1fr" : "1fr"};
                gap: 28px;
                align-items: start;
                margin-bottom: ${guide.images?.length ? "40px" : "0"};
              }
              @media (max-width: 820px) {
                .plotzy-guide-split { grid-template-columns: 1fr !important; }
              }
            `}</style>
            <div className="plotzy-guide-split">
              {guide.video && (
                <div style={{
                  background: C2,
                  border: `1px solid ${B}`,
                  borderRadius: 14,
                  overflow: "hidden",
                  // Keep the video readable on huge monitors so a tall
                  // screen recording does not push the feature column
                  // way off the fold.
                  maxHeight: "min(70vh, 640px)",
                }}>
                  <video
                    src={guide.video.src}
                    poster={guide.video.poster}
                    autoPlay
                    muted
                    loop
                    playsInline
                    controls
                    style={{
                      width: "100%",
                      height: "auto",
                      maxHeight: "min(70vh, 640px)",
                      display: "block",
                      objectFit: "contain",
                      background: "#000",
                    }}
                  />
                </div>
              )}

              {guide.features && guide.features.length > 0 && (
                <div>
                  <div style={{
                    fontFamily: SF,
                    fontSize: 11,
                    fontWeight: 600,
                    color: TS,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 14,
                  }}>
                    {t("tuWhatYouCanDo")}
                  </div>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                    {guide.features.map((f) => (
                      <li
                        key={pickLang(f.title, lang)}
                        style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
                      >
                        <div style={{
                          flexShrink: 0,
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: "rgba(124,106,247,0.16)",
                          border: "1px solid rgba(124,106,247,0.32)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginTop: 2,
                        }}>
                          <Check size={12} color="#a78bfa" strokeWidth={3} />
                        </div>
                        <div>
                          <div style={{
                            fontFamily: SF,
                            fontSize: 14.5,
                            fontWeight: 600,
                            color: T,
                            marginBottom: 3,
                            lineHeight: 1.35,
                          }}>
                            {pickLang(f.title, lang)}
                          </div>
                          <div style={{
                            fontFamily: SF,
                            fontSize: 13,
                            color: TS,
                            lineHeight: 1.6,
                          }}>
                            {pickLang(f.body, lang)}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}

        {/* Optional step screenshots — rendered after the video block
            so a guide can mix a walkthrough video with additional
            still-image steps when extra detail helps. */}
        {guide.images && guide.images.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {guide.images.map((img, idx) => (
              <figure
                key={img.src}
                style={{ margin: 0 }}
              >
                {/* Step number pill, omitted when the guide is a single image. */}
                {guide.images && guide.images.length > 1 && (
                  <div style={{
                    fontFamily: SF,
                    fontSize: 11,
                    fontWeight: 600,
                    color: TS,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 8,
                  }}>
                    {t("tuStepN").replace("{n}", String(idx + 1))}
                  </div>
                )}

                <div style={{
                  background: C2,
                  border: `1px solid ${B}`,
                  borderRadius: 14,
                  overflow: "hidden",
                }}>
                  <img
                    src={img.src}
                    alt={pickLang(img.alt, lang)}
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "auto",
                      display: "block",
                    }}
                  />
                </div>

                {img.caption && (
                  <figcaption style={{
                    fontFamily: SF,
                    fontSize: 14,
                    color: TS,
                    lineHeight: 1.65,
                    marginTop: 10,
                  }}>
                    {pickLang(img.caption, lang)}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function TutorialPage() {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState("all");
  const [videoOpen, setVideoOpen] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<TutorialGuide | null>(null);

  const filteredGuides = useMemo(() => {
    if (activeCategory === "all") return TUTORIAL_GUIDES;
    return TUTORIAL_GUIDES.filter(g => g.category === activeCategory);
  }, [activeCategory]);

  // Hide category pills that would land on an empty page. Keeps the
  // filter bar honest: a writer never clicks a pill and gets the
  // "No tutorials in this category" placeholder. "All" always shows.
  const populatedCategories = useMemo(() => {
    const populated = new Set(TUTORIAL_GUIDES.map(g => g.category as string));
    return CATEGORIES.filter(c => c.id === "all" || populated.has(c.id));
  }, []);

  return (
    <Layout isLanding darkNav>
      <SEO
        title={t("tuSeoTitle")}
        description={t("tuSeoDesc")}
      />
      <JsonLd data={buildBreadcrumbSchema([{ name: t("tuBreadcrumb"), path: "/tutorial" }])} />
      <div style={{ fontFamily: SF, background: BG, minHeight: "100vh" }}>

        {/* ─── Hero ─── */}
        <div style={{
          borderBottom: `1px solid ${B}`,
          padding: "56px 24px 36px",
          textAlign: "center",
        }}>
          <h1 style={{
            fontSize: "clamp(28px, 4vw, 42px)",
            fontWeight: 700,
            color: T,
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            margin: "0 auto 14px",
          }}>
            {t("tuLearningCenter")}
          </h1>
          <p style={{
            fontSize: 15,
            color: TS,
            maxWidth: 500,
            margin: "0 auto 28px",
            lineHeight: 1.7,
          }}>
            {t("tuHeroSub")}
          </p>

          {/* Category filter pills */}
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 8,
            maxWidth: 700,
            margin: "0 auto",
          }}>
            {populatedCategories.map(cat => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    fontFamily: SF,
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? T : TS,
                    background: isActive ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isActive ? "rgba(255,255,255,0.2)" : B}`,
                    borderRadius: 20,
                    padding: "6px 16px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {t(cat.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Content ─── */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px clamp(14px, 4vw, 28px) 60px" }}>

          {/* Featured video — only when activeCategory is "all" so it
              doesn't crowd a filtered view that may not include it. */}
          {activeCategory === "all" && (
            <FeaturedVideoCard onOpen={() => setVideoOpen(true)} />
          )}

          {/* Photo guides */}
          {filteredGuides.length > 0 ? (
            <>
              <div style={{
                fontFamily: SF,
                fontSize: 12,
                fontWeight: 600,
                color: TS,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 12,
              }}>
                {t("tuPhotoGuides")}
              </div>
              <style>{`
                .plotzy-tutorial-grid {
                  display: grid;
                  grid-template-columns: repeat(3, 1fr);
                  gap: 20px;
                }
                @media (max-width: 900px) {
                  .plotzy-tutorial-grid { grid-template-columns: repeat(2, 1fr) !important; }
                }
                @media (max-width: 580px) {
                  .plotzy-tutorial-grid { grid-template-columns: 1fr !important; }
                }
              `}</style>
              <div className="plotzy-tutorial-grid">
                {filteredGuides.map(g => (
                  <GuideCard
                    key={g.id}
                    guide={g}
                    onClick={() => setSelectedGuide(g)}
                  />
                ))}
              </div>
            </>
          ) : activeCategory !== "all" ? (
            <div style={{
              textAlign: "center",
              padding: "60px 24px",
              color: TD,
              fontSize: 14,
            }}>
              {t("tuNoCategory")}
            </div>
          ) : (
            // Nothing in TUTORIAL_GUIDES yet AND there is no featured
            // video — show the friendly empty state.
            !FEATURED_VIDEO.url && (
              <div style={{
                textAlign: "center",
                padding: "80px 24px",
                background: C2,
                borderRadius: 16,
                border: `1px solid ${B}`,
              }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: C3,
                  border: `1px solid ${B}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                }}>
                  <Play size={24} color={TD} />
                </div>
                <h3 style={{
                  fontFamily: SF,
                  fontSize: 18,
                  fontWeight: 600,
                  color: T,
                  marginBottom: 8,
                }}>
                  {t("tuNoTutorials")}
                </h3>
                <p style={{
                  fontFamily: SF,
                  fontSize: 14,
                  color: TS,
                  lineHeight: 1.6,
                  maxWidth: 400,
                  margin: "0 auto",
                }}>
                  {t("tuNoTutorialsBody")}
                </p>
              </div>
            )
          )}
        </div>

        {/* Modals */}
        {videoOpen && <VideoModal onClose={() => setVideoOpen(false)} />}
        {selectedGuide && (
          <GuideModal
            guide={selectedGuide}
            onClose={() => setSelectedGuide(null)}
          />
        )}
      </div>
    </Layout>
  );
}
