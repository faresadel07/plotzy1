// The laptop/desktop home, carrying the exact atmosphere of the phone
// home Faris approved: warm paper and espresso only, serif headlines
// with handwriting asides, the messy papers-stack hero with one
// straight synopsis card, library showcases with tilted cover fans,
// his pencil sketches for the features, the crumpled course note, the
// feedback hall of fame, scattered paper balls, and the yellow
// highlighter that sweeps across key words on scroll.
//
// Everything here is scaled UP for wide screens: two-column layouts,
// larger type, longer copy. home.tsx composes:
//   <DesktopHero/> → (signed-in workspace) → <DesktopSections/>

import { useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";
import { ClaudeIcon, GPTIcon, GeminiIcon, LlamaIcon } from "@/components/studio/icons";
import { INK, INK_SOFT, MUTED, ESPRESSO, PAPER_ON_DARK } from "@/components/mobile/palette";
import { SERIF_EN, SERIF_AR, HAND_EN, HAND_AR, ensureHomeFonts } from "@/components/mobile/fonts";
import { Mark } from "@/components/mobile/Marker";
import { PaperBall } from "@/components/mobile/PaperBall";
import { AUDIO_BOOKS, ENGLISH_BOOKS, ARABIC_BOOKS, type MobileBook } from "@/components/mobile/mobile-content";
import { COMICS, comicCover } from "@/lib/comics";
import { TESTIMONIALS } from "@/components/testimonials/testimonials-data";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

/* ── Shared bits ───────────────────────────────────────────────────── */

/* One paper card in the hero stack. */
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
        borderRadius: 16,
        boxShadow: "0 16px 38px -12px rgba(41,33,21,0.35)",
        padding: "18px 20px",
        textAlign: ar ? "right" : "left",
        overflow: "hidden",
        ...style,
      }}
    >
      {header && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" style={{ color: "#8a8070", flexShrink: 0 }}>
            <path d="M12 2 L13.8 9.2 L21 7 L15.5 12 L21 17 L13.8 14.8 L12 22 L10.2 14.8 L3 17 L8.5 12 L3 7 L10.2 9.2 Z" fill="currentColor" />
          </svg>
          <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8a8070" }}>{header}</span>
        </div>
      )}
      <div style={{ fontSize: 14.5, lineHeight: 1.75, color: INK_SOFT }}>{children}</div>
    </div>
  );
}

/* A phrase with a hand-drawn ellipse around it. */
function Circled({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ position: "relative", display: "inline-block", padding: "0 4px" }}>
      {children}
      <svg aria-hidden viewBox="0 0 120 44" preserveAspectRatio="none" style={{ position: "absolute", inset: "-9px -12px", width: "calc(100% + 24px)", height: "calc(100% + 18px)", pointerEvents: "none" }}>
        <ellipse cx="60" cy="22" rx="55" ry="17" fill="none" stroke="#5c5142" strokeWidth="2.2" strokeLinecap="round" transform="rotate(-2 60 22)" style={{ strokeDasharray: "260 40" }} />
      </svg>
    </span>
  );
}

const WRAP: React.CSSProperties = { maxWidth: 1180, margin: "0 auto", padding: "0 40px" };

/* ── 1. Hero: headline left, the messy papers stack right ──────────── */

export function DesktopHero({ ar, onStartWriting, onOpenCourse }: { ar: boolean; onStartWriting: () => void; onOpenCourse: () => void }) {
  useEffect(() => { ensureHomeFonts(); }, []);
  return (
    <section dir={ar ? "rtl" : "ltr"} style={{ fontFamily: SF }}>
      <div style={{ ...WRAP, display: "flex", gap: 64, alignItems: "center", padding: "64px 40px 28px" }}>

        {/* Text side */}
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          <h1 style={{ fontFamily: ar ? SERIF_AR : SERIF_EN, fontSize: ar ? 52 : 60, fontWeight: 700, letterSpacing: ar ? 0 : "-0.02em", lineHeight: ar ? 1.35 : 1.06, color: INK, margin: "0 0 18px" }}>
            {ar
              ? <>اكتب <Mark ar={ar} delay={350}>كتابك الأول</Mark></>
              : <>Write your <Mark ar={ar} delay={350}>first book</Mark></>}
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.7, color: MUTED, maxWidth: 460, margin: "0 0 12px" }}>
            {ar
              ? <>استوديو كتابة كامل مع مساعد ذكاء اصطناعي يخطط ويسوّد ويراجع جنبك، مصمم أغلفة يليق بقصتك، ومكتبات كاملة تقرأ وتسمع منها. <Mark ar={ar} delay={900}>كل شيء في مكان واحد.</Mark></>
              : <>A full writing studio with an AI partner that plots, drafts and reviews beside you, a cover designer worthy of your story, and complete libraries to read and listen from. <Mark ar={ar} delay={900}>All in one place.</Mark></>}
          </p>
          <p style={{ fontSize: 15.5, lineHeight: 1.7, color: MUTED, maxWidth: 440, margin: "0 0 26px" }}>
            {ar
              ? "بتكتب بالعربي أو بالإنجليزي، من تلفونك أو لابتوبك، وكل كلمة محفوظة ومتزامنة بين أجهزتك."
              : "Write in Arabic or English, from your phone or your laptop, with every word saved and in sync across your devices."}
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <button
              onClick={onStartWriting}
              style={{
                background: ESPRESSO, color: PAPER_ON_DARK, border: "none", borderRadius: 999,
                padding: "16px 34px", fontSize: 16, fontWeight: 700, fontFamily: SF, cursor: "pointer",
                boxShadow: "0 12px 28px -8px rgba(41,33,21,0.5)",
              }}
            >
              {ar ? "ابدأ الكتابة" : "Start writing"}
            </button>
            <button
              onClick={onOpenCourse}
              style={{
                background: "#fffdf7", color: INK_SOFT, border: "1px solid rgba(66,53,33,0.22)", borderRadius: 999,
                padding: "16px 30px", fontSize: 16, fontWeight: 600, fontFamily: SF, cursor: "pointer",
                boxShadow: "0 1px 2px rgba(66,53,33,0.06)",
              }}
            >
              {ar ? "الكورس المجاني" : "Free course"}
            </button>
          </div>
          <div style={{ fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 16 : 20, color: "#8a8070", transform: "rotate(-1.2deg)", display: "inline-block" }}>
            {ar ? "(من تلفونك أو لابتوبك، هلأ)" : "(from your phone or laptop, right now)"}
          </div>
        </div>

        {/* The papers stack: a messy desk of tilted drafts, with the
            synopsis card sitting perfectly straight on top of the chaos */}
        <div style={{ flex: "1.05 1 0", position: "relative", height: 560, minWidth: 0 }}>
          <svg aria-hidden width="52" height="32" viewBox="0 0 42 26" style={{ position: "absolute", top: 4, insetInlineStart: 8, opacity: 0.5 }}>
            <path d="M2 20 Q 12 4 26 8" fill="none" stroke="#5c5142" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M30 22 Q 36 16 40 18" fill="none" stroke="#5c5142" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <svg aria-hidden width="46" height="27" viewBox="0 0 38 22" style={{ position: "absolute", bottom: 12, insetInlineEnd: 10, opacity: 0.45, transform: "rotate(160deg)" }}>
            <path d="M2 16 Q 12 2 24 8" fill="none" stroke="#5c5142" strokeWidth="2.4" strokeLinecap="round" />
          </svg>

          {/* Deep scraps: manuscript fragments, badly stacked on purpose.
              They run long on purpose too; whatever slides under the
              synopsis card just reads as buried pages. */}
          <StackCard ar={ar} style={{ top: 0, insetInlineStart: -26, width: "62%", height: 150, transform: "rotate(-9deg)", zIndex: 1, opacity: 0.85 }}>
            {ar
              ? "مسودة أولى: في الصباح الذي بدأ فيه كل شيء، كانت المدينة لسا نايمة، وصوت المطر على الشباك بيكتب أول سطر عني. حطيت القهوة جنب الدفتر وقلت لنفسي: اليوم بلش، ولو بجملة وحدة..."
              : "First draft: on the morning it all began, the city was still asleep, and the rain on the window was writing the first line for me. I set the coffee beside the notebook and told myself: today it starts, even if with a single sentence..."}
          </StackCard>
          <StackCard ar={ar} style={{ top: 18, insetInlineEnd: -30, width: "62%", height: 160, transform: "rotate(8deg)", zIndex: 1, opacity: 0.9 }}>
            {ar
              ? "قصص من المجتمع، تقييمات حقيقية بالنجوم، تعليقات على كل فصل، وقرّاء بينتظروا كتابك الجاي. حدا بيقرأ اللي بتكتبه فعلاً، وبيرد عليك، وبيسألك: إيمتى الفصل الجاي؟"
              : "Community stories, real star ratings, comments on every chapter, and readers waiting for your next book. Someone actually reads what you write, writes back, and asks: when is the next chapter?"}
          </StackCard>
          <StackCard ar={ar} style={{ top: 190, insetInlineStart: -18, width: "56%", height: 140, transform: "rotate(6deg)", zIndex: 1, opacity: 0.85 }}>
            {ar
              ? "ملاحظة: البطل ما بيعرف إنه البيت مسكون بذكرياته هو، بس القارئ لازم يحس من أول مشهد. رجّع وصف المدخل، وخلي الصور المعلقة عالحيط مايلة شوي..."
              : "Note: the hero does not know the house is haunted by his own memories, but the reader must feel it from the first scene. Rewrite the hallway, and let the photos on the wall hang slightly crooked..."}
          </StackCard>

          <StackCard
            ar={ar}
            header={ar ? "المكتبات" : "The Libraries"}
            style={{ top: 120, insetInlineEnd: -22, width: "70%", height: 190, transform: "rotate(5.5deg)", zIndex: 2 }}
          >
            {ar
              ? "19 ألف كتاب مسموع من LibriVox، كلاسيكيات إنجليزية كاملة، 1300 كوميكس من العصر الذهبي، ومكتبة هنداوي العربية بأكملها. كلها جوّا بلوتزي، وكلها بقارئ مريح للعين."
              : "19,000 audiobooks from LibriVox, complete English classics, 1,300 golden age comics, and the full Hindawi Arabic library. All inside Plotzy, all in a reader that is easy on the eyes."}
          </StackCard>

          <StackCard
            ar={ar}
            header={ar ? "الكورس" : "The Course"}
            style={{ bottom: 44, insetInlineStart: -24, width: "66%", height: 168, transform: "rotate(-6.5deg)", zIndex: 2 }}
          >
            {ar
              ? "32 درساً في صنعة الكتابة، من الفكرة الأولى حتى النشر، بتمارين حقيقية وشهادة إتمام. مجاني ولن يصبح مدفوعاً."
              : "32 lessons on the craft, from first idea to publishing, with real exercises and a certificate. Free, and it stays free."}
          </StackCard>
          <StackCard ar={ar} style={{ bottom: 0, insetInlineEnd: -28, width: "60%", height: 130, transform: "rotate(-7deg)", zIndex: 1, opacity: 0.85 }}>
            {ar
              ? "فصل 7: الباب الذي لم يفتحه أحد منذ عشرين سنة كان اليوم مفتوحاً على آخره، والغبار على العتبة عليه أثر خطوات صغيرة..."
              : "Chapter 7: the door no one had opened in twenty years stood wide open today, and the dust on the threshold held a trail of small footsteps..."}
          </StackCard>

          {/* The main synopsis card: the ONLY straight one, facing you.
              Five typefaces share the page like a real writer's desk. */}
          <StackCard
            ar={ar}
            header={ar ? "لمحة" : "Synopsis"}
            style={{ top: 128, insetInlineStart: "13%", width: "74%", transform: "rotate(0deg)", zIndex: 3, padding: "24px 26px", boxShadow: "0 24px 52px -14px rgba(41,33,21,0.45)" }}
          >
            <p style={{ margin: "0 0 10px", fontFamily: ar ? "'Amiri', serif" : "'Lora', Georgia, serif", fontSize: ar ? 19.5 : 19, fontWeight: 700, color: INK, lineHeight: 1.55 }}>
              {ar ? "بلوتزي استوديو كتابة كامل:" : "Plotzy is a full writing studio:"}
            </p>
            <p style={{ margin: "0 0 10px", fontWeight: 600, fontSize: 15.5, lineHeight: 1.7 }}>
              {ar
                ? "محرر بصفحات كتاب حقيقية، ومساعد ذكاء اصطناعي يخطط ويسوّد ويراجع جنبك."
                : "An editor with real book pages, and an AI partner that plots, drafts and reviews beside you."}
            </p>
            <p style={{ margin: "0 0 10px", fontFamily: ar ? "'Noto Naskh Arabic', serif" : "'Courier New', monospace", fontWeight: 600, fontSize: ar ? 16 : 14.5, lineHeight: 1.7 }}>
              {ar ? "مصمم أغلفة يليق بقصتك," : "A cover designer worthy of your story,"}
            </p>
            <p style={{ margin: "0 0 12px", fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 18 : 22, color: "#5c5142", lineHeight: 1.5 }}>
              {ar ? "ونشر بضغطة واحدة." : "and one-tap publishing."}
            </p>
            <p style={{ margin: 0, fontFamily: ar ? "'Amiri', serif" : "Georgia, serif", fontStyle: "italic", fontWeight: 600, fontSize: ar ? 17 : 15.5, color: INK, lineHeight: 1.65 }}>
              {ar
                ? "بتكتب بالعربي أو بالإنجليزي، من تلفونك أو لابتوبك، وكل كلمة محفوظة ومتزامنة."
                : "Write in Arabic or English, from your phone or laptop, every word saved and in sync."}
            </p>
          </StackCard>

          {/* Crumpled balls resting against the pile */}
          <PaperBall size={74} rot={12} style={{ position: "absolute", bottom: -8, insetInlineEnd: 16, zIndex: 4 }} />
          <PaperBall size={40} rot={-25} style={{ position: "absolute", top: 84, insetInlineStart: 6, zIndex: 4 }} />
          <PaperBall size={28} rot={40} style={{ position: "absolute", bottom: 52, insetInlineStart: 52, zIndex: 4 }} />
        </div>
      </div>

      {/* Quick destinations */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", padding: "10px 40px 6px" }}>
        {(ar
          ? [["الكورس المجاني", "/course"], ["كتب صوتية", "/audiolibrary"], ["كوميكس", "/comics"], ["المكتبة العربية", "/discover?src=hindawi"], ["مكتبة المجتمع", "/library"]]
          : [["Free course", "/course"], ["Audiobooks", "/audiolibrary"], ["Comics", "/comics"], ["Arabic library", "/discover?src=hindawi"], ["Community", "/library"]]
        ).map(([label, href]) => (
          <ChipLink key={href} label={label} href={href} />
        ))}
      </div>
    </section>
  );
}

function ChipLink({ label, href }: { label: string; href: string }) {
  const [, navigate] = useLocation();
  return (
    <button
      onClick={() => navigate(href)}
      style={{
        padding: "11px 22px", borderRadius: 999,
        background: "#fffdf7", border: "1px solid rgba(66,53,33,0.18)",
        color: "#423521", fontSize: 14, fontWeight: 600, fontFamily: SF,
        cursor: "pointer", boxShadow: "0 1px 2px rgba(66,53,33,0.05)",
      }}
    >
      {label}
    </button>
  );
}

/* ── 2. Library showcase: cover fan on one side, story on the other ── */

interface ShowcaseProps {
  ar: boolean;
  dark?: boolean;
  flip?: boolean;
  /** Compact vertical card for the three-in-a-row libraries strip. */
  compact?: boolean;
  kicker: string; kickerAr: string;
  title: string; titleAr: string;
  sub: string; subAr: string;
  cta: string; ctaAr: string;
  href: string;
  covers: [string, string, string];
  note?: string; noteAr?: string;
}

function ShowcaseDesktop({ ar, dark = false, flip = false, compact = false, kicker, kickerAr, title, titleAr, sub, subAr, cta, ctaAr, href, covers, note, noteAr }: ShowcaseProps) {
  const [, navigate] = useLocation();
  const serif = ar ? SERIF_AR : SERIF_EN;

  const coverCard = (src: string, style: React.CSSProperties, dim = false) => (
    <div
      style={{
        position: "absolute",
        width: compact ? 118 : 180,
        aspectRatio: "2 / 3",
        borderRadius: compact ? 10 : 12,
        overflow: "hidden",
        boxShadow: dark ? "0 20px 44px -12px rgba(0,0,0,0.6)" : "0 20px 44px -12px rgba(41,33,21,0.4)",
        border: dark ? "1px solid rgba(244,239,226,0.14)" : "1px solid rgba(66,53,33,0.16)",
        background: dark ? "#3a2f1e" : "#e7dfcc",
        ...style,
      }}
    >
      <img src={src} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      {dim && <div aria-hidden style={{ position: "absolute", inset: 0, background: dark ? "rgba(41,33,21,0.35)" : "rgba(244,239,226,0.28)" }} />}
    </div>
  );

  if (compact) {
    // Vertical card: fan on top, story under it, like the phone
    // showcase but one third of the row.
    return (
      <div
        dir={ar ? "rtl" : "ltr"}
        style={{
          background: dark ? "#292115" : "#ece5d2",
          border: dark ? "1px solid rgba(66,53,33,0.35)" : "1px solid rgba(66,53,33,0.14)",
          borderRadius: 28,
          padding: "34px 26px 26px",
          textAlign: "center",
          overflow: "hidden",
          boxShadow: dark ? "0 18px 40px -18px rgba(20,16,10,0.5)" : "0 10px 26px -14px rgba(41,33,21,0.2)",
          display: "flex",
          flexDirection: "column",
          fontFamily: SF,
        }}
      >
        <div style={{ position: "relative", height: 232, marginBottom: 20 }}>
          {coverCard(covers[0], { top: 28, left: "50%", marginLeft: -152, transform: "rotate(-10deg)" }, true)}
          {coverCard(covers[2], { top: 28, left: "50%", marginLeft: 36, transform: "rotate(10deg)" }, true)}
          {coverCard(covers[1], { top: 0, left: "50%", marginLeft: -70, width: 140, zIndex: 2, borderRadius: 12 })}
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: dark ? "rgba(244,239,226,0.5)" : "#7b7366", marginBottom: 10 }}>
          {ar ? kickerAr : kicker}
        </div>
        <h2 style={{ fontFamily: serif, fontSize: ar ? 25 : 27, fontWeight: 700, lineHeight: ar ? 1.5 : 1.2, letterSpacing: ar ? 0 : "-0.01em", color: dark ? "#f7f2e4" : "#2f2618", margin: "0 0 10px" }}>
          {ar ? titleAr : title}
        </h2>
        <p style={{ fontSize: ar ? 13.5 : 14.5, lineHeight: 1.7, color: dark ? "rgba(244,239,226,0.6)" : "#7b7366", maxWidth: 300, margin: `0 auto ${note ? 8 : 18}px` }}>
          {ar ? subAr : sub}
        </p>
        {note && (
          <div style={{ fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 13.5 : 17, color: dark ? "rgba(244,239,226,0.5)" : "#8a8070", marginBottom: 14, transform: "rotate(-1deg)" }}>
            {ar ? (noteAr || note) : note}
          </div>
        )}
        <button
          onClick={() => navigate(href)}
          style={{
            marginTop: "auto",
            width: "100%",
            background: dark ? "#f7f2e4" : "#292115",
            color: dark ? "#221b11" : "#f7f2e4",
            border: "none",
            borderRadius: 12,
            padding: "14px 20px",
            fontSize: 14.5,
            fontWeight: 700,
            fontFamily: SF,
            cursor: "pointer",
            boxShadow: dark
              ? "0 10px 24px -8px rgba(20,16,10,0.6), inset 0 1px 0 rgba(255,255,255,0.35)"
              : "0 10px 24px -8px rgba(41,33,21,0.5), inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
        >
          {ar ? ctaAr : cta}
        </button>
      </div>
    );
  }

  return (
    <section dir={ar ? "rtl" : "ltr"} style={{ ...WRAP, marginBottom: 36, fontFamily: SF }}>
      <div
        style={{
          background: dark ? "#292115" : "#ece5d2",
          border: dark ? "1px solid rgba(66,53,33,0.35)" : "1px solid rgba(66,53,33,0.14)",
          borderRadius: 32,
          padding: "54px 58px",
          overflow: "hidden",
          boxShadow: dark ? "0 22px 48px -18px rgba(20,16,10,0.5)" : "0 12px 30px -14px rgba(41,33,21,0.2)",
          display: "flex",
          gap: 56,
          alignItems: "center",
          flexDirection: flip ? "row-reverse" : "row",
        }}
      >
        {/* Tilted covers fan */}
        <div style={{ flex: "1 1 0", position: "relative", height: 360, minWidth: 0 }}>
          {coverCard(covers[0], { top: 44, left: "50%", marginLeft: -238, transform: "rotate(-10deg)" }, true)}
          {coverCard(covers[2], { top: 44, left: "50%", marginLeft: 58, transform: "rotate(10deg)" }, true)}
          {coverCard(covers[1], { top: 0, left: "50%", marginLeft: -110, width: 220, zIndex: 2, borderRadius: 14 })}
        </div>

        {/* The story */}
        <div style={{ flex: "1 1 0", minWidth: 0, textAlign: ar ? "right" : "left" }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: dark ? "rgba(244,239,226,0.5)" : "#7b7366", marginBottom: 12 }}>
            {ar ? kickerAr : kicker}
          </div>
          <h2 style={{ fontFamily: serif, fontSize: ar ? 38 : 42, fontWeight: 700, lineHeight: ar ? 1.45 : 1.15, letterSpacing: ar ? 0 : "-0.015em", color: dark ? "#f7f2e4" : "#2f2618", margin: "0 0 14px" }}>
            {ar ? titleAr : title}
          </h2>
          <p style={{ fontSize: ar ? 15.5 : 16.5, lineHeight: 1.75, color: dark ? "rgba(244,239,226,0.6)" : "#7b7366", maxWidth: 460, margin: `0 0 ${note ? 10 : 22}px` }}>
            {ar ? subAr : sub}
          </p>
          {note && (
            <div style={{ fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 15.5 : 19, color: dark ? "rgba(244,239,226,0.5)" : "#8a8070", marginBottom: 18, transform: "rotate(-1deg)" }}>
              {ar ? (noteAr || note) : note}
            </div>
          )}
          <button
            onClick={() => navigate(href)}
            style={{
              background: dark ? "#f7f2e4" : "#292115",
              color: dark ? "#221b11" : "#f7f2e4",
              border: "none",
              borderRadius: 14,
              padding: "16px 36px",
              fontSize: 15.5,
              fontWeight: 700,
              fontFamily: SF,
              cursor: "pointer",
              boxShadow: dark
                ? "0 10px 24px -8px rgba(20,16,10,0.6), inset 0 1px 0 rgba(255,255,255,0.35)"
                : "0 10px 24px -8px rgba(41,33,21,0.5), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            {ar ? ctaAr : cta}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── 3. AI writing studio banner ───────────────────────────────────── */

function AiWriteBannerDesktop({ ar, onStart }: { ar: boolean; onStart: () => void }) {
  const Arrow = ar ? ArrowLeft : ArrowRight;
  return (
    <div style={{ ...WRAP, marginBottom: 36, fontFamily: SF }}>
      <div
        dir={ar ? "rtl" : "ltr"}
        style={{
          border: "1px solid rgba(66,53,33,0.3)",
          borderRadius: 32,
          padding: "52px 58px",
          textAlign: ar ? "right" : "left",
          background:
            "radial-gradient(90% 120% at 0% 0%, rgba(217,119,87,0.26), transparent 45%)," +
            "radial-gradient(90% 120% at 100% 100%, rgba(66,133,244,0.16), transparent 45%)," +
            "#292115",
          boxShadow: "0 20px 44px -14px rgba(41,33,21,0.5)",
          display: "flex",
          gap: 56,
          alignItems: "center",
        }}
      >
        <div style={{ flex: "1.3 1 0", minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(244,239,226,0.55)", marginBottom: 12 }}>
            {ar ? "استوديو الكتابة" : "AI Writing Studio"}
          </div>
          <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.02em", color: "#f7f2e4", lineHeight: 1.15, marginBottom: 14, maxWidth: 480 }}>
            {ar ? "اكتب كتابك مع Claude" : "Write your book with Claude"}
          </div>
          <div style={{ fontSize: 16.5, color: "rgba(244,239,226,0.62)", lineHeight: 1.7, marginBottom: 12, maxWidth: 520 }}>
            {ar
              ? "Claude يساعدك بكل شيء في كتابتك: يخطط الحبكة معك، يسوّد المشاهد الصعبة، ويحرّر إلى جانبك سطراً سطراً. بتحكي معه عن قصتك وهو فاهم فصولك كلها."
              : "Claude helps with everything in your writing. It plots with you, drafts the hard scenes, and edits beside you line by line. You talk about your story and it knows every chapter."}
          </div>
          <div style={{ fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 15.5 : 19, color: "rgba(244,239,226,0.55)", marginBottom: 22, transform: "rotate(-1deg)" }}>
            {ar ? "(وتبقى كل كلمة ملكك)" : "(and you own every word)"}
          </div>
          <button
            onClick={onStart}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#f7f2e4", color: "#221b11", border: "none", borderRadius: 14,
              padding: "16px 34px", fontSize: 15.5, fontWeight: 700, fontFamily: SF, cursor: "pointer",
              boxShadow: "0 10px 24px -8px rgba(20,16,10,0.6), inset 0 1px 0 rgba(255,255,255,0.35)",
              flexDirection: ar ? "row-reverse" : "row",
            }}
          >
            {ar ? "ابدأ الكتابة" : "Start writing"} <Arrow size={17} />
          </button>
        </div>

        {/* Claude tile + the models that come next */}
        <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <div style={{ width: 132, height: 132, borderRadius: 32, background: "rgba(217,119,87,0.14)", border: "1px solid rgba(217,119,87,0.30)", display: "grid", placeItems: "center" }}>
            <ClaudeIcon size={68} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#f7f2e4", letterSpacing: "-0.01em" }}>Claude</div>
            <div style={{ fontSize: 13, color: "rgba(244,239,226,0.55)" }}>{ar ? "رفيقك في الكتابة" : "Your writing partner"}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(244,239,226,0.45)" }}>
              {ar ? "قريباً" : "Soon"}
            </span>
            {[GPTIcon, GeminiIcon, LlamaIcon].map((Icon, i) => (
              <div key={i} style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(244,239,226,0.08)", border: "1px solid rgba(244,239,226,0.14)", display: "grid", placeItems: "center", opacity: 0.5 }}>
                <Icon size={18} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 4. Scattered prose slips ──────────────────────────────────────── */

const SNIPPETS_AR = [
  "طفت شظايا الذاكرة على سطح ذهنه كما يطفو الحطام: صوت جدّه، ورائحة المطر على إسفلت عمّان، وباب خشبيّ لم يفتحه أحد منذ عشرين سنة.",
  "وقفت الفتاة عند حافة السطح، والمدينة تحتها تشتعل بأضواء لا تعرف أسماء أصحابها. كانت تشبه شعلة صغيرة تبحث عن حريق يليق بها.",
  "في الليلة التي قرّر فيها أن يكتب، لم يكن يملك سوى دفتر أزرق ونصف فكرة. وكان ذلك كافياً تماماً.",
  "قالت له أمه مرة إن الحكايات بيوت، وإن على الكاتب أن يترك الباب مفتوحاً كي يدخل الغرباء ويتدفأوا. ظل طوال عمره يبني بيوتاً من ورق.",
];

const SNIPPETS_EN = [
  "Fragments of memory bobbed to the surface of his mind like flotsam: his grandfather's voice, the smell of rain on Amman asphalt, a wooden door no one had opened in twenty years.",
  "The girl stood at the edge of the rooftop, the city below her burning with lights that belonged to strangers. She looked like a small flame searching for a fire worthy of her.",
  "On the night he decided to write, he owned nothing but a blue notebook and half an idea. It turned out to be exactly enough.",
  "His mother once told him stories were houses, and a writer's job was to leave the door open so strangers could come in from the cold. He spent his whole life building houses out of paper.",
];

function SnippetsFanDesktop({ ar }: { ar: boolean }) {
  const snippets = ar ? SNIPPETS_AR : SNIPPETS_EN;
  const serif = ar ? SERIF_AR : SERIF_EN;

  const slip = (text: string, style: React.CSSProperties) => (
    <div
      dir={ar ? "rtl" : "ltr"}
      style={{
        position: "absolute",
        background: "#fffdf7",
        border: "1px solid rgba(66,53,33,0.12)",
        borderRadius: 8,
        padding: "20px 24px",
        boxShadow: "0 14px 32px -10px rgba(41,33,21,0.35)",
        fontFamily: serif,
        fontSize: ar ? 15.5 : 16,
        lineHeight: 1.8,
        color: "#3a3020",
        ...style,
      }}
    >
      {text}
    </div>
  );

  return (
    <section style={{ marginBottom: 40, overflow: "hidden" }}>
      <div style={{ textAlign: "center", padding: "0 40px", marginBottom: 8, position: "relative" }}>
        <span style={{ fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 19 : 24, color: "#8a8070", display: "inline-block", transform: "rotate(-1.5deg)" }}>
          {ar ? "(اه، كلود ساعد بكتابة هدول فعلاً)" : "(yep, Claude helped write these!)"}
        </span>
        <svg aria-hidden width="38" height="27" viewBox="0 0 34 24" style={{ display: "inline-block", marginInlineStart: 10, verticalAlign: "middle", opacity: 0.55 }}>
          <path d="M6 14 Q 16 24 28 12" fill="none" stroke="#8a8070" strokeWidth="2" strokeLinecap="round" />
          <circle cx="10" cy="6" r="1.6" fill="#8a8070" />
          <circle cx="24" cy="4" r="1.6" fill="#8a8070" />
        </svg>
      </div>

      {/* Four slips across the full width, edges cut by the screen */}
      <div style={{ position: "relative", height: 280, maxWidth: 1600, margin: "0 auto" }}>
        {slip(snippets[0], { top: 20, insetInlineStart: -50, width: 400, transform: `rotate(${ar ? 5 : -5}deg)` })}
        {slip(snippets[1], { top: 66, insetInlineStart: "26%", width: 400, transform: `rotate(${ar ? -3 : 3}deg)`, zIndex: 2 })}
        {slip(snippets[3], { top: 8, insetInlineStart: "52%", width: 410, transform: `rotate(${ar ? 2.5 : -2.5}deg)` })}
        {slip(snippets[2], { top: 110, insetInlineEnd: -46, width: 380, transform: `rotate(${ar ? -4 : 4}deg)`, zIndex: 2 })}
        <PaperBall size={46} rot={30} style={{ position: "absolute", top: 6, insetInlineEnd: "30%", zIndex: 3 }} />
        <PaperBall size={30} rot={-15} style={{ position: "absolute", bottom: 8, insetInlineStart: "20%", zIndex: 3 }} />
      </div>
    </section>
  );
}

/* ── 5. Everything your book needs (his sketches, no boxes) ────────── */

function JourneyDesktop({ ar, onStartWriting }: { ar: boolean; onStartWriting: () => void }) {
  const [, navigate] = useLocation();

  type Item = { img: string; title: string; sub: string; onTap: () => void };

  // Laptop screens have room, so every line under a sketch tells the
  // fuller story instead of the phone's short hint.
  const whileWriting: Item[] = [
    {
      img: "ai-partner", title: ar ? "مساعد ذكاء اصطناعي" : "An AI partner",
      sub: ar ? "يخطط الحبكة معك، يسوّد المشاهد الصعبة، ويراجع فصولك سطراً سطراً وهو فاهم قصتك كلها" : "plots with you, drafts the hard scenes, and reviews your chapters line by line while knowing your whole story",
      onTap: onStartWriting,
    },
    {
      img: "voice", title: ar ? "اكتب بصوتك" : "Write with your voice",
      sub: ar ? "احكِ أفكارك وأنت ماشي أو سايق، وبلوتزي يحوّل كلامك لنص مرتب جاهز للتحرير" : "talk your ideas out while you walk or drive, and Plotzy turns your words into clean text ready for editing",
      onTap: onStartWriting,
    },
    {
      img: "pages", title: ar ? "صفحات كتاب حقيقية" : "Real book pages",
      sub: ar ? "اختار من 4 مقاسات طباعة حقيقية، والصفحات بتنقسم لحالها بنفس سعة الكتاب المطبوع" : "choose from 4 real print trim sizes, and the pages split themselves at the exact capacity of the printed book",
      onTap: onStartWriting,
    },
    {
      img: "partner", title: ar ? "اكتب مع شريك" : "Write with a partner",
      sub: ar ? "ادعُ محرراً أو مؤلفاً مشاركاً لجلسات كتابة مباشرة، كل واحد بيشوف كتابة الثاني لحظة بلحظة" : "invite an editor or co-author to live writing sessions where each of you sees the other typing in real time",
      onTap: () => navigate("/dashboard"),
    },
    {
      img: "saves", title: ar ? "ولا كلمة بتضيع" : "Not a word gets lost",
      sub: ar ? "حفظ لحظي مع كل ضغطة، سجل إصدارات كامل ترجع له وقت ما بدك، ونسخ طوارئ لو انقطع النت" : "instant saves on every keystroke, a full version history you can roll back to, and crash drafts if the connection drops",
      onTap: onStartWriting,
    },
  ];

  const afterWriting: Item[] = [
    {
      img: "cover", title: ar ? "غلاف يليق بقصتك" : "A cover worthy of it",
      sub: ar ? "قوالب جاهزة بخطوط عربية وإنجليزية فاخرة، ولوحات مرسومة بالذكاء الاصطناعي على مزاج قصتك" : "ready templates with fine Arabic and English type, and AI artwork painted to match the mood of your story",
      onTap: () => navigate("/dashboard"),
    },
    {
      img: "publish", title: ar ? "انشر بضغطة" : "Publish in one tap",
      sub: ar ? "انشر للقراء بمكتبة المجتمع أو ابعته للناشرين، وصدّر نسخ PDF وDOCX جاهزة للطباعة" : "publish to readers in the community library or send it to publishers, and export print-ready PDF and DOCX copies",
      onTap: () => navigate("/dashboard"),
    },
    {
      img: "audiobook", title: ar ? "حوّله لكتاب صوتي" : "Make it an audiobook",
      sub: ar ? "حوّل فصولك لكتاب مسموع بأصوات طبيعية، فصلاً فصلاً، وقرّاؤك بيسمعوه من نفس الصفحة" : "turn your chapters into a narrated audiobook with natural voices, chapter by chapter, right on the book page",
      onTap: () => navigate("/dashboard"),
    },
    {
      img: "readers", title: ar ? "قرّاء حقيقيون" : "Real readers",
      sub: ar ? "تقييمات بالنجوم وتعليقات على كل فصل من مجتمع بيقرأ فعلاً، وبيستنى كتابك الجاي" : "star ratings and comments on every chapter from a community that actually reads, and waits for your next book",
      onTap: () => navigate("/library"),
    },
    {
      img: "inkwell", title: ar ? "تقدّمك محسوب" : "Progress that counts",
      sub: ar ? "كلمات اليوم، سلاسل الكتابة اليومية، وإنجازات بتفتحها كل ما كبر كتابك ومشوارك" : "daily word counts, writing streaks, and achievements that unlock as your book and your craft grow",
      onTap: () => navigate("/dashboard"),
    },
  ];

  const renderItems = (items: Item[]) => (
    <div style={{ display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap" }}>
      {items.map(({ img, title, sub, onTap }, i) => (
        <button
          key={i}
          onClick={onTap}
          style={{
            width: 236,
            textAlign: "center",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontFamily: SF,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          }}
        >
          <img
            src={`/images/sketches/${img}.png`}
            alt=""
            aria-hidden
            loading="lazy"
            style={{ width: 148, height: "auto", mixBlendMode: "multiply", opacity: 0.9, display: "block", marginBottom: 6 }}
          />
          <span style={{ display: "block", fontSize: 17, fontWeight: 800, color: "#2f2618", letterSpacing: "-0.01em", lineHeight: 1.3 }}>
            {title}
          </span>
          <span style={{ display: "block", fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 14 : 16.5, color: "#6d6354", lineHeight: 1.55, maxWidth: 236 }}>
            {sub}
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <section dir={ar ? "rtl" : "ltr"} style={{ ...WRAP, maxWidth: 1150, marginBottom: 44, fontFamily: SF }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#7b7366", marginBottom: 10 }}>
          {ar ? "أكثر من محرّر" : "More than an editor"}
        </div>
        <div style={{ fontFamily: ar ? SERIF_AR : SERIF_EN, fontSize: ar ? 40 : 44, fontWeight: 700, lineHeight: ar ? 1.45 : 1.15, color: "#2f2618" }}>
          {ar
            ? <>كل ما يحتاجه <Mark ar={ar}>كتابك</Mark></>
            : <>Everything <Mark ar={ar}>your book</Mark> needs</>}
        </div>
      </div>
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <span style={{ fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 16 : 20, color: "#8a8070", display: "inline-block", transform: "rotate(-1.2deg)" }}>
          {ar ? "(كل شي بمكان واحد، بجد)" : "(everything in one place, really)"}
        </span>
      </div>

      <div style={{ fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 18 : 22, color: "#5c5142", margin: "0 0 14px", textAlign: ar ? "right" : "left" }}>
        {ar ? "وأنت تكتب:" : "while you write:"}
      </div>
      {renderItems(whileWriting)}

      <div style={{ fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 18 : 22, color: "#5c5142", margin: "30px 0 14px", textAlign: ar ? "right" : "left" }}>
        {ar ? "وبعد ما تخلص:" : "and after the last page:"}
      </div>
      {renderItems(afterWriting)}

      {/* Trust footnote — Writer Protection */}
      <button
        onClick={() => navigate("/protection")}
        style={{
          margin: "22px auto 0",
          display: "flex", alignItems: "center", gap: 9,
          flexDirection: ar ? "row-reverse" : "row",
          background: "transparent", border: "none", cursor: "pointer",
          padding: "10px 4px", fontFamily: SF,
        }}
      >
        <ShieldCheck size={16} color="#7b7366" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13.5, color: "#7b7366" }}>
          {ar ? "مخطوطتك تبقى ملكك دائماً. تعرّف على حماية الكاتب" : "Your manuscript always stays yours. See Writer Protection"}
        </span>
      </button>
    </section>
  );
}

/* ── 6. From the community ─────────────────────────────────────────── */

function CommunityStripDesktop({ ar }: { ar: boolean }) {
  const [, navigate] = useLocation();
  const books: MobileBook[] = [...ARABIC_BOOKS.slice(4), ...ENGLISH_BOOKS.slice(4)].slice(0, 8);
  return (
    <section dir={ar ? "rtl" : "ltr"} style={{ ...WRAP, marginBottom: 44, fontFamily: SF }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
        <h2 style={{ fontFamily: ar ? SERIF_AR : SERIF_EN, fontSize: ar ? 28 : 30, fontWeight: 700, color: "#2f2618", margin: 0 }}>
          {ar ? "من المجتمع" : "From the Community"}
        </h2>
        <button
          onClick={() => navigate("/library")}
          style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#7b7366", fontFamily: SF }}
        >
          {ar ? "عرض الكل ‹" : "See all ›"}
        </button>
      </div>
      <div style={{ fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 15 : 18, color: "#8a8070", marginBottom: 18, transform: "rotate(-0.8deg)", display: "inline-block" }}>
        {ar ? "(كتب كتبها ناس متلك، من جوّا بلوتزي)" : "(books written by people like you, inside Plotzy)"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 16 }}>
        {books.map((b, i) => (
          <button
            key={i}
            onClick={() => navigate(b.href)}
            style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: ar ? "right" : "left", fontFamily: SF, minWidth: 0 }}
          >
            <div style={{ aspectRatio: "2 / 3", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(66,53,33,0.14)", boxShadow: "0 10px 22px -10px rgba(41,33,21,0.35)", background: "#e7dfcc", marginBottom: 8 }}>
              <img src={b.cover} alt={b.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#2f2618", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
            <div style={{ fontSize: 11.5, color: "#7b7366", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ar ? (b.genreAr || b.genre || b.author) : (b.genre || b.author)}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ── 7. Feedback hall of fame (three-column chat wall) ─────────────── */

function FeedbackWallDesktop({ ar }: { ar: boolean }) {
  const serif = ar ? SERIF_AR : SERIF_EN;
  return (
    <section id="testimonials" dir={ar ? "rtl" : "ltr"} style={{ ...WRAP, maxWidth: 1150, marginBottom: 48, fontFamily: SF, scrollMarginTop: 70 }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: MUTED, marginBottom: 14 }}>
          {ar ? "لا تاخذ الكلام مننا" : "Don't take our word for it"}
        </div>
        <h2 style={{ fontFamily: serif, fontSize: ar ? 40 : 46, fontWeight: 700, lineHeight: ar ? 1.45 : 1.15, color: INK, margin: "0 0 14px" }}>
          {ar
            ? <>قاعة <Mark ar={ar}>مشاهير</Mark> الفيدباك</>
            : <>Feedback <Mark ar={ar}>hall of fame</Mark></>}
        </h2>
        <p style={{ fontFamily: serif, fontSize: ar ? 16.5 : 18.5, lineHeight: 1.6, color: MUTED, maxWidth: 420, margin: "0 auto" }}>
          {ar ? "شوية حكي حلو قاله ناس بيستخدموا بلوتزي فعلاً" : "These are some nice things people who use Plotzy have said"}
        </p>
      </div>

      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <span style={{ fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 16.5 : 21, color: "#8a8070", display: "inline-block", transform: "rotate(-1.5deg)" }}>
          {ar ? "(كلام حقيقي، من ناس حقيقيين، بإذنهم)" : "(real words, real people, with their permission)"}
        </span>
      </div>

      {/* Masonry wall: CSS columns keep every card whole */}
      <div style={{ columnCount: 3, columnGap: 16 }}>
        {TESTIMONIALS.map((t, i) => {
          const cluster = [1, 2, 3].map((k) => TESTIMONIALS[(i + k) % TESTIMONIALS.length]);
          return (
            <article
              key={t.id}
              style={{
                breakInside: "avoid",
                marginBottom: 16,
                background: "#fffdf7",
                border: "1px solid rgba(66,53,33,0.13)",
                borderRadius: 18,
                padding: "20px 20px 16px",
                boxShadow: "0 6px 18px -8px rgba(41,33,21,0.18)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
                <img
                  src={t.photo}
                  alt={ar ? t.nameAr : t.name}
                  loading="lazy"
                  style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", objectPosition: t.pos, display: "block", flexShrink: 0 }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {ar ? t.nameAr : t.name}
                    </span>
                    {t.time && <span dir="ltr" style={{ fontSize: 11, color: MUTED, flexShrink: 0 }}>{t.time}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {ar ? t.roleAr : t.role}
                  </div>
                </div>
              </div>

              <p style={{ fontSize: ar ? 14.5 : 15, lineHeight: 1.7, color: INK_SOFT, margin: "0 0 13px", whiteSpace: "pre-line" }}>
                {ar ? (t.quoteLongAr || t.quoteAr) : (t.quoteLong || t.quote)}
              </p>

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

/* ── 8. The free course: crumpled note + his sketch, side by side ──── */

function CourseDesktop({ ar }: { ar: boolean }) {
  const [, navigate] = useLocation();
  const Arrow = ar ? ArrowLeft : ArrowRight;

  return (
    <section dir={ar ? "rtl" : "ltr"} style={{ ...WRAP, maxWidth: 1100, marginBottom: 52, fontFamily: SF }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7b7366", marginBottom: 24, textAlign: "center" }}>
        {ar ? "دورة الكتابة المجّانيّة" : "Free Writing Course"}
      </div>

      <div style={{ display: "flex", gap: 60, alignItems: "center" }}>
        {/* The crumpled typewriter note */}
        <div
          style={{
            flex: "1 1 0",
            minWidth: 0,
            position: "relative",
            backgroundImage: "linear-gradient(rgba(246,240,226,0.4), rgba(246,240,226,0.4)), url(/images/crumpled-paper.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            border: "1px solid rgba(66,53,33,0.16)",
            borderRadius: 4,
            boxShadow: "0 18px 38px -14px rgba(41,33,21,0.35)",
            padding: "34px 30px 28px",
            transform: "rotate(-1.2deg)",
            textAlign: ar ? "right" : "left",
          }}
        >
          <p style={{ fontFamily: ar ? "'Amiri', serif" : "'Courier New', monospace", fontSize: ar ? 17 : 15.5, lineHeight: ar ? 2 : 1.9, color: "#3a3020", margin: "0 0 18px" }}>
            {ar
              ? "بقدر أعلّمك تكتب كتابك الأول: من الفكرة، للحبكة، لمسودة كاملة ما بتنهار من نصّها."
              : "I can teach you to write your first book: from the idea, to the plot, to a full draft that does not collapse in the middle."}
          </p>
          <p style={{ fontFamily: ar ? "'Amiri', serif" : "'Courier New', monospace", fontSize: ar ? 17 : 15.5, lineHeight: ar ? 2 : 1.9, color: "#3a3020", margin: "0 0 18px" }}>
            {ar
              ? <>32 درساً. 6 وحدات. تمارين حقيقية. وشهادة بالآخر. والأهم: <Circled>مجاني بالكامل</Circled>.</>
              : <>32 lessons. 6 modules. Real exercises. A certificate at the end. And the part that matters: <Circled>completely free</Circled>.</>}
          </p>
          <p style={{ fontFamily: ar ? "'Amiri', serif" : "'Courier New', monospace", fontSize: ar ? 16 : 14.5, lineHeight: 1.9, color: "#b3402e", margin: 0 }}>
            {ar ? "هذا ليس عرضاً مؤقتاً. رح يضل مجاني." : "This is not a limited offer. It stays free."}
          </p>
          <div style={{ fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 16 : 21, color: "#8a8070", textAlign: ar ? "left" : "right", marginTop: 12, transform: "rotate(-1deg)" }}>
            {ar ? "(ليش؟ لأنه حدا لازم يعلّم)" : "(why? because someone has to teach)"}
          </div>
          <PaperBall size={52} rot={20} style={{ position: "absolute", top: -24, insetInlineEnd: -12 }} />
        </div>

        {/* His sketch + five lines + the call to action */}
        <button
          onClick={() => navigate("/course")}
          style={{ flex: "1 1 0", minWidth: 0, background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "center", fontFamily: SF }}
        >
          <img
            src="/images/sketches/course.png"
            alt=""
            aria-hidden
            loading="lazy"
            style={{ width: 280, height: "auto", mixBlendMode: "multiply", opacity: 0.92, display: "block", margin: "0 auto 12px" }}
          />
          <div dir={ar ? "rtl" : "ltr"} style={{ maxWidth: 380, margin: "0 auto" }}>
            <p style={{ margin: "0 0 5px", fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em", color: "#2f2618", fontFamily: SF }}>
              {ar ? "كورس صناعة الكتابة من بلوتزي" : "The Plotzy writing course"}
            </p>
            <p style={{ margin: "0 0 8px", fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 16.5 : 21, color: "#5c5142", lineHeight: 1.5 }}>
              {ar ? "من الفكرة الأولى لآخر صفحة" : "from the first idea to the last page"}
            </p>
            <p style={{ margin: "0 0 8px", fontSize: 15.5, fontWeight: 600, color: "#423521", lineHeight: 1.6, fontFamily: SF }}>
              {ar ? "32 درساً على 6 وحدات، بتمارين حقيقية." : "32 lessons across 6 modules, with real exercises."}
            </p>
            <p style={{ margin: "0 0 8px", fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 16.5 : 21, color: "#5c5142", lineHeight: 1.5, transform: "rotate(-1deg)" }}>
              {ar ? "بمشي معك خطوة خطوة" : "it walks with you step by step"}
            </p>
            <p style={{ margin: 0, fontSize: 15.5, fontWeight: 600, color: "#423521", lineHeight: 1.6, fontFamily: SF }}>
              {ar
                ? <>وبنهايته <Mark ar={ar}>شهادة إتمام باسمك</Mark>.</>
                : <>and at the end, <Mark ar={ar}>a certificate with your name</Mark>.</>}
            </p>
          </div>
          <div
            style={{
              marginTop: 26,
              display: "inline-flex", alignItems: "center", gap: 9,
              background: "#292115", color: "#f7f2e4", borderRadius: 999,
              padding: "16px 38px", fontSize: 15.5, fontWeight: 700,
              flexDirection: ar ? "row-reverse" : "row",
              boxShadow: "0 10px 26px -8px rgba(41,33,21,0.5)",
            }}
          >
            {ar ? "ابدأ الدورة" : "Start the course"} <Arrow size={17} />
          </div>
        </button>
      </div>
    </section>
  );
}

/* ── 9. Write anywhere (closing espresso beat) ─────────────────────── */

function DevicesDesktop({ ar }: { ar: boolean }) {
  return (
    <div style={{ background: "#292115", padding: "68px 40px 56px" }}>
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em", color: "#f7f2e4", lineHeight: 1.2, marginBottom: 12, fontFamily: SF }}>
          {ar ? "اكتب من أي مكان. قصّتك معك دائماً." : "Write anywhere. Your story comes with you."}
        </div>
        <div style={{ fontSize: 16, color: "rgba(244,239,226,0.62)", lineHeight: 1.6, maxWidth: 560, margin: "0 auto", fontFamily: SF }}>
          {ar
            ? "على مكتبك أو على جهازك اللوحي أو تلفونك، بلوتزي يتبعك. مزامنة سحابيّة وحفظ لحظي، وكل فصل بستناك مكان ما تركته."
            : "At your desk, on your iPad, or on your phone, Plotzy follows you. Cloud sync and instant saving, with every chapter waiting exactly where you left it."}
        </div>
      </div>
      <img
        src="/images/devices-showcase-dark.jpg"
        alt={ar ? "بلوتزي على الآيباد والحاسوب" : "Plotzy on iPad and laptop"}
        loading="lazy"
        style={{ width: "100%", maxWidth: 980, height: "auto", display: "block", margin: "0 auto", borderRadius: 22, border: "1px solid rgba(244,239,226,0.12)" }}
      />
    </div>
  );
}

/* ── Composition of everything after the workspace ─────────────────── */

export function DesktopSections({ ar, onStartWriting }: { ar: boolean; onStartWriting: () => void }) {
  return (
    <div style={{ paddingTop: 34 }}>
      {/* The three libraries share one row, all on light paper, so the
          page reads as one warm surface instead of stacked slabs. */}
      <div style={{ ...WRAP, marginBottom: 36, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, alignItems: "stretch" }}>
        <ShowcaseDesktop
          ar={ar}
          compact
          kicker="Audio Library"
          kickerAr="المكتبة الصوتية"
          title="19,000 audiobooks"
          titleAr="19 ألف كتاب مسموع"
          sub="Novels and classics read aloud by real voices from LibriVox. Listen while you walk or drive, and pick up on any device exactly where the last sentence left you."
          subAr="روايات وكلاسيكيات بأصوات حقيقية من LibriVox. اسمع وأنت ماشي أو سايق، وكمّل من أي جهاز من نفس الجملة اللي وقفت عندها."
          cta="Open the audio library"
          ctaAr="افتح المكتبة الصوتية"
          href="/audiolibrary"
          note="(listen while you drive)"
          noteAr="(اسمع وانت سايق)"
          covers={[AUDIO_BOOKS[0].cover, AUDIO_BOOKS[1].cover, AUDIO_BOOKS[3].cover]}
        />
        <ShowcaseDesktop
          ar={ar}
          compact
          kicker="English Classics"
          kickerAr="كلاسيكيات إنجليزية"
          title="Every classic you postponed"
          titleAr="كل كلاسيكية أجّلتها"
          sub="Pride and Prejudice, Frankenstein, Dracula, Sherlock Holmes and hundreds more. Complete, beautifully typeset, and easy on the eyes at two in the morning."
          subAr="كبرياء وهوى، فرانكنشتاين، دراكولا، شيرلوك هولمز ومئات غيرها. كاملة، بتنسيق مريح، وما بتتعب عينيك حتى بالليل."
          cta="Browse the classics"
          ctaAr="تصفح الكلاسيكيات"
          href="/discover"
          note="(pick one and sink in)"
          noteAr="(اختار وحدة وغطس فيها)"
          covers={[ENGLISH_BOOKS[0].cover, ENGLISH_BOOKS[1].cover, ENGLISH_BOOKS[3].cover]}
        />
        {COMICS.length > 2 && (
          <ShowcaseDesktop
            ar={ar}
            compact
            kicker="Classic Comics"
            kickerAr="كوميكس كلاسيكية"
            title="1,300 golden age comics"
            titleAr="1300 كوميكس من العصر الذهبي"
            sub="Adventure, sci-fi, and heroes from the fifties, in full color pages, exactly as they were printed. A whole era of stories waiting in your browser."
            subAr="مغامرات وخيال علمي وأبطال من الخمسينات، بصفحات ملونة كاملة متل ما انطبعت. حقبة كاملة من القصص مستنياك."
            cta="Open the comics"
            ctaAr="افتح الكوميكس"
            href="/comics"
            note="(from the fifties!)"
            noteAr="(من الخمسينات!)"
            covers={[comicCover(COMICS[2].id), comicCover(COMICS[0].id), comicCover(COMICS[3].id)]}
          />
        )}
      </div>

      {/* stray drafts between the shelves */}
      <div style={{ position: "relative", height: 0, zIndex: 3, maxWidth: 1180, margin: "0 auto" }}>
        <PaperBall size={50} rot={18} style={{ position: "absolute", top: -24, insetInlineEnd: 26 }} />
        <PaperBall size={30} rot={-30} style={{ position: "absolute", top: -12, insetInlineStart: 40 }} />
      </div>

      <ShowcaseDesktop
        ar={ar}
        flip
        kicker="Arabic Library"
        kickerAr="المكتبة العربية"
        title="A full Arabic heritage library"
        titleAr="تراث عربي كامل، بين إيديك"
        sub="Taha Hussein, Jurji Zaydan, al-Maalouf and more. The full Hindawi library inside Plotzy, in a clean Arabic reader built for long reading sessions."
        subAr="طه حسين، جرجي زيدان، والمعلوف وغيرهم. مكتبة هنداوي كاملة داخل بلوتزي، بقارئ عربي نظيف مبني لجلسات قراءة طويلة."
        cta="Open the Arabic library"
        ctaAr="افتح المكتبة العربية"
        href="/discover?src=hindawi"
        note="(heritage that keeps breathing)"
        noteAr="(تراث لسا بيتنفس)"
        covers={[ARABIC_BOOKS[2].cover, ARABIC_BOOKS[4].cover, ARABIC_BOOKS[5].cover]}
      />

      {/* drafts tossed beside the Arabic shelf */}
      <div style={{ position: "relative", height: 0, zIndex: 3, maxWidth: 1180, margin: "0 auto" }}>
        <PaperBall size={40} rot={-22} style={{ position: "absolute", top: -26, insetInlineStart: 18 }} />
        <PaperBall size={26} rot={35} style={{ position: "absolute", top: -12, insetInlineStart: 66 }} />
      </div>

      <AiWriteBannerDesktop ar={ar} onStart={onStartWriting} />

      <SnippetsFanDesktop ar={ar} />

      <JourneyDesktop ar={ar} onStartWriting={onStartWriting} />

      {/* a couple of failed drafts before the community shelf */}
      <div style={{ position: "relative", height: 0, zIndex: 3, maxWidth: 1180, margin: "0 auto" }}>
        <PaperBall size={48} rot={14} style={{ position: "absolute", top: -18, insetInlineEnd: 24 }} />
      </div>

      <CommunityStripDesktop ar={ar} />

      {/* A stray draft ball before the feedback wall */}
      <div style={{ position: "relative", height: 0, zIndex: 3, maxWidth: 1150, margin: "0 auto" }}>
        <PaperBall size={54} rot={-18} style={{ position: "absolute", top: -14, insetInlineStart: 30 }} />
      </div>

      <FeedbackWallDesktop ar={ar} />

      <CourseDesktop ar={ar} />

      {/* Two draft balls resting before the closing dark section */}
      <div style={{ position: "relative", height: 0, zIndex: 3, maxWidth: 1180, margin: "0 auto" }}>
        <PaperBall size={44} rot={24} style={{ position: "absolute", top: -40, insetInlineEnd: 70 }} />
        <PaperBall size={30} rot={-40} style={{ position: "absolute", top: -20, insetInlineEnd: 130 }} />
      </div>

      <DevicesDesktop ar={ar} />
    </div>
  );
}
