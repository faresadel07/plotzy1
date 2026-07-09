// The mobile home hero: serif headline, two actions, then a stack of
// overlapping paper cards carrying the site's real story (the
// Sudowrite synopsis-stack look Faris picked), with a crumpled paper
// ball resting against the pile. No slides, no collage.

import { INK, INK_SOFT, MUTED, ESPRESSO, PAPER_ON_DARK, BORDER_INK } from "./palette";
import { SERIF_EN, SERIF_AR, HAND_EN, HAND_AR } from "./fonts";
import { PaperBall } from "./PaperBall";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

/* One paper card in the stack. */
function StackCard({
  ar, header, children, style,
}: { ar: boolean; header?: string; children: React.ReactNode; style: React.CSSProperties }) {
  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      style={{
        position: "absolute",
        background: "#fffdf7",
        border: "1px solid rgba(66,53,33,0.13)",
        borderRadius: 14,
        boxShadow: "0 14px 34px -12px rgba(41,33,21,0.35)",
        padding: "16px 18px",
        textAlign: ar ? "right" : "left",
        overflow: "hidden",
        ...style,
      }}
    >
      {header && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
          <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" style={{ color: "#8a8070", flexShrink: 0 }}>
            <path d="M12 2 L13.8 9.2 L21 7 L15.5 12 L21 17 L13.8 14.8 L12 22 L10.2 14.8 L3 17 L8.5 12 L3 7 L10.2 9.2 Z" fill="currentColor" />
          </svg>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8a8070" }}>{header}</span>
        </div>
      )}
      <div style={{ fontSize: 13.5, lineHeight: 1.7, color: INK_SOFT }}>{children}</div>
    </div>
  );
}

export function MobileHero({ ar, onStartWriting, onOpenCourse }: { ar: boolean; onStartWriting: () => void; onOpenCourse: () => void }) {
  return (
    <section dir={ar ? "rtl" : "ltr"} style={{ fontFamily: SF, padding: "20px 18px 4px", textAlign: "center" }}>
      {/* Headline + support */}
      <h1 style={{ fontFamily: ar ? SERIF_AR : SERIF_EN, fontSize: ar ? 34 : 38, fontWeight: 700, letterSpacing: ar ? 0 : "-0.015em", lineHeight: ar ? 1.4 : 1.12, color: INK, margin: "0 0 8px" }}>
        {ar ? "اكتب كتابك الأول" : "Write your first book"}
      </h1>
      <p style={{ fontSize: 14.5, lineHeight: 1.55, color: MUTED, maxWidth: 320, margin: "0 auto 16px" }}>
        {ar
          ? "استوديو كتابة كامل مع مساعد ذكاء اصطناعي، مصمم أغلفة، ومكتبات كاملة. كل شيء في مكان واحد."
          : "A full writing studio with an AI partner, a cover designer, and complete libraries. All in one place."}
      </p>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 8 }}>
        <button
          onClick={onStartWriting}
          style={{
            background: ESPRESSO, color: PAPER_ON_DARK, border: "none", borderRadius: 999,
            padding: "13px 26px", fontSize: 14.5, fontWeight: 700, fontFamily: SF, cursor: "pointer",
            boxShadow: "0 10px 24px -8px rgba(41,33,21,0.5)",
          }}
        >
          {ar ? "ابدأ الكتابة" : "Start writing"}
        </button>
        <button
          onClick={onOpenCourse}
          style={{
            background: "#fffdf7", color: INK_SOFT, border: `1px solid rgba(66,53,33,0.22)`, borderRadius: 999,
            padding: "13px 22px", fontSize: 14.5, fontWeight: 600, fontFamily: SF, cursor: "pointer",
            boxShadow: "0 1px 2px rgba(66,53,33,0.06)",
          }}
        >
          {ar ? "الكورس المجاني" : "Free course"}
        </button>
      </div>

      {/* Handwritten aside */}
      <div style={{ fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 14 : 17, color: "#8a8070", marginBottom: 10, transform: "rotate(-1.2deg)" }}>
        {ar ? "(مجاني، بدون بطاقة، بدون حدود)" : "(free, no card, no limits)"}
      </div>

      {/* ── The papers stack ── */}
      <div style={{ position: "relative", height: 392, margin: "0 -6px" }}>
        {/* Hand-drawn ink dashes around the pile */}
        <svg aria-hidden width="42" height="26" viewBox="0 0 42 26" style={{ position: "absolute", top: 2, insetInlineStart: 2, opacity: 0.5 }}>
          <path d="M2 20 Q 12 4 26 8" fill="none" stroke="#5c5142" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M30 22 Q 36 16 40 18" fill="none" stroke="#5c5142" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <svg aria-hidden width="38" height="22" viewBox="0 0 38 22" style={{ position: "absolute", bottom: 8, insetInlineEnd: 4, opacity: 0.45, transform: "rotate(160deg)" }}>
          <path d="M2 16 Q 12 2 24 8" fill="none" stroke="#5c5142" strokeWidth="2.4" strokeLinecap="round" />
        </svg>

        {/* Back sliver, top end */}
        <StackCard ar={ar} style={{ top: 4, insetInlineEnd: -26, width: "62%", height: 96, transform: "rotate(5deg)", zIndex: 1, opacity: 0.9 }}>
          {ar
            ? "قصص من المجتمع، تقييمات حقيقية، وقرّاء بينتظروا كتابك الجاي..."
            : "Community stories, real ratings, and readers waiting for your next book..."}
        </StackCard>

        {/* Libraries card, behind on the end side */}
        <StackCard
          ar={ar}
          header={ar ? "المكتبات" : "The Libraries"}
          style={{ top: 64, insetInlineEnd: -14, width: "80%", height: 150, transform: "rotate(3.4deg)", zIndex: 2 }}
        >
          {ar
            ? "19 ألف كتاب مسموع من LibriVox، كلاسيكيات إنجليزية كاملة، 1300 كوميكس من العصر الذهبي، ومكتبة هنداوي العربية بأكملها. كلها للقراءة والسماع مجاناً."
            : "19,000 audiobooks from LibriVox, complete English classics, 1,300 golden age comics, and the full Hindawi Arabic library. All free to read and hear."}
        </StackCard>

        {/* Course card, behind on the start side */}
        <StackCard
          ar={ar}
          header={ar ? "الكورس" : "The Course"}
          style={{ bottom: 6, insetInlineStart: -18, width: "78%", height: 132, transform: "rotate(-3.6deg)", zIndex: 2 }}
        >
          {ar
            ? "32 درساً في صنعة الكتابة، من الفكرة الأولى حتى النشر، بتمارين حقيقية وشهادة إتمام. مجاني ولن يصبح مدفوعاً."
            : "32 lessons on the craft, from first idea to publishing, with real exercises and a certificate. Free, and it stays free."}
        </StackCard>

        {/* The main synopsis card, front */}
        <StackCard
          ar={ar}
          header={ar ? "لمحة" : "Synopsis"}
          style={{ top: 78, insetInlineStart: "4%", width: "88%", transform: "rotate(-1.6deg)", zIndex: 3, padding: "18px 20px" }}
        >
          <p style={{ margin: "0 0 10px" }}>
            {ar
              ? "بلوتزي استوديو كتابة كامل: محرر بصفحات كتاب حقيقية، مساعد ذكاء اصطناعي يخطط ويسوّد ويراجع جنبك، مصمم أغلفة يليق بقصتك، ونشر بضغطة واحدة."
              : "Plotzy is a full writing studio: an editor with real book pages, an AI partner that plots, drafts and reviews beside you, a cover designer worthy of your story, and one-tap publishing."}
          </p>
          <p style={{ margin: "0 0 10px" }}>
            {ar
              ? "بتكتب بالعربي أو بالإنجليزي، من تلفونك أو لابتوبك، وكل كلمة بتضل محفوظة ومتزامنة."
              : "Write in Arabic or English, from your phone or laptop, with every word saved and in sync."}
          </p>
          <p style={{ margin: 0, fontWeight: 700, color: INK }}>
            {ar ? "والأهم: كل هذا مجاني." : "And the part that matters: all of it is free."}
          </p>
        </StackCard>

        {/* The crumpled ball resting against the pile */}
        <PaperBall size={62} rot={12} style={{ position: "absolute", bottom: -6, insetInlineEnd: 8, zIndex: 4 }} />
      </div>

      {/* Quiet stats strip */}
      <div style={{ display: "flex", justifyContent: "center", gap: 0, marginTop: 14, marginBottom: 2 }}>
        {(ar
          ? [["19,000+", "كتاب صوتي"], ["32", "درس كتابة مجاني"], ["2", "لغة كتابة"]]
          : [["19,000+", "audiobooks"], ["32", "free lessons"], ["2", "writing languages"]]
        ).map(([n, label], i) => (
          <div key={label} style={{ padding: "0 16px", borderInlineStart: i ? `1px solid ${BORDER_INK}` : "none", textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: INK, letterSpacing: "-0.02em" }}>{n}</div>
            <div style={{ fontSize: 10.5, color: MUTED, marginTop: 1 }}>{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
