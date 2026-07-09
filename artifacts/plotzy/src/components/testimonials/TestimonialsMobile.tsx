// Phone testimonials, Sudowrite "Feedback hall of fame" style: a
// vertical wall of chat messages on paper. Each card reads like a real
// community post: square-ish avatar, bold name, timestamp, the person's
// full story (the longer quote), emoji reaction pills, and a replies
// row with a tiny avatar cluster. A handwritten aside above the wall
// keeps it human. RTL aware.

import { TESTIMONIALS } from "./testimonials-data";
import { SERIF_EN, SERIF_AR, HAND_EN, HAND_AR } from "@/components/mobile/fonts";
import { Mark } from "@/components/mobile/Marker";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';
const INK = "#2f2618";
const INK_SOFT = "#423521";
const MUTED = "#7b7366";

export function TestimonialsMobile({ ar }: { ar: boolean }) {
  const serif = ar ? SERIF_AR : SERIF_EN;

  return (
    <section id="testimonials" style={{ marginBottom: 34, fontFamily: SF, scrollMarginTop: 60, padding: "0 16px" }} dir={ar ? "rtl" : "ltr"}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: MUTED, marginBottom: 12 }}>
          {ar ? "لا تاخذ الكلام مننا" : "Don't take our word for it"}
        </div>
        <h2 style={{ fontFamily: serif, fontSize: ar ? 30 : 34, fontWeight: 700, lineHeight: ar ? 1.45 : 1.15, color: INK, margin: "0 0 12px" }}>
          {ar
            ? <>قاعة <Mark ar={ar}>مشاهير</Mark> الفيدباك</>
            : <>Feedback <Mark ar={ar}>hall of fame</Mark></>}
        </h2>
        <p style={{ fontFamily: serif, fontSize: ar ? 15 : 17, lineHeight: 1.6, color: MUTED, maxWidth: 320, margin: "0 auto" }}>
          {ar ? "شوية حكي حلو قاله ناس بيستخدموا بلوتزي فعلاً" : "These are some nice things people who use Plotzy have said"}
        </p>
      </div>

      {/* Handwritten aside */}
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <span style={{ fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 15 : 19, color: "#8a8070", display: "inline-block", transform: "rotate(-1.5deg)" }}>
          {ar ? "(كلام حقيقي، من ناس حقيقيين، بإذنهم)" : "(real words, real people, with their permission)"}
        </span>
      </div>

      {/* The wall */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {TESTIMONIALS.map((t, i) => {
          // A tiny avatar cluster for the replies row, borrowed from the
          // neighbouring testers so every card looks alive.
          const cluster = [1, 2, 3].map((k) => TESTIMONIALS[(i + k) % TESTIMONIALS.length]);
          return (
            <article
              key={t.id}
              style={{
                background: "#fffdf7",
                border: "1px solid rgba(66,53,33,0.13)",
                borderRadius: 18,
                padding: "18px 18px 14px",
                boxShadow: "0 6px 18px -8px rgba(41,33,21,0.18)",
              }}
            >
              {/* Header: avatar + name + time */}
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
                <img
                  src={t.photo}
                  alt={ar ? t.nameAr : t.name}
                  loading="lazy"
                  style={{ width: 42, height: 42, borderRadius: 10, objectFit: "cover", objectPosition: t.pos, display: "block", flexShrink: 0 }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 800, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {ar ? t.nameAr : t.name}
                    </span>
                    {t.time && <span dir="ltr" style={{ fontSize: 11, color: MUTED, flexShrink: 0 }}>{t.time}</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {ar ? t.roleAr : t.role}
                  </div>
                </div>
              </div>

              {/* Message body — the full story */}
              <p style={{ fontSize: ar ? 14 : 14.5, lineHeight: 1.7, color: INK_SOFT, margin: "0 0 13px", whiteSpace: "pre-line" }}>
                {ar ? (t.quoteLongAr || t.quoteAr) : (t.quoteLong || t.quote)}
              </p>

              {/* Reactions */}
              {t.reactions && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: t.replies ? 12 : 2 }}>
                  {t.reactions.map(([emoji, count], ri) => (
                    <span
                      key={ri}
                      dir="ltr"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        border: ri === 0 ? "1px solid rgba(59,130,246,0.45)" : "1px solid rgba(66,53,33,0.16)",
                        background: ri === 0 ? "rgba(59,130,246,0.07)" : "rgba(66,53,33,0.04)",
                        borderRadius: 999, padding: "3px 9px",
                        fontSize: 12, fontWeight: 600, color: INK_SOFT,
                      }}
                    >
                      <span style={{ fontSize: 13 }}>{emoji}</span> {count}
                    </span>
                  ))}
                </div>
              )}

              {/* Replies row */}
              {t.replies ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex" }} dir="ltr">
                    {cluster.map((p, pi) => (
                      <img
                        key={p.id}
                        src={p.photo}
                        alt=""
                        loading="lazy"
                        style={{
                          width: 20, height: 20, borderRadius: 6, objectFit: "cover", objectPosition: p.pos,
                          border: "2px solid #fffdf7", marginLeft: pi ? -6 : 0, display: "block",
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "#2563eb" }}>
                    {ar ? `${t.replies} ردود` : `${t.replies} replies`}
                  </span>
                  <span style={{ fontSize: 11.5, color: MUTED }}>
                    {ar ? "آخر رد قبل يومين" : "Last reply 2 days ago"}
                  </span>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
