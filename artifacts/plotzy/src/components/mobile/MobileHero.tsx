// The mobile home hero: serif headline, two actions, then a stack of
// overlapping paper cards carrying the site's real story (the
// Sudowrite synopsis-stack look Faris picked), with a crumpled paper
// ball resting against the pile. No slides, no collage.

import { INK, INK_SOFT, MUTED, ESPRESSO, PAPER_ON_DARK, BORDER_INK } from "./palette";
import { SERIF_EN, SERIF_AR, HAND_EN, HAND_AR } from "./fonts";
import { PaperBall } from "./PaperBall";
import { Mark } from "./Marker";
import { StickyNote } from "./StickyNote";

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
        {ar
          ? <>اكتب <Mark ar={ar} delay={350}>كتابك الأول</Mark></>
          : <>Write your <Mark ar={ar} delay={350}>first book</Mark></>}
      </h1>
      <p style={{ fontSize: 14.5, lineHeight: 1.55, color: MUTED, maxWidth: 320, margin: "0 auto 16px" }}>
        {ar
          ? <>استوديو كتابة كامل مع مساعد ذكاء اصطناعي، مصمم أغلفة، ومكتبات كاملة. <Mark ar={ar} delay={900}>كل شيء في مكان واحد.</Mark></>
          : <>A full writing studio with an AI partner, a cover designer, and complete libraries. <Mark ar={ar} delay={900}>All in one place.</Mark></>}
      </p>

      {/* ── The papers stack: a messy desk of tilted drafts, with the
          synopsis card sitting perfectly straight on top of the chaos ── */}
      <div style={{ position: "relative", height: 470, margin: "0 -6px" }}>
        {/* The bragging sticky, pinned at the very top corner */}
        <StickyNote ar={ar} size={84} rot={7} text={ar ? "رقم 1 بالسوق، مضمون" : "number 1 on the market, guaranteed"} style={{ position: "absolute", top: -36, right: -6, zIndex: 5 }} />
        {/* Hand-drawn ink dashes around the pile */}
        <svg aria-hidden width="42" height="26" viewBox="0 0 42 26" style={{ position: "absolute", top: 2, insetInlineStart: 2, opacity: 0.5 }}>
          <path d="M2 20 Q 12 4 26 8" fill="none" stroke="#5c5142" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M30 22 Q 36 16 40 18" fill="none" stroke="#5c5142" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <svg aria-hidden width="38" height="22" viewBox="0 0 38 22" style={{ position: "absolute", bottom: 8, insetInlineEnd: 4, opacity: 0.45, transform: "rotate(160deg)" }}>
          <path d="M2 16 Q 12 2 24 8" fill="none" stroke="#5c5142" strokeWidth="2.4" strokeLinecap="round" />
        </svg>

        {/* Deep scraps: manuscript fragments, badly stacked on purpose.
            They run long on purpose too; whatever slides under the
            synopsis card just reads as buried pages. */}
        <StackCard ar={ar} style={{ top: 0, insetInlineStart: -34, width: "74%", height: 118, transform: "rotate(-9deg)", zIndex: 1, opacity: 0.85 }}>
          {ar
            ? "مسودة أولى: في الصباح الذي بدأ فيه كل شيء، كانت المدينة لسا نايمة، وصوت المطر على الشباك بيكتب أول سطر عني. حطيت القهوة جنب الدفتر وقلت لنفسي: اليوم بلش..."
            : "First draft: on the morning it all began, the city was still asleep, and the rain on the window was writing the first line for me. I set the coffee beside the notebook and told myself: today it starts..."}
        </StackCard>
        <StackCard ar={ar} style={{ top: 10, insetInlineEnd: -38, width: "74%", height: 124, transform: "rotate(8deg)", zIndex: 1, opacity: 0.9 }}>
          {ar
            ? "قصص من المجتمع، تقييمات حقيقية بالنجوم، تعليقات على كل فصل، وقرّاء بينتظروا كتابك الجاي. حدا بيقرأ اللي بتكتبه فعلاً، وبيرد عليك..."
            : "Community stories, real star ratings, comments on every chapter, and readers waiting for your next book. Someone actually reads what you write, and writes back..."}
        </StackCard>
        <StackCard ar={ar} style={{ top: 128, insetInlineStart: -18, width: "68%", height: 116, transform: "rotate(6deg)", zIndex: 1, opacity: 0.85 }}>
          {ar
            ? "ملاحظة: البطل ما بيعرف إنه البيت مسكون بذكرياته هو، بس القارئ لازم يحس من أول مشهد. رجّع وصف المدخل، وخلي الصور المعلقة عالحيط مايلة شوي..."
            : "Note: the hero does not know the house is haunted by his own memories, but the reader must feel it from the first scene. Rewrite the hallway, and let the photos on the wall hang slightly crooked..."}
        </StackCard>

        {/* Libraries card, messier angle */}
        <StackCard
          ar={ar}
          header={ar ? "المكتبات" : "The Libraries"}
          style={{ top: 78, insetInlineEnd: -20, width: "82%", height: 150, transform: "rotate(5.5deg)", zIndex: 2 }}
        >
          {ar
            ? "19 ألف كتاب مسموع من LibriVox، كلاسيكيات إنجليزية كاملة، 1300 كوميكس من العصر الذهبي، ومكتبة هنداوي العربية بأكملها. كلها جوّا بلوتزي."
            : "19,000 audiobooks from LibriVox, complete English classics, 1,300 golden age comics, and the full Hindawi Arabic library. All inside Plotzy."}
        </StackCard>

        {/* Course card, tilted the other way */}
        <StackCard
          ar={ar}
          header={ar ? "الكورس" : "The Course"}
          style={{ bottom: 26, insetInlineStart: -22, width: "78%", height: 132, transform: "rotate(-6.5deg)", zIndex: 2 }}
        >
          {ar
            ? "32 درساً في صنعة الكتابة، من الفكرة الأولى حتى النشر، بتمارين حقيقية وشهادة إتمام. مجاني ولن يصبح مدفوعاً."
            : "32 lessons on the craft, from first idea to publishing, with real exercises and a certificate. Free, and it stays free."}
        </StackCard>
        <StackCard ar={ar} style={{ bottom: 0, insetInlineEnd: -30, width: "70%", height: 108, transform: "rotate(-7deg)", zIndex: 1, opacity: 0.85 }}>
          {ar
            ? "فصل 7: الباب الذي لم يفتحه أحد منذ عشرين سنة كان اليوم مفتوحاً على آخره، والغبار على العتبة عليه أثر خطوات صغيرة..."
            : "Chapter 7: the door no one had opened in twenty years stood wide open today, and the dust on the threshold held a trail of small footsteps..."}
        </StackCard>

        {/* The main synopsis card: the ONLY straight one, facing you.
            Five typefaces share the page like a real writer's desk:
            serif, system, typewriter, handwriting, and old-style serif. */}
        <StackCard
          ar={ar}
          header={ar ? "لمحة" : "Synopsis"}
          style={{ top: 92, insetInlineStart: "5%", width: "90%", transform: "rotate(0deg)", zIndex: 3, padding: "18px 20px", boxShadow: "0 20px 44px -14px rgba(41,33,21,0.45)" }}
        >
          <p style={{ margin: "0 0 8px", fontFamily: ar ? "'Amiri', serif" : "'Lora', Georgia, serif", fontSize: ar ? 16.5 : 16, fontWeight: 700, color: INK, lineHeight: 1.6 }}>
            {ar ? "بلوتزي استوديو كتابة كامل:" : "Plotzy is a full writing studio:"}
          </p>
          <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: 13.5, lineHeight: 1.7 }}>
            {ar
              ? "محرر بصفحات كتاب حقيقية، ومساعد ذكاء اصطناعي يخطط ويسوّد ويراجع جنبك."
              : "An editor with real book pages, and an AI partner that plots, drafts and reviews beside you."}
          </p>
          <p style={{ margin: "0 0 8px", fontFamily: ar ? "'Noto Naskh Arabic', serif" : "'Courier New', monospace", fontWeight: 600, fontSize: ar ? 14 : 13, lineHeight: 1.7 }}>
            {ar ? "مصمم أغلفة يليق بقصتك،" : "A cover designer worthy of your story,"}
          </p>
          <p style={{ margin: "0 0 10px", fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 16 : 19, color: "#5c5142", lineHeight: 1.5 }}>
            {ar ? "ونشر بضغطة واحدة." : "and one-tap publishing."}
          </p>
          <p style={{ margin: 0, fontFamily: ar ? "'Amiri', serif" : "Georgia, serif", fontStyle: "italic", fontWeight: 600, fontSize: ar ? 15 : 14, color: INK, lineHeight: 1.65 }}>
            {ar
              ? "بتكتب بالعربي أو بالإنجليزي، من تلفونك أو لابتوبك، وكل كلمة محفوظة ومتزامنة."
              : "Write in Arabic or English, from your phone or laptop, every word saved and in sync."}
          </p>
        </StackCard>

        {/* Crumpled balls resting against the pile */}
        <PaperBall size={62} rot={12} style={{ position: "absolute", bottom: -6, insetInlineEnd: 8, zIndex: 4 }} />
        <PaperBall size={34} rot={-25} style={{ position: "absolute", top: 66, insetInlineStart: 4, zIndex: 4 }} />
        <PaperBall size={24} rot={40} style={{ position: "absolute", bottom: 34, insetInlineStart: 40, zIndex: 4 }} />
      </div>

      {/* Actions, below the papers as asked */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18, marginBottom: 8 }}>
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
      <div style={{ fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 14 : 17, color: "#8a8070", marginBottom: 4, transform: "rotate(-1.2deg)" }}>
        {ar ? "(من تلفونك أو لابتوبك، هلأ)" : "(from your phone or laptop, right now)"}
      </div>
    </section>
  );
}
