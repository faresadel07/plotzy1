// Scattered prose snippets, Sudowrite style: overlapping tilted paper
// slips with real book-ish sentences, bleeding off the screen edges,
// under a handwritten aside admitting Claude helped write them. Sits
// right below the AI studio banner as its proof moment.

import { SERIF_EN, SERIF_AR, HAND_EN, HAND_AR } from "./fonts";

const SNIPPETS_AR = [
  "طفت شظايا الذاكرة على سطح ذهنه كما يطفو الحطام: صوت جدّه، ورائحة المطر على إسفلت عمّان، وباب خشبيّ لم يفتحه أحد منذ عشرين سنة.",
  "وقفت الفتاة عند حافة السطح، والمدينة تحتها تشتعل بأضواء لا تعرف أسماء أصحابها. كانت تشبه شعلة صغيرة تبحث عن حريق يليق بها.",
  "في الليلة التي قرّر فيها أن يكتب، لم يكن يملك سوى دفتر أزرق ونصف فكرة. وكان ذلك كافياً تماماً.",
];

const SNIPPETS_EN = [
  "Fragments of memory bobbed to the surface of his mind like flotsam: his grandfather's voice, the smell of rain on Amman asphalt, a wooden door no one had opened in twenty years.",
  "The girl stood at the edge of the rooftop, the city below her burning with lights that belonged to strangers. She looked like a small flame searching for a fire worthy of her.",
  "On the night he decided to write, he owned nothing but a blue notebook and half an idea. It turned out to be exactly enough.",
];

export function SnippetsFan({ ar }: { ar: boolean }) {
  const snippets = ar ? SNIPPETS_AR : SNIPPETS_EN;
  const serif = ar ? SERIF_AR : SERIF_EN;

  const slip = (text: string, style: React.CSSProperties) => (
    <div
      dir={ar ? "rtl" : "ltr"}
      style={{
        position: "absolute",
        background: "#fffdf7",
        border: "1px solid rgba(66,53,33,0.12)",
        borderRadius: 6,
        padding: "15px 18px",
        boxShadow: "0 12px 28px -10px rgba(41,33,21,0.35)",
        fontFamily: serif,
        fontSize: ar ? 14 : 14.5,
        lineHeight: 1.75,
        color: "#3a3020",
        ...style,
      }}
    >
      {text}
    </div>
  );

  return (
    <section style={{ marginBottom: 30, overflow: "hidden" }}>
      {/* Handwritten aside + a small hand-drawn smile */}
      <div style={{ textAlign: "center", padding: "0 24px", marginBottom: 6, position: "relative" }}>
        <span style={{ fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 17 : 21, color: "#8a8070", display: "inline-block", transform: "rotate(-1.5deg)" }}>
          {ar ? "(اه، كلود ساعد بكتابة هدول فعلاً)" : "(yep, Claude helped write these!)"}
        </span>
        <svg aria-hidden width="34" height="24" viewBox="0 0 34 24" style={{ position: "absolute", insetInlineEnd: 18, top: -2, opacity: 0.55 }}>
          <path d="M6 14 Q 16 24 28 12" fill="none" stroke="#8a8070" strokeWidth="2" strokeLinecap="round" />
          <circle cx="10" cy="6" r="1.6" fill="#8a8070" />
          <circle cx="24" cy="4" r="1.6" fill="#8a8070" />
        </svg>
      </div>

      {/* The scattered slips, edges cut by the screen like real clippings */}
      <div style={{ position: "relative", height: 332 }}>
        {slip(snippets[0], { top: 8, insetInlineStart: -34, width: 300, transform: `rotate(${ar ? 7 : -7}deg)` })}
        {slip(snippets[1], { top: 108, insetInlineStart: 46, width: 320, transform: `rotate(${ar ? -4 : 4}deg)`, zIndex: 2 })}
        {slip(snippets[2], { top: 236, insetInlineEnd: -40, width: 290, transform: `rotate(${ar ? 3 : -3}deg)` })}
      </div>
    </section>
  );
}
