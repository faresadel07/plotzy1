// The phone landing page for visitors who are not signed in.
//
// Direction: warm literary print (approved from the Sudowrite study):
// paper background with ink speckles, a big serif headline with two
// accent-colored words, real product screenshots doing the selling,
// alternating cream and espresso sections for rhythm, real tester
// faces, and one persistent green call to action.
//
// Signed-in phones keep the MobileHome shelves; this component is the
// pitch, not the product.

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { PenLine, BookOpen, GraduationCap, Headphones, Sparkles, Check } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { TESTIMONIALS } from "@/components/testimonials/testimonials-data";
import { COVER_TEMPLATES, buildTemplateDesign } from "@/lib/cover-templates";
import { ensureCoverFontsLoaded } from "@/lib/cover-fonts";

/* ── Palette (from the Sudowrite extraction, tuned for Plotzy) ── */
const PAPER = "#f4efe2";
const PAPER_DEEP = "#ece5d2";
const INK = "#2f2618";
const INK_SOFT = "#423521";
const MUTED = "#7b7366";
const ESPRESSO = "#292115";
const GREEN = "#26ad5f";
const GREEN_DARK = "#1d9450";
const PURPLE = "#9d5ce3";
const CYAN = "#0099ff";

// Literata: the serif commissioned for Google Books — a face literally
// made for reading books, which is the whole product. Warmer and far
// less template-worn than the Fraunces/Playfair default wave.
const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';
const SERIF_EN = '"Literata", Georgia, serif';
const SERIF_AR = '"Amiri", serif';

/* Paper speckle: two offset dot grids, barely visible, like ink dust. */
const SPECKLE: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(rgba(66,53,33,0.06) 1px, transparent 1.3px), radial-gradient(rgba(66,53,33,0.04) 1px, transparent 1.2px)",
  backgroundSize: "26px 26px, 34px 34px",
  backgroundPosition: "0 0, 13px 17px",
};

const FONTS_LINK_ID = "plotzy-landing-fonts";
function ensureLandingFonts() {
  if (typeof document === "undefined" || document.getElementById(FONTS_LINK_ID)) return;
  const link = document.createElement("link");
  link.id = FONTS_LINK_ID;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400..700;1,7..72,400..700&family=Amiri:ital,wght@0,400;0,700;1,400&display=swap";
  document.head.appendChild(link);
}

export function MobileLanding({ onStartWriting }: { onStartWriting: () => void }) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [, navigate] = useLocation();
  const serif = ar ? SERIF_AR : SERIF_EN;

  useEffect(() => {
    ensureLandingFonts();
    ensureCoverFontsLoaded(); // the mini template covers below use real cover fonts
  }, []);

  // Floating CTA appears once the hero scrolls away.
  const [floatCta, setFloatCta] = useState(false);
  useEffect(() => {
    const onScroll = () => setFloatCta(window.scrollY > 520);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const heroFaces = useMemo(() => TESTIMONIALS.slice(0, 4), []);

  return (
    <div dir={ar ? "rtl" : "ltr"} style={{ background: PAPER, color: INK, fontFamily: SF, ...SPECKLE }}>

      {/* ══ Hero ══ */}
      <section style={{ padding: "44px 22px 34px", textAlign: "center" }}>
        {/* New pill */}
        <button
          onClick={() => navigate("/course")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#fbf8ef", border: "1px solid rgba(66,53,33,0.16)",
            borderRadius: 999, padding: "7px 14px", marginBottom: 26,
            fontSize: 12.5, fontWeight: 600, color: INK_SOFT, cursor: "pointer",
            boxShadow: "0 1px 2px rgba(66,53,33,0.06)", fontFamily: SF,
          }}
        >
          <span style={{ background: ESPRESSO, color: PAPER, borderRadius: 999, padding: "2px 8px", fontSize: 10.5, fontWeight: 700 }}>
            {ar ? "جديد" : "New"}
          </span>
          {ar ? "كورس كتابة كامل، مجاني بالكامل" : "A complete writing course, fully free"}
          <span aria-hidden style={{ opacity: 0.5 }}>{ar ? "←" : "→"}</span>
        </button>

        <h1
          style={{
            fontFamily: serif,
            fontWeight: ar ? 700 : 560 as any,
            fontSize: ar ? 34 : 37,
            lineHeight: ar ? 1.55 : 1.18,
            letterSpacing: ar ? 0 : "-0.015em",
            margin: "0 0 18px",
            color: INK,
          }}
        >
          {ar ? (
            <>اكتب <span style={{ color: PURPLE }}>الكتاب</span> الذي <span style={{ color: CYAN }}>ينتظر</span> بداخلك</>
          ) : (
            <>Write the <span style={{ color: PURPLE }}>book</span> that has been <span style={{ color: CYAN, fontStyle: "italic" }}>waiting</span> inside you.</>
          )}
        </h1>

        <p style={{ fontFamily: ar ? SF : SERIF_EN, fontSize: ar ? 15.5 : 17, lineHeight: 1.65, color: MUTED, maxWidth: 340, margin: "0 auto 26px" }}>
          {ar
            ? "بلوتزي منصة الكتابة التي تأخذك من أول جملة حتى كتاب كامل بغلاف يليق به."
            : "Plotzy takes you from the first sentence to a finished book with a cover worthy of it."}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 340, margin: "0 auto" }}>
          <button
            onClick={onStartWriting}
            style={{
              width: "100%", padding: "15px 20px", borderRadius: 12, border: "none",
              background: GREEN, color: "#fff", fontSize: 16, fontWeight: 700,
              cursor: "pointer", fontFamily: SF,
              boxShadow: "0 8px 22px -8px rgba(38,173,95,0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
            }}
          >
            {ar ? "ابدأ الكتابة مجاناً" : "Start writing for free"}
          </button>
          <button
            onClick={() => navigate("/discover")}
            style={{
              width: "100%", padding: "14px 20px", borderRadius: 12,
              border: "1px solid rgba(66,53,33,0.2)", background: "#fffdf7",
              color: INK_SOFT, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: SF,
              boxShadow: "0 1px 2px rgba(66,53,33,0.06)",
            }}
          >
            {ar ? "تصفح المكتبة أولاً" : "Browse the library first"}
          </button>
        </div>
        <p style={{ fontSize: 11.5, color: MUTED, marginTop: 12 }}>
          {ar ? "بدون بطاقة، بدون حدود على عدد كتبك" : "No card, no limit on how many books you write"}
        </p>
      </section>

      {/* ══ Real faces, real words (Sudowrite-style bubbles) ══ */}
      <section style={{ padding: "6px 18px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 12px", maxWidth: 380, margin: "0 auto" }}>
          {heroFaces.map((p, i) => (
            <figure key={p.id} style={{ margin: 0, textAlign: "center", transform: `translateY(${i % 2 ? 10 : 0}px)` }}>
              <blockquote
                style={{
                  margin: "0 0 10px", position: "relative", background: "#fffdf7",
                  border: "1px solid rgba(66,53,33,0.14)", borderRadius: 14,
                  padding: "10px 12px", fontSize: 12, lineHeight: 1.5, color: INK_SOFT,
                  fontStyle: "italic", boxShadow: "0 2px 6px rgba(66,53,33,0.07)",
                }}
              >
                {(ar ? p.quoteAr : p.quote).split(" ").slice(0, 8).join(" ")}
                {(ar ? p.quoteAr : p.quote).split(" ").length > 8 ? "..." : ""}
              </blockquote>
              <img
                src={p.photo}
                alt={ar ? p.nameAr : p.name}
                loading="lazy"
                style={{
                  width: 52, height: 52, borderRadius: "50%", objectFit: "cover", objectPosition: p.pos,
                  filter: "grayscale(1) sepia(0.28) contrast(1.05)",
                  border: "2px solid rgba(66,53,33,0.25)",
                }}
              />
              <figcaption style={{ fontSize: 11, fontWeight: 700, color: INK_SOFT, marginTop: 5 }}>
                {ar ? p.nameAr : p.name}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ══ Feature: the editor ══ */}
      <FeatureBlock
        ar={ar}
        serif={serif}
        kicker={ar ? "المحرر" : "The editor"}
        title={ar ? "صفحة بيضاء ما بتخوّف بعد اليوم" : "A blank page that helps you fill it"}
        body={ar
          ? "محرر بشكل صفحات كتاب حقيقية، يحفظ لحاله أول بأول. إملاء صوتي، تنسيق كامل، ومساعد ذكاء اصطناعي يقترح ويكمل ويراجع وأنت صاحب القرار دائماً."
          : "Pages that look like a real book, saving as you type. Voice dictation, full formatting, and an AI partner that suggests, continues, and reviews while you stay in charge."}
        cta={ar ? "ابدأ كتابك" : "Start your book"}
        onCta={onStartWriting}
      >
        <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid rgba(66,53,33,0.18)", boxShadow: "0 18px 44px -18px rgba(41,33,21,0.45)" }}>
          <img src="/images/devices-showcase-dark.jpg" alt="" loading="lazy" style={{ display: "block", width: "100%" }} />
        </div>
      </FeatureBlock>

      {/* ══ Feature: cover designer with LIVE mini covers ══ */}
      <FeatureBlock
        ar={ar}
        serif={serif}
        flip
        kicker={ar ? "مصمم الغلاف" : "Cover designer"}
        title={ar ? "غلاف يليق بقصتك" : "A cover your story deserves"}
        body={ar
          ? "قوالب جاهزة تظهر باسم كتابك أنت، خطوط عربية حقيقية، وتوليد لوحات فنية بالذكاء الاصطناعي. صدّر بجودة الطباعة من تلفونك."
          : "Templates previewed with your actual title, real Arabic typography, and AI-generated artwork. Print-quality export from your phone."}
        cta={ar ? "جرب المصمم" : "Try the designer"}
        onCta={onStartWriting}
      >
        <MiniCoversRow ar={ar} />
      </FeatureBlock>

      {/* ══ Feature: the free course ══ */}
      <FeatureBlock
        ar={ar}
        serif={serif}
        kicker={ar ? "الكورس" : "The course"}
        title={ar ? "تعلّم صنعة الكتابة من الصفر" : "Learn the craft from zero"}
        body={ar
          ? "32 درساً في 6 وحدات: من الفكرة الأولى حتى النشر، بفيديوهات وتمارين وبطاقات مراجعة وشهادة إتمام. مجاني بالكامل، بدون أي قيود."
          : "32 lessons across 6 modules: from first idea to publishing, with videos, exercises, flashcards, and a completion certificate. Completely free."}
        cta={ar ? "افتح الكورس" : "Open the course"}
        onCta={() => navigate("/course")}
      >
        <PhoneFrame src="/images/landing/course.jpg" alt="" />
      </FeatureBlock>

      {/* ══ Dark rhythm section: the libraries ══ */}
      <section style={{ background: ESPRESSO, color: PAPER, padding: "48px 22px 54px", marginTop: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(244,239,226,0.5)", textAlign: "center", margin: "0 0 10px" }}>
          {ar ? "مكتبات كاملة، ببلاش" : "Full libraries, free"}
        </p>
        <h2 style={{ fontFamily: serif, fontSize: ar ? 27 : 29, fontWeight: ar ? 700 : 560 as any, lineHeight: ar ? 1.5 : 1.2, textAlign: "center", margin: "0 0 14px", color: "#f7f2e4" }}>
          {ar ? "الكاتب الجيد قارئ نهم" : "Good writers are hungry readers"}
        </h2>
        <p style={{ fontSize: ar ? 14.5 : 15, lineHeight: 1.7, color: "rgba(244,239,226,0.62)", textAlign: "center", maxWidth: 340, margin: "0 auto 26px" }}>
          {ar
            ? "أكثر من 19 ألف كتاب صوتي، كلاسيكيات عالمية، مكتبة عربية كاملة من تراث هنداوي، وكوميكس مصورة. كلها داخل بلوتزي."
            : "More than 19,000 audiobooks, world classics, a full Arabic heritage library, and classic comics. All inside Plotzy."}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <PhoneFrame src="/images/landing/audio.jpg" alt="" dark small />
          <PhoneFrame src="/images/landing/comics.jpg" alt="" dark small />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 26 }}>
          {(ar
            ? [["كتب صوتية", Headphones], ["كلاسيكيات", BookOpen], ["كورس مجاني", GraduationCap], ["ذكاء اصطناعي", Sparkles]]
            : [["Audiobooks", Headphones], ["Classics", BookOpen], ["Free course", GraduationCap], ["AI studio", Sparkles]]
          ).map(([label, Icon]: any) => (
            <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid rgba(244,239,226,0.22)", borderRadius: 999, padding: "7px 13px", fontSize: 12, fontWeight: 600, color: "rgba(244,239,226,0.85)" }}>
              <Icon size={13} /> {label}
            </span>
          ))}
        </div>
      </section>

      {/* ══ Testimonials strip ══ */}
      <section style={{ padding: "44px 0 10px" }}>
        <h2 style={{ fontFamily: serif, fontSize: ar ? 26 : 28, fontWeight: ar ? 700 : 560 as any, textAlign: "center", margin: "0 22px 22px", lineHeight: ar ? 1.5 : 1.2 }}>
          {ar ? "أشخاص حقيقيون كتبوا هنا" : "Real people write here"}
        </h2>
        <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "4px 18px 18px", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
          {TESTIMONIALS.slice(4).map((p) => (
            <article
              key={p.id}
              style={{
                flex: "0 0 auto", width: 270, scrollSnapAlign: "start",
                background: "#fffdf7", border: "1px solid rgba(66,53,33,0.14)",
                borderRadius: 18, padding: "18px 17px",
                boxShadow: "0 3px 10px rgba(66,53,33,0.07)",
              }}
            >
              <p style={{ margin: "0 0 14px", fontFamily: ar ? SF : SERIF_EN, fontStyle: "italic", fontSize: ar ? 13.5 : 14.5, lineHeight: 1.65, color: INK_SOFT }}>
                {ar ? p.quoteAr : p.quote}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img src={p.photo} alt="" loading="lazy" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", objectPosition: p.pos, filter: "grayscale(1) sepia(0.28)" }} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>{ar ? p.nameAr : p.name}</div>
                  <div style={{ fontSize: 11, color: MUTED }}>{ar ? p.roleAr : p.role}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ══ Final call ══ */}
      <section style={{ padding: "36px 22px 64px", textAlign: "center" }}>
        <div style={{ maxWidth: 360, margin: "0 auto", background: PAPER_DEEP, border: "1px solid rgba(66,53,33,0.14)", borderRadius: 22, padding: "34px 24px", boxShadow: "0 10px 30px -14px rgba(41,33,21,0.3)" }}>
          <h2 style={{ fontFamily: serif, fontSize: ar ? 27 : 29, fontWeight: ar ? 700 : 560 as any, lineHeight: ar ? 1.5 : 1.2, margin: "0 0 12px" }}>
            {ar ? "كتابك الأول يبدأ بجملة" : "Your first book starts with one sentence"}
          </h2>
          <p style={{ fontSize: ar ? 14 : 15, lineHeight: 1.65, color: MUTED, margin: "0 0 22px" }}>
            {ar ? "اكتبها اليوم، وبلوتزي يهتم بكل الباقي." : "Write it today. Plotzy takes care of the rest."}
          </p>
          <button
            onClick={onStartWriting}
            style={{
              width: "100%", padding: "15px 20px", borderRadius: 12, border: "none",
              background: GREEN, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: SF,
              boxShadow: "0 8px 22px -8px rgba(38,173,95,0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
            }}
          >
            {ar ? "ابدأ الكتابة مجاناً" : "Start writing for free"}
          </button>
          <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 14 }}>
            {(ar ? ["مجاني", "بالعربية والإنجليزية", "من أي جهاز"] : ["Free", "Arabic and English", "Any device"]).map((f) => (
              <span key={f} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: MUTED }}>
                <Check size={11} style={{ color: GREEN }} /> {f}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Floating CTA ══ */}
      <button
        onClick={onStartWriting}
        aria-hidden={!floatCta}
        style={{
          position: "fixed",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 18px)",
          insetInlineEnd: 16,
          zIndex: 60,
          display: "flex", alignItems: "center", gap: 8,
          background: GREEN_DARK, color: "#fff", border: "none", borderRadius: 999,
          padding: "13px 20px", fontSize: 14.5, fontWeight: 700, fontFamily: SF,
          boxShadow: "0 12px 30px -8px rgba(29,148,80,0.65)",
          cursor: "pointer",
          transform: floatCta ? "translateY(0)" : "translateY(90px)",
          opacity: floatCta ? 1 : 0,
          transition: "transform 260ms cubic-bezier(0.16,1,0.3,1), opacity 200ms",
          pointerEvents: floatCta ? "auto" : "none",
        }}
      >
        <PenLine size={15} />
        {ar ? "ابدأ مجاناً" : "Start free"}
      </button>
    </div>
  );
}

/* ── Feature section: kicker, serif title, body, CTA link, media ── */
function FeatureBlock({
  ar, serif, kicker, title, body, cta, onCta, flip, children,
}: {
  ar: boolean; serif: string; kicker: string; title: string; body: string;
  cta: string; onCta: () => void; flip?: boolean; children: React.ReactNode;
}) {
  return (
    <section style={{ padding: "34px 22px 6px" }}>
      <div style={{ maxWidth: 380, margin: "0 auto" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED, margin: "0 0 8px", textAlign: ar ? "right" : "left" }}>
          {kicker}
        </p>
        <h2 style={{ fontFamily: serif, fontSize: ar ? 26 : 28, fontWeight: ar ? 700 : 560 as any, lineHeight: ar ? 1.5 : 1.2, letterSpacing: ar ? 0 : "-0.01em", margin: "0 0 12px", color: INK, textAlign: ar ? "right" : "left" }}>
          {title}
        </h2>
        <p style={{ fontSize: ar ? 14.5 : 15, lineHeight: 1.7, color: MUTED, margin: "0 0 18px", textAlign: ar ? "right" : "left" }}>
          {body}
        </p>
        <div style={{ marginBottom: 20 }}>{children}</div>
        <button
          onClick={onCta}
          style={{
            background: "transparent", border: "none", padding: 0, cursor: "pointer",
            fontSize: 14, fontWeight: 700, color: GREEN_DARK, fontFamily: SF,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          {cta} <span aria-hidden>{ar ? "←" : "→"}</span>
        </button>
      </div>
    </section>
  );
}

/* ── A product screenshot inside a slim phone frame ── */
function PhoneFrame({ src, alt, dark, small }: { src: string; alt: string; dark?: boolean; small?: boolean }) {
  return (
    <div
      style={{
        width: small ? 150 : 230,
        margin: small ? 0 : "0 auto",
        borderRadius: small ? 22 : 30,
        padding: 7,
        background: dark ? "#0d0b08" : "#1c1712",
        boxShadow: "0 20px 44px -16px rgba(41,33,21,0.5)",
        border: dark ? "1px solid rgba(244,239,226,0.14)" : "1px solid rgba(41,33,21,0.5)",
      }}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        style={{ display: "block", width: "100%", borderRadius: small ? 16 : 24 }}
      />
    </div>
  );
}

/* ── Three live template covers rendered from the real template data,
      with placeholder literary titles per language ── */
function MiniCoversRow({ ar }: { ar: boolean }) {
  const picks = useMemo(() => {
    const ids = ["romance-dusk", "scifi-orbit", "literary-cream"];
    const meta = ar
      ? [{ t: "الباب الذي لم يكن", a: "ليلى عساف" }, { t: "مدار أخير", a: "سامر نور" }, { t: "رسائل الشتاء", a: "هند خالد" }]
      : [{ t: "The Door That Never Was", a: "Laila Assaf" }, { t: "Final Orbit", a: "Samer Noor" }, { t: "Winter Letters", a: "Hind Khaled" }];
    return ids
      .map((id, i) => {
        const tpl = COVER_TEMPLATES.find((x) => x.id === id);
        return tpl ? { design: buildTemplateDesign(tpl, { title: meta[i].t, author: meta[i].a }, ar), key: id } : null;
      })
      .filter(Boolean) as { design: ReturnType<typeof buildTemplateDesign>; key: string }[];
  }, [ar]);

  const W = 104;
  const SCALE = W / 300;

  return (
    <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
      {picks.map(({ design, key }, i) => (
        <div
          key={key}
          style={{
            width: W, height: W * 1.5, borderRadius: 8, overflow: "hidden",
            border: "1px solid rgba(66,53,33,0.22)",
            boxShadow: "0 14px 30px -12px rgba(41,33,21,0.45)",
            transform: `rotate(${i === 0 ? -3 : i === 2 ? 3 : 0}deg) translateY(${i === 1 ? -6 : 0}px)`,
            position: "relative", flexShrink: 0,
          }}
        >
          {/* absolute left:0 pins the scaled face physically, so RTL
              cannot shove the oversized block out of the frame */}
          <div style={{ width: 300, height: 450, transform: `scale(${SCALE})`, transformOrigin: "top left", background: design.settings.front.background, position: "absolute", left: 0, top: 0 }}>
            {design.elements.filter((e: any) => e.face === "front").map((el: any) => {
              if (el.type === "shape") {
                return <div key={el.id} style={{ position: "absolute", left: el.x, top: el.y, width: el.width, height: el.height, background: el.fill, opacity: el.opacity ?? 1, borderRadius: el.borderRadius ?? 0 }} />;
              }
              if (el.type === "text") {
                return (
                  <div key={el.id} dir="auto" style={{ position: "absolute", left: el.x, top: el.y, width: el.width, height: el.height, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: el.fontSize, fontFamily: `"${el.fontFamily}", sans-serif`, fontWeight: el.fontWeight, color: el.color, lineHeight: el.lineHeight, letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined, overflow: "hidden" }}>
                    <span style={{ width: "100%" }}>{el.content}</span>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
