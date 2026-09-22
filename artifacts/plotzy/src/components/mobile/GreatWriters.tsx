// The greats — phone edition of the "every one of them started with a
// blank page" moment.
//
// The band is painted in the poster's own background colour (#241109,
// sampled from the image) so the photograph melts into the page instead
// of sitting on it as a pasted rectangle; the type is light brown, the
// same family the Writer Protection band uses.

import { HAND_AR, HAND_EN, SERIF_AR, SERIF_EN } from "./fonts";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

/** Sampled from great-writers.jpg. */
const BG = "#241109";
const TAN = "#e6cda4";
const TAN_SOFT = "rgba(222,196,155,0.88)";
const TAN_DIM = "rgba(216,185,140,0.6)";

export function GreatWritersMobile({ ar, onStartWriting }: { ar: boolean; onStartWriting: () => void }) {
  const serif = ar ? SERIF_AR : SERIF_EN;
  const hand = ar ? HAND_AR : HAND_EN;
  return (
    <section
      dir={ar ? "rtl" : "ltr"}
      style={{
        background: BG,
        borderTop: "1px solid rgba(66,53,33,0.35)",
        borderBottom: "1px solid rgba(66,53,33,0.35)",
        padding: "38px 20px 42px",
        margin: "26px 0",
        textAlign: "center",
        fontFamily: SF,
      }}
    >
      {/* Straight and unframed — no tape, no border, no tilt. The mask
          feathers the edges so there is no visible rectangle. */}
      <img
        src="/images/great-writers.jpg"
        alt={ar
          ? "شكسبير، ج. ك. رولينغ، تشارلز ديكنز، جين أوستن، همنغواي، جورج أورويل وأغاثا كريستي"
          : "Shakespeare, J.K. Rowling, Charles Dickens, Jane Austen, Hemingway, George Orwell and Agatha Christie"}
        loading="lazy"
        draggable={false}
        style={{
          width: "100%",
          maxWidth: 300,
          display: "block",
          margin: "0 auto 24px",
          userSelect: "none",
          WebkitMaskImage: "radial-gradient(118% 110% at 50% 45%, #000 60%, transparent 100%)",
          maskImage: "radial-gradient(118% 110% at 50% 45%, #000 60%, transparent 100%)",
        }}
      />

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: TAN_DIM, marginBottom: 10 }}>
        {ar ? "في صحبة العظماء" : "In good company"}
      </div>
      <h2 style={{ fontFamily: serif, fontSize: ar ? 26 : 29, fontWeight: 700, lineHeight: ar ? 1.5 : 1.22, color: TAN, margin: "0 auto 8px", maxWidth: 340 }}>
        {ar
          // Warm gold instead of the paper-tuned yellow highlighter.
          ? <>كل واحد منهم بدأ <span style={{ color: "#f0d9a8" }}>بصفحة فارغة</span></>
          : <>Every one of them started with <span style={{ color: "#f0d9a8" }}>a blank page</span></>}
      </h2>
      <div style={{ fontFamily: hand, fontSize: ar ? 16 : 20, color: "#d8b98c", marginBottom: 14, display: "inline-block" }}>
        {ar ? "(ودورك جاي)" : "(you're next)"}
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.75, color: TAN_SOFT, maxWidth: 340, margin: "0 auto 22px" }}>
        {ar
          ? "لا أحد وُلد روائياً. صفحة بيضاء، وجملة أولى متعثرة، وإصرار على الرجوع كل يوم. هذا كل ما فرّقهم عن غيرهم، وهذا كل ما تحتاجه أنت."
          : "Nobody was born a novelist. A blank page, a clumsy first sentence, and the stubbornness to come back every day. That is all that set them apart, and it is all you need."}
      </p>
      <button
        onClick={onStartWriting}
        style={{
          background: TAN, color: BG, border: "none", borderRadius: 999,
          padding: "14px 30px", fontSize: 15, fontWeight: 700, fontFamily: SF, cursor: "pointer",
          boxShadow: "0 12px 28px -10px rgba(0,0,0,0.55)",
        }}
      >
        {ar ? "ابدأ صفحتك الأولى" : "Start your first page"}
      </button>
    </section>
  );
}
