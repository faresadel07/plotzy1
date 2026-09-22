// The greats — phone edition of the "every one of them started with a
// blank page" moment. Faris's sepia collage of the great writers hung
// as a taped, slightly tilted poster with the line under it and the
// start-writing pill. Sits right before the feedback wall so the order
// reads: the greats, then real writers' words.

import { ESPRESSO, INK, MUTED, PAPER_ON_DARK } from "./palette";
import { HAND_AR, HAND_EN, SERIF_AR, SERIF_EN } from "./fonts";
import { Mark } from "./Marker";
import { PaperBall } from "./PaperBall";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export function GreatWritersMobile({ ar, onStartWriting }: { ar: boolean; onStartWriting: () => void }) {
  const serif = ar ? SERIF_AR : SERIF_EN;
  const hand = ar ? HAND_AR : HAND_EN;
  return (
    <section dir={ar ? "rtl" : "ltr"} style={{ padding: "34px 20px 40px", textAlign: "center", fontFamily: SF }}>

      {/* The poster, taped and slightly tilted. */}
      <div style={{ position: "relative", maxWidth: 300, margin: "0 auto 26px", transform: "rotate(-1.5deg)" }}>
        <div aria-hidden style={{
          position: "absolute",
          top: -10,
          left: "50%",
          transform: "translateX(-50%) rotate(-2.5deg)",
          width: 74,
          height: 20,
          background: "rgba(214,196,150,0.65)",
          border: "1px solid rgba(66,53,33,0.12)",
          borderRadius: 2,
          zIndex: 2,
        }} />
        <img
          src="/images/great-writers.jpg"
          alt={ar
            ? "شكسبير، ج. ك. رولينغ، تشارلز ديكنز، جين أوستن، همنغواي، جورج أورويل وأغاثا كريستي"
            : "Shakespeare, J.K. Rowling, Charles Dickens, Jane Austen, Hemingway, George Orwell and Agatha Christie"}
          loading="lazy"
          draggable={false}
          style={{
            width: "100%",
            display: "block",
            borderRadius: 14,
            border: "1px solid rgba(66,53,33,0.22)",
            boxShadow: "0 24px 48px -20px rgba(41,33,21,0.55)",
            userSelect: "none",
          }}
        />
        <PaperBall size={34} rot={-20} style={{ position: "absolute", bottom: -14, insetInlineEnd: -16 }} />
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: MUTED, marginBottom: 10 }}>
        {ar ? "في صحبة العظماء" : "In good company"}
      </div>
      <h2 style={{ fontFamily: serif, fontSize: ar ? 26 : 29, fontWeight: 700, lineHeight: ar ? 1.5 : 1.22, color: INK, margin: "0 auto 8px", maxWidth: 340 }}>
        {ar
          ? <>كل واحد منهم بدأ <Mark ar={ar}>بصفحة فارغة</Mark></>
          : <>Every one of them started with <Mark ar={ar}>a blank page</Mark></>}
      </h2>
      <div style={{ fontFamily: hand, fontSize: ar ? 16 : 20, color: "#8a8070", marginBottom: 14, transform: "rotate(-0.8deg)", display: "inline-block" }}>
        {ar ? "(ودورك جاي)" : "(you're next)"}
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.75, color: MUTED, maxWidth: 340, margin: "0 auto 22px" }}>
        {ar
          ? "لا أحد وُلد روائياً. صفحة بيضاء، وجملة أولى متعثرة، وإصرار على الرجوع كل يوم. هذا كل ما فرّقهم عن غيرهم، وهذا كل ما تحتاجه أنت."
          : "Nobody was born a novelist. A blank page, a clumsy first sentence, and the stubbornness to come back every day. That is all that set them apart, and it is all you need."}
      </p>
      <button
        onClick={onStartWriting}
        style={{
          background: ESPRESSO, color: PAPER_ON_DARK, border: "none", borderRadius: 999,
          padding: "14px 30px", fontSize: 15, fontWeight: 700, fontFamily: SF, cursor: "pointer",
          boxShadow: "0 12px 28px -8px rgba(41,33,21,0.5)",
        }}
      >
        {ar ? "ابدأ صفحتك الأولى" : "Start your first page"}
      </button>
    </section>
  );
}
