// Voice profile page at /voices/:slug.
//
// Editorial layout. Hero portrait full-width, then a two-column block
// (prose left, works + credits sidebar right) becoming single-column
// on phones. Below the body, a "On film" row of YouTube embeds and a
// "Related voices" cross-link row.
//
// Renders a 404 state when the slug does not match any profile so a
// stale link does not crash the app.

import { Link, useRoute, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/language-context";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getRelatedVoices, getVoiceBySlug, type VoiceProfile } from "@/data/voices";

const SF =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export default function VoiceDetailPage() {
  const { lang, isRTL } = useLanguage();
  const ar = lang === "ar";

  const [, params] = useRoute<{ slug: string }>("/voices/:slug");
  const [, navigate] = useLocation();
  const slug = params?.slug ?? "";
  const voice = getVoiceBySlug(slug);

  if (!voice) return <NotFoundView ar={ar} onBack={() => navigate("/voices")} />;

  const related = getRelatedVoices(voice);

  return (
    <Layout>
      <SEO
        title={`${ar ? voice.name.ar : voice.name.en} | ${ar ? "بلوتزي" : "Plotzy"}`}
        description={ar ? voice.tagline.ar : voice.tagline.en}
      />
      <article
        dir={isRTL ? "rtl" : "ltr"}
        style={{
          fontFamily: SF,
          background: "var(--background, #000)",
          color: "#fff",
          minHeight: "100vh",
        }}
      >
        {/* Back link */}
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "20px 24px 0",
          }}
        >
          <Link
            href="/voices"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12.5,
              color: "rgba(255,255,255,0.55)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={13} />
            {ar ? "كل الأصوات" : "All voices"}
          </Link>
        </div>

        {/* Hero */}
        <header
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "16px 24px 0",
          }}
        >
          <figure
            style={{
              margin: 0,
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "#0a0a0a",
              aspectRatio: "16 / 10",
            }}
          >
            <img
              src={voice.photo.src}
              alt={ar ? voice.photo.alt.ar : voice.photo.alt.en}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </figure>
          <h1
            style={{
              fontSize: "clamp(34px, 4.4vw, 50px)",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1.06,
              margin: "26px 0 10px",
            }}
          >
            {ar ? voice.name.ar : voice.name.en}
          </h1>
          <div
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.55)",
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <span>
              {voice.bornYear}
              {voice.diedYear ? (ar ? `–${voice.diedYear}` : ` to ${voice.diedYear}`) : ar ? " – الآن" : " to present"}
            </span>
            <span aria-hidden style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
            <span>{ar ? voice.nationality.ar : voice.nationality.en}</span>
            {voice.awards?.map((a, i) => (
              <span key={i} style={{ display: "inline-flex", gap: 10 }}>
                <span aria-hidden style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
                <span>{a}</span>
              </span>
            ))}
          </div>
        </header>

        {/* Body + Sidebar */}
        <section
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "30px 24px 28px",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 240px",
            gap: 36,
          }}
          className="plotzy-voice-grid"
        >
          <style>{`
            @media (max-width: 820px) {
              .plotzy-voice-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>

          {/* Body prose */}
          <div>
            <SectionEyebrow>{ar ? "القصّة" : "The story"}</SectionEyebrow>
            <BodyProse text={ar ? voice.body.ar : voice.body.en} />

            {voice.quotes && voice.quotes.length > 0 && (
              <div style={{ marginTop: 28 }}>
                {voice.quotes.map((q, i) => (
                  <blockquote
                    key={i}
                    style={{
                      margin: "16px 0",
                      padding: "0 0 0 16px",
                      borderInlineStart: "2px solid rgba(255,255,255,0.20)",
                      fontSize: 17,
                      lineHeight: 1.7,
                      color: "rgba(255,255,255,0.78)",
                      fontStyle: "italic",
                      direction: q.lang === "ar" ? "rtl" : "ltr",
                    }}
                  >
                    {q.text}
                    {q.source && (
                      <cite
                        style={{
                          display: "block",
                          marginTop: 6,
                          fontStyle: "normal",
                          fontSize: 12,
                          color: "rgba(255,255,255,0.45)",
                        }}
                      >
                        — {q.source}
                      </cite>
                    )}
                  </blockquote>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside>
            {voice.works.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <SectionEyebrow>{ar ? "الأعمال" : "Major works"}</SectionEyebrow>
                <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0" }}>
                  {voice.works.map((w, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: 13,
                        lineHeight: 1.55,
                        color: "rgba(255,255,255,0.78)",
                        padding: "7px 0",
                        borderTop:
                          i === 0
                            ? "1px solid rgba(255,255,255,0.08)"
                            : "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <span style={{ display: "block", fontWeight: 500 }}>
                        {w.title}
                      </span>
                      {(w.translatedTitle || w.year) && (
                        <span
                          style={{
                            fontSize: 11.5,
                            color: "rgba(255,255,255,0.45)",
                          }}
                        >
                          {w.translatedTitle}
                          {w.translatedTitle && w.year ? " · " : ""}
                          {w.year}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Photo credit */}
            <div>
              <SectionEyebrow>{ar ? "المصادر" : "Sources"}</SectionEyebrow>
              <div
                style={{
                  fontSize: 11.5,
                  lineHeight: 1.7,
                  color: "rgba(255,255,255,0.55)",
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ marginBottom: 6 }}>
                  {voice.photo.credit}
                </div>
                <div style={{ marginBottom: 6 }}>
                  {ar ? "الترخيص" : "Licence"}: {voice.photo.license}
                </div>
                <a
                  href={voice.photo.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    color: "rgba(255,255,255,0.72)",
                    textDecoration: "none",
                  }}
                >
                  {ar ? "صفحة المصدر" : "Source page"}
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>
          </aside>
        </section>

        {/* On film */}
        {voice.videos && voice.videos.length > 0 && (
          <section
            style={{
              maxWidth: 960,
              margin: "0 auto",
              padding: "12px 24px 40px",
            }}
          >
            <SectionEyebrow>{ar ? "على الشاشة" : "On film"}</SectionEyebrow>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 18,
                marginTop: 14,
              }}
            >
              {voice.videos.map((v) => (
                <figure
                  key={v.youtubeId}
                  style={{
                    margin: 0,
                    borderRadius: 14,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "#0a0a0a",
                  }}
                >
                  <div style={{ aspectRatio: "16 / 9" }}>
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube-nocookie.com/embed/${v.youtubeId}`}
                      title={ar ? v.title.ar : v.title.en}
                      allow="accelerometer; encrypted-media; picture-in-picture"
                      allowFullScreen
                      style={{ border: 0, display: "block" }}
                    />
                  </div>
                  <figcaption
                    style={{
                      padding: "10px 14px 12px",
                      fontSize: 12.5,
                      color: "rgba(255,255,255,0.72)",
                      lineHeight: 1.55,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "#fff" }}>
                      {ar ? v.title.ar : v.title.en}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.45)",
                        marginTop: 2,
                      }}
                    >
                      {v.channel}
                    </div>
                    {v.note && (
                      <div style={{ marginTop: 6 }}>
                        {ar ? v.note.ar : v.note.en}
                      </div>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* Related voices */}
        {related.length > 0 && (
          <section
            style={{
              maxWidth: 960,
              margin: "0 auto",
              padding: "20px 24px 60px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <SectionEyebrow>
              {ar ? "أصوات قريبة" : "Related voices"}
            </SectionEyebrow>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
                marginTop: 14,
              }}
            >
              {related.map((r) => (
                <Link key={r.slug} href={`/voices/${r.slug}`}>
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      cursor: "pointer",
                      transition: "background 140ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                      {ar ? r.name.ar : r.name.en}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.45)",
                        marginTop: 2,
                      }}
                    >
                      {ar ? r.nationality.ar : r.nationality.en}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </Layout>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.40)",
      }}
    >
      {children}
    </div>
  );
}

/** Body prose renderer. Splits the source text on double-newlines into
 *  paragraphs so the data file stays plain string but the page reads
 *  like proper editorial copy. */
function BodyProse({ text }: { text: string }) {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  return (
    <div style={{ marginTop: 12 }}>
      {paragraphs.map((p, i) => (
        <p
          key={i}
          style={{
            fontSize: 16,
            lineHeight: 1.78,
            color: "rgba(255,255,255,0.85)",
            margin: 0,
            marginBottom: 18,
          }}
        >
          {p.trim()}
        </p>
      ))}
    </div>
  );
}

function NotFoundView({ ar, onBack }: { ar: boolean; onBack: () => void }) {
  return (
    <Layout>
      <SEO title={ar ? "غير موجود" : "Not found"} description="" />
      <div
        style={{
          fontFamily: SF,
          background: "var(--background, #000)",
          color: "#fff",
          minHeight: "100vh",
          padding: "100px 24px",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, marginBottom: 12 }}>
          {ar ? "هذا الصوت غير موجود." : "This voice does not exist."}
        </h1>
        <p style={{ color: "rgba(255,255,255,0.55)", marginBottom: 22 }}>
          {ar
            ? "ربّما حُذف، أو لم يُنشر بعد."
            : "It may have been removed, or has not been published yet."}
        </p>
        <button
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 18px",
            borderRadius: 999,
            background: "#fff",
            color: "#000",
            border: "1px solid #fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={13} />
          {ar ? "العودة إلى الأصوات" : "Back to Voices"}
        </button>
      </div>
    </Layout>
  );
}
