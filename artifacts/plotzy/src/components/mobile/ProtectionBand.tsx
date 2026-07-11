// Writer Protection band — phone edition.
//
// The same full-bleed espresso sheet as the desktop landing: the ten
// honest protections line by line in a rotation of four faces (SF,
// handwriting, serif, Courier), light-brown type on dark brown, the
// real sticky note, Faris's Severus Snape drawing with its handwritten
// "always." caption, and a plain link into the full /protection page.

import { useLocation } from "wouter";
import { ShieldCheck, ArrowRight, ArrowLeft } from "lucide-react";
import { ESPRESSO } from "./palette";
import { HAND_AR, HAND_EN, SERIF_AR, SERIF_EN } from "./fonts";
import { StickyNote } from "./StickyNote";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export function ProtectionBandMobile({ ar }: { ar: boolean }) {
  const [, navigate] = useLocation();
  const serif = ar ? SERIF_AR : SERIF_EN;
  const hand = ar ? HAND_AR : HAND_EN;
  /* Light browns tuned for the espresso sheet. */
  const TAN = "#e6cda4";
  const TAN_SOFT = "rgba(222,196,155,0.85)";
  const TAN_DIM = "rgba(216,185,140,0.6)";
  const MONO = "'Courier New', monospace";

  const LINES: { f: "sf" | "hand" | "serif" | "mono"; en: string; ar: string }[] = [
    { f: "sf",    en: "Every word you write on Plotzy is 100% yours. We claim nothing.",      ar: "كل كلمة تكتبها في بلوتزي ملكك بالكامل. لا نطالب بأي حق فيها." },
    { f: "hand",  en: "your drafts stay private until YOU hit publish",                       ar: "مسوداتك تبقى خاصة حتى تضغط أنت زر النشر" },
    { f: "serif", en: "Your text never trains any AI model. Not ours, not anyone's.",         ar: "نصك لا يدرّب أي نموذج ذكاء اصطناعي. لا نماذجنا ولا نماذج غيرنا." },
    { f: "mono",  en: "encrypted in transit. encrypted at rest.",                             ar: "مشفر في الطريق. مشفر في التخزين." },
    { f: "sf",    en: "Instant saves and a full version history, so not a word gets lost.",   ar: "حفظ لحظي وسجل إصدارات كامل، فلا تضيع كلمة واحدة." },
    { f: "hand",  en: "export everything, anytime, PDF or DOCX",                              ar: "صدّر كل شيء في أي وقت، PDF أو DOCX" },
    { f: "serif", en: "We never sell your data and never share it with advertisers.",         ar: "لا نبيع بياناتك أبداً ولا نشاركها مع المعلنين." },
    { f: "mono",  en: "delete everything in one click. no questions asked.",                  ar: "احذف كل شيء بضغطة واحدة. بلا أسئلة." },
    { f: "sf",    en: "Collaborators see only the books you invite them into. Nothing else.", ar: "المتعاونون يرون فقط الكتب التي تدعوهم إليها. لا شيء غيرها." },
    { f: "hand",  en: "someone copies your published work? we stand with you",                ar: "أحدهم نسخ عملك المنشور؟ نحن في صفك" },
  ];

  const lineStyle = (f: "sf" | "hand" | "serif" | "mono"): React.CSSProperties => {
    switch (f) {
      case "hand":
        return { fontFamily: hand, fontSize: ar ? 15.5 : 18.5, color: "#d8b98c", transform: "rotate(-0.5deg)" };
      case "serif":
        return { fontFamily: serif, fontSize: ar ? 14 : 15, color: TAN, fontWeight: 600 };
      case "mono":
        return { fontFamily: MONO, fontSize: 12, letterSpacing: "0.03em", color: TAN_DIM, fontWeight: 700 };
      default:
        return { fontFamily: SF, fontSize: 13.5, color: TAN_SOFT };
    }
  };

  return (
    <section
      dir={ar ? "rtl" : "ltr"}
      style={{
        position: "relative",
        background: ESPRESSO,
        borderTop: "1px solid rgba(66,53,33,0.35)",
        borderBottom: "1px solid rgba(66,53,33,0.35)",
        padding: "40px 20px 36px",
        margin: "26px 0",
        textAlign: "center",
        fontFamily: SF,
      }}
    >
      {/* The one promise worth pinning, overhanging the top edge. */}
      <StickyNote
        ar={ar}
        size={82}
        rot={-5}
        text={ar ? "ملكك 100%" : "100% yours. always."}
        style={{ position: "absolute", top: -22, insetInlineStart: 8, zIndex: 3 }}
      />

      {/* Courier eyebrow */}
      <div style={{
        fontFamily: MONO,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: TAN_DIM,
        marginBottom: 12,
      }}>
        {ar ? "حماية الكاتب" : "Writer Protection"}
      </div>

      {/* Serif headline */}
      <h2 style={{
        fontFamily: serif,
        fontSize: ar ? 25 : 28,
        fontWeight: 700,
        lineHeight: ar ? 1.45 : 1.15,
        letterSpacing: ar ? 0 : "-0.02em",
        color: TAN,
        margin: "0 0 20px",
      }}>
        {ar ? "كلماتك تبقى لك. دائماً." : "Your words stay yours. Always."}
      </h2>

      {/* Faris's Snape drawing, taped under the headline. */}
      <div style={{ width: 122, margin: "0 auto 22px", transform: "rotate(2deg)" }}>
        <div style={{ position: "relative" }}>
          <div aria-hidden style={{
            position: "absolute",
            top: -8,
            left: "50%",
            transform: "translateX(-50%) rotate(-3deg)",
            width: 46,
            height: 14,
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
              boxShadow: "0 16px 30px -14px rgba(0,0,0,0.6)",
              userSelect: "none",
            }}
          />
        </div>
        <div style={{
          marginTop: 6,
          fontFamily: hand,
          fontSize: ar ? 14.5 : 17,
          color: "#d8b98c",
          transform: "rotate(-1deg)",
        }}>
          {ar ? "دائماً." : "always."}
        </div>
      </div>

      {/* The protections, line by line, four faces taking turns. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 11, maxWidth: 400, margin: "0 auto 24px" }}>
        {LINES.map((l, i) => (
          <div key={i} style={{ lineHeight: 1.55, ...lineStyle(l.f) }}>
            {ar ? l.ar : l.en}
          </div>
        ))}
      </div>

      {/* The plain link into the full page. */}
      <button
        onClick={() => navigate("/protection")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: SF,
          fontSize: 13.5,
          fontWeight: 600,
          color: TAN,
          textDecoration: "underline",
          textDecorationColor: "rgba(230,205,164,0.45)",
          textUnderlineOffset: 4,
          padding: 4,
        }}
      >
        <ShieldCheck size={14} style={{ flexShrink: 0 }} />
        {ar ? "اقرأ صفحة حماية الكاتب كاملة" : "Read the full Writer Protection page"}
        {ar ? <ArrowLeft size={13} /> : <ArrowRight size={13} />}
      </button>
    </section>
  );
}
