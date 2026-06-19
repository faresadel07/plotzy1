// /voices/credits — the project-wide credits page.
//
// Aggregates every photo and video attribution across every loaded
// VoiceProfile so a single page satisfies the licence-attribution
// requirement of Wikimedia Commons and the embedded video channels.
// Rendered as a long table so it is honest, not pretty.

import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/language-context";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { VOICES } from "@/data/voices";

const SF =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export default function VoicesCreditsPage() {
  const { lang, isRTL } = useLanguage();
  const ar = lang === "ar";

  // Photo credits, one row per profile.
  const photoRows = VOICES.map((v) => ({
    slug: v.slug,
    subject: ar ? v.name.ar : v.name.en,
    credit: v.photo.credit,
    license: v.photo.license,
    sourceUrl: v.photo.sourceUrl,
  }));

  // Video credits, one row per video.
  const videoRows = VOICES.flatMap((v) =>
    (v.videos ?? []).map((vid) => ({
      slug: v.slug,
      subject: ar ? v.name.ar : v.name.en,
      title: ar ? vid.title.ar : vid.title.en,
      channel: vid.channel,
      youtubeId: vid.youtubeId,
    })),
  );

  return (
    <Layout>
      <SEO
        title={ar ? "المصادر والمشاركات | بلوتزي" : "Sources and credits | Plotzy"}
        description={
          ar
            ? "صفحة المصادر لكل الصور والفيديوهات في قسم الأصوات."
            : "Sources page for every photo and video used in Voices."
        }
      />
      <div
        dir={isRTL ? "rtl" : "ltr"}
        style={{
          fontFamily: SF,
          background: "var(--background, #000)",
          color: "#fff",
          minHeight: "100vh",
          padding: "32px 24px 80px",
        }}
      >
        <div
          style={{
            maxWidth: 800,
            margin: "0 auto",
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
              marginBottom: 28,
            }}
          >
            <ArrowLeft size={13} />
            {ar ? "كل الأصوات" : "All voices"}
          </Link>

          <h1
            style={{
              fontSize: "clamp(28px, 3.8vw, 38px)",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              margin: 0,
              marginBottom: 14,
            }}
          >
            {ar ? "المصادر والمشاركات" : "Sources and credits"}
          </h1>
          <p
            style={{
              fontSize: 14.5,
              lineHeight: 1.75,
              color: "rgba(255,255,255,0.62)",
              margin: 0,
              marginBottom: 32,
              maxWidth: 640,
            }}
          >
            {ar
              ? "كل صورة في قسم الأصوات مأخوذة من Wikimedia Commons أو مصدر مشابه بترخيص مفتوح. كل فيديو مضمّن مباشرة من قناة رسميّة على YouTube. النص الكامل في كل بروفايل مكتوب من قبلنا، ولا يُنسخ من أي مصدر."
              : "Every photo in Voices comes from Wikimedia Commons or a similarly licensed source. Every video is embedded straight from an official YouTube channel. The full prose in each profile is written by us and copied from no other source."}
          </p>

          {VOICES.length === 0 && (
            <div
              style={{
                padding: "24px 18px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 14,
                color: "rgba(255,255,255,0.55)",
                fontSize: 13.5,
                lineHeight: 1.7,
              }}
            >
              {ar
                ? "البروفايلات الأولى لم تُنشر بعد. ستظهر مصادرها هنا تلقائيّاً فور إضافتها."
                : "The first profiles have not been published yet. Sources will appear here automatically as soon as the data lands."}
            </div>
          )}

          {/* Photos */}
          {photoRows.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <h2
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.55)",
                  margin: 0,
                  marginBottom: 14,
                }}
              >
                {ar ? "الصور" : "Photographs"}
              </h2>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12.5,
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
                    <Th>{ar ? "الكاتب" : "Subject"}</Th>
                    <Th>{ar ? "المصوّر / المصدر" : "Photographer / source"}</Th>
                    <Th>{ar ? "الترخيص" : "Licence"}</Th>
                    <Th>{ar ? "الصفحة" : "Page"}</Th>
                  </tr>
                </thead>
                <tbody>
                  {photoRows.map((r, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <Td>
                        <Link href={`/voices/${r.slug}`}>
                          <span style={{ color: "#fff", fontWeight: 500 }}>
                            {r.subject}
                          </span>
                        </Link>
                      </Td>
                      <Td>{r.credit}</Td>
                      <Td>{r.license}</Td>
                      <Td>
                        <a
                          href={r.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "rgba(255,255,255,0.72)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {ar ? "افتح" : "Open"}
                          <ExternalLink size={10} />
                        </a>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Videos */}
          {videoRows.length > 0 && (
            <section>
              <h2
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.55)",
                  margin: 0,
                  marginBottom: 14,
                }}
              >
                {ar ? "مقاطع الفيديو" : "Videos"}
              </h2>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12.5,
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
                    <Th>{ar ? "الكاتب" : "Subject"}</Th>
                    <Th>{ar ? "العنوان" : "Title"}</Th>
                    <Th>{ar ? "القناة" : "Channel"}</Th>
                    <Th>YouTube</Th>
                  </tr>
                </thead>
                <tbody>
                  {videoRows.map((r, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <Td>
                        <Link href={`/voices/${r.slug}`}>
                          <span style={{ color: "#fff", fontWeight: 500 }}>
                            {r.subject}
                          </span>
                        </Link>
                      </Td>
                      <Td>{r.title}</Td>
                      <Td>{r.channel}</Td>
                      <Td>
                        <a
                          href={`https://www.youtube.com/watch?v=${r.youtubeId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "rgba(255,255,255,0.72)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {ar ? "افتح" : "Open"}
                          <ExternalLink size={10} />
                        </a>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </div>
    </Layout>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "start",
        padding: "10px 8px",
        fontSize: 11,
        fontWeight: 700,
        color: "rgba(255,255,255,0.55)",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        padding: "12px 8px",
        color: "rgba(255,255,255,0.78)",
        lineHeight: 1.5,
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}
