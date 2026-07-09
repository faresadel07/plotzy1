// Large full-width promotional cards for the mobile home, in the
// spirit of Apple TV's "Explore MLS" banner.
//
//   AiWriteBanner  — pitches AI-assisted writing, showing the official
//                    provider marks (Claude, GPT, Gemini) so writers
//                    see exactly which models power the studio.
//   DonateBanner   — a warm, low-pressure nudge toward the donate page.

import { useLocation } from "wouter";
import { ClaudeIcon, GPTIcon, GeminiIcon, LlamaIcon } from "@/components/studio/icons";
import {
  Heart, ArrowRight, ArrowLeft, GraduationCap, Mic, BookUp, Headphones, Users,
  ShieldCheck, ChevronRight, ChevronLeft, Sparkles, BookOpen, Palette, History,
  MessageSquare, Trophy,
} from "lucide-react";
import { HAND_EN, HAND_AR, SERIF_EN, SERIF_AR } from "./fonts";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export function AiWriteBanner({ ar, onStart }: { ar: boolean; onStart: () => void }) {
  const Arrow = ar ? ArrowLeft : ArrowRight;
  return (
    <div style={{ padding: "0 16px", marginBottom: 26 }}>
      <button
        onClick={onStart}
        dir={ar ? "rtl" : "ltr"}
        style={{
          width: "100%",
          border: "1px solid rgba(66,53,33,0.3)",
          borderRadius: 20,
          padding: "24px 22px",
          cursor: "pointer",
          fontFamily: SF,
          textAlign: ar ? "right" : "left",
          background:
            "radial-gradient(120% 120% at 0% 0%, rgba(217,119,87,0.26), transparent 45%)," +
            "radial-gradient(120% 120% at 100% 100%, rgba(66,133,244,0.16), transparent 45%)," +
            "#292115",
          boxShadow: "0 16px 36px -14px rgba(41,33,21,0.5)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Claude leads: mark + name + role */}
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 16, flexDirection: ar ? "row-reverse" : "row" }}>
          <div style={{ ...badgeStyle, width: 40, height: 40, borderRadius: 12, background: "rgba(217,119,87,0.14)", border: "1px solid rgba(217,119,87,0.30)" }}>
            <ClaudeIcon size={22} />
          </div>
          <div style={{ textAlign: ar ? "right" : "left" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#f7f2e4", letterSpacing: "-0.01em" }}>Claude</div>
            <div style={{ fontSize: 11.5, color: "rgba(244,239,226,0.55)" }}>{ar ? "رفيقك في الكتابة" : "Your writing partner"}</div>
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(244,239,226,0.55)", marginBottom: 8 }}>
          {ar ? "استوديو الكتابة" : "AI Writing Studio"}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: "#f7f2e4", lineHeight: 1.2, marginBottom: 8, maxWidth: 300 }}>
          {ar ? "اكتب كتابك مع Claude" : "Write your book with Claude"}
        </div>
        <div style={{ fontSize: 13.5, color: "rgba(244,239,226,0.62)", lineHeight: 1.5, marginBottom: 16, maxWidth: 320 }}>
          {ar
            ? "Claude يساعدك بكل شيء في كتابتك: يخطّط، يسوّد، ويحرّر إلى جانبك. وتبقى كل كلمة ملكك."
            : "Claude helps with everything in your writing. It plots, drafts, and edits beside you, and you own every word."}
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, color: "#f7f2e4" }}>
          {ar ? "ابدأ الكتابة" : "Start writing"} <Arrow size={16} />
        </span>

        {/* Other models — coming soon */}
        <div style={{ marginTop: 20, paddingTop: 14, borderTop: "1px solid rgba(244,239,226,0.1)", display: "flex", alignItems: "center", gap: 9, flexDirection: ar ? "row-reverse" : "row" }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(244,239,226,0.45)" }}>
            {ar ? "قريباً" : "Soon"}
          </span>
          <div style={{ ...badgeStyle, opacity: 0.5 }}><GPTIcon size={16} /></div>
          <div style={{ ...badgeStyle, opacity: 0.5 }}><GeminiIcon size={16} /></div>
          <div style={{ ...badgeStyle, opacity: 0.5 }}><LlamaIcon size={16} /></div>
        </div>
      </button>
    </div>
  );
}

export function DonateBanner({ ar }: { ar: boolean }) {
  const [, navigate] = useLocation();
  const Arrow = ar ? ArrowLeft : ArrowRight;
  return (
    <div style={{ padding: "0 16px", marginBottom: 26 }}>
      <button
        onClick={() => navigate("/pricing")}
        dir={ar ? "rtl" : "ltr"}
        style={{
          width: "100%",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 20,
          padding: "22px",
          cursor: "pointer",
          fontFamily: SF,
          textAlign: ar ? "right" : "left",
          background:
            "radial-gradient(120% 120% at 100% 0%, rgba(244,63,94,0.2), transparent 50%),#292115",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexDirection: ar ? "row-reverse" : "row",
        }}
      >
        <div
          style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: "rgba(244,63,94,0.16)", border: "1px solid rgba(244,63,94,0.3)",
            display: "grid", placeItems: "center",
          }}
        >
          <Heart size={22} color="#fb7185" fill="#fb7185" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#f7f2e4", marginBottom: 3 }}>
            {ar ? "بلوتزي مجاني للجميع" : "Plotzy is free for everyone"}
          </div>
          <div style={{ fontSize: 12.5, color: "rgba(244,239,226,0.62)", lineHeight: 1.45 }}>
            {ar ? "لو أعجبك، تبرّعك يبقيه مجّاناً للكتّاب الآخرين." : "If it helps you, a donation keeps it free for other writers."}
          </div>
        </div>
        <Arrow size={18} color="rgba(244,239,226,0.55)" style={{ flexShrink: 0 }} />
      </button>
    </div>
  );
}

export function CourseBanner({ ar }: { ar: boolean }) {
  const [, navigate] = useLocation();
  const Arrow = ar ? ArrowLeft : ArrowRight;
  return (
    <div style={{ padding: "0 16px", marginBottom: 26 }}>
      <button
        onClick={() => navigate("/course")}
        dir={ar ? "rtl" : "ltr"}
        style={{
          width: "100%",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 20,
          padding: "22px",
          cursor: "pointer",
          fontFamily: SF,
          textAlign: ar ? "right" : "left",
          background:
            "radial-gradient(120% 120% at 0% 0%, rgba(56,132,255,0.18), transparent 50%),#292115",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexDirection: ar ? "row-reverse" : "row",
        }}
      >
        <div
          style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: "rgba(56,132,255,0.16)", border: "1px solid rgba(56,132,255,0.3)",
            display: "grid", placeItems: "center",
          }}
        >
          <GraduationCap size={22} color="#5eb3ff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#f7f2e4", marginBottom: 3 }}>
            {ar ? "دورة الكتابة المجانيّة" : "Free Writing Course"}
          </div>
          <div style={{ fontSize: 12.5, color: "rgba(244,239,226,0.62)", lineHeight: 1.45 }}>
            {ar ? "تعلّم كيف تخطّط وتكتب وتنشر كتابك خطوة بخطوة." : "Learn to plot, write, and publish your book, step by step."}
          </div>
        </div>
        <Arrow size={18} color="rgba(244,239,226,0.55)" style={{ flexShrink: 0 }} />
      </button>
    </div>
  );
}

// "Write anywhere" showcase — the same iPad + laptop image the desktop
// landing uses, framed for the phone. Purely visual (no CTA); it sits
// near the bottom of the mobile home as a closing beat.
export function DevicesBanner({ ar }: { ar: boolean }) {
  return (
    <div style={{ background: "#292115", padding: "34px 16px 26px", marginBottom: 8 }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.02em", color: "#f7f2e4", lineHeight: 1.2, marginBottom: 8 }}>
          {ar ? "اكتب من أي مكان. قصّتك معك دائماً." : "Write anywhere. Your story comes with you."}
        </div>
        <div style={{ fontSize: 13.5, color: "rgba(244,239,226,0.62)", lineHeight: 1.5, maxWidth: 340, margin: "0 auto" }}>
          {ar
            ? "على مكتبك أو على جهازك اللوحي، بلوتزي يتبعك. مزامنة سحابيّة وحفظ لحظي."
            : "At your desk or on your iPad, Plotzy follows you. Cloud sync and instant saving."}
        </div>
      </div>
      {/* The shot has a black background, so it gets its own rounded
          dark card inside the espresso section instead of pretending to
          be full-bleed. */}
      <img
        src="/images/devices-showcase-dark.jpg"
        alt={ar ? "بلوتزي على الآيباد والحاسوب" : "Plotzy on iPad and laptop"}
        loading="lazy"
        style={{ width: "100%", height: "auto", display: "block", borderRadius: 18, border: "1px solid rgba(244,239,226,0.12)" }}
      />
    </div>
  );
}

const badgeStyle: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 10,
  background: "rgba(244,239,226,0.08)", border: "1px solid rgba(244,239,226,0.14)",
  display: "grid", placeItems: "center",
};

// ─── "Everything your book needs" ───────────────────────────────────
//
// One compact Apple-style feature grid that surfaces the services the
// home otherwise never mentions: voice dictation, publishing, the
// audiobook pipeline, and co-writing. Communication first; each card
// still taps through to the most sensible surface. A quiet Writer
// Protection line closes the section as a trust signal.

export function BookJourneyGrid({ ar, onStartWriting }: { ar: boolean; onStartWriting: () => void }) {
  const [, navigate] = useLocation();
  const Chevron = ar ? ChevronLeft : ChevronRight;

  type Card = { Icon: typeof Mic; title: string; sub: string; onTap: () => void };

  // Two chapters of the writer's journey, browns only, no tints.
  const whileWriting: Card[] = [
    {
      Icon: Sparkles,
      title: ar ? "مساعد ذكاء اصطناعي" : "An AI partner",
      sub: ar ? "يخطط ويسوّد ويراجع جنبك" : "Plots, drafts, and reviews beside you",
      onTap: onStartWriting,
    },
    {
      Icon: Mic,
      title: ar ? "اكتب بصوتك" : "Write with your voice",
      sub: ar ? "احكِ وبلوتزي يكتب عنك" : "Talk and Plotzy types for you",
      onTap: onStartWriting,
    },
    {
      Icon: BookOpen,
      title: ar ? "صفحات كتاب حقيقية" : "Real book pages",
      sub: ar ? "4 مقاسات طباعة والصفحات تنقسم لحالها" : "4 trim sizes, pages that split themselves",
      onTap: onStartWriting,
    },
    {
      Icon: Users,
      title: ar ? "اكتب مع شريك" : "Write with a partner",
      sub: ar ? "جلسات مباشرة مع محرر أو مؤلف" : "Live sessions with an editor or co-author",
      onTap: () => navigate("/dashboard"),
    },
    {
      Icon: History,
      title: ar ? "ولا كلمة بتضيع" : "Not a word gets lost",
      sub: ar ? "حفظ لحظي، إصدارات، ونسخ طوارئ" : "Instant saves, versions, crash drafts",
      onTap: onStartWriting,
    },
    {
      Icon: GraduationCap,
      title: ar ? "كورس يعلّمك الصنعة" : "A course that teaches the craft",
      sub: ar ? "32 درساً وشهادة، مجاناً" : "32 lessons and a certificate, free",
      onTap: () => navigate("/course"),
    },
  ];

  const afterWriting: Card[] = [
    {
      Icon: Palette,
      title: ar ? "غلاف يليق بقصتك" : "A cover worthy of it",
      sub: ar ? "قوالب بخطوط عربية ولوحات AI" : "Templates, Arabic type, AI artwork",
      onTap: () => navigate("/dashboard"),
    },
    {
      Icon: BookUp,
      title: ar ? "انشر بضغطة" : "Publish in one tap",
      sub: ar ? "للقراء والناشرين، وصدّر PDF وDOCX" : "Readers, publishers, PDF and DOCX export",
      onTap: () => navigate("/dashboard"),
    },
    {
      Icon: Headphones,
      title: ar ? "حوّله لكتاب صوتي" : "Make it an audiobook",
      sub: ar ? "فصولك مسموعة بضغطة" : "Your chapters, narrated",
      onTap: () => navigate("/dashboard"),
    },
    {
      Icon: MessageSquare,
      title: ar ? "قرّاء حقيقيون" : "Real readers",
      sub: ar ? "تقييمات وتعليقات من المجتمع" : "Ratings and comments from the community",
      onTap: () => navigate("/library"),
    },
    {
      Icon: Trophy,
      title: ar ? "تقدّمك محسوب" : "Progress that counts",
      sub: ar ? "كلمات اليوم، سلاسل، وإنجازات" : "Daily words, streaks, achievements",
      onTap: () => navigate("/dashboard"),
    },
    {
      Icon: Heart,
      title: ar ? "كله ببلاش" : "All of it free",
      sub: ar ? "بدون بطاقة وبدون حدود" : "No card and no limits",
      onTap: () => navigate("/pricing"),
    },
  ];

  const renderCards = (cards: Card[]) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {cards.map(({ Icon, title, sub, onTap }, i) => (
        <button
          key={i}
          onClick={onTap}
          style={{
            textAlign: ar ? "right" : "left",
            background: "#fffdf7",
            border: "1px solid rgba(66,53,33,0.15)",
            borderRadius: 16,
            padding: "15px 14px 14px",
            cursor: "pointer",
            fontFamily: SF,
            boxShadow: "0 6px 16px -8px rgba(41,33,21,0.18)",
            display: "flex", flexDirection: "column", alignItems: ar ? "flex-end" : "flex-start", gap: 10,
          }}
        >
          <span
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: "#292115",
              display: "grid", placeItems: "center", color: "#f7f2e4",
            }}
          >
            <Icon size={16} />
          </span>
          <span>
            <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "#2f2618", letterSpacing: "-0.01em", lineHeight: 1.3, marginBottom: 3 }}>
              {title}
            </span>
            <span style={{ display: "block", fontSize: 11.5, color: "#7b7366", lineHeight: 1.45 }}>
              {sub}
            </span>
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <section dir={ar ? "rtl" : "ltr"} style={{ padding: "0 16px", marginBottom: 26, fontFamily: SF }}>
      {/* Heading */}
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#7b7366", marginBottom: 8 }}>
          {ar ? "أكثر من محرّر" : "More than an editor"}
        </div>
        <div style={{ fontFamily: ar ? SERIF_AR : SERIF_EN, fontSize: ar ? 26 : 28, fontWeight: 700, lineHeight: ar ? 1.45 : 1.15, color: "#2f2618" }}>
          {ar ? "كل ما يحتاجه كتابك" : "Everything your book needs"}
        </div>
      </div>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <span style={{ fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 14 : 17, color: "#8a8070", display: "inline-block", transform: "rotate(-1.2deg)" }}>
          {ar ? "(كل شي بمكان واحد، بجد)" : "(everything in one place, really)"}
        </span>
      </div>

      {/* Chapter one: while you write */}
      <div style={{ fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 15 : 18, color: "#5c5142", margin: "0 0 8px", textAlign: ar ? "right" : "left" }}>
        {ar ? "وأنت تكتب:" : "while you write:"}
      </div>
      {renderCards(whileWriting)}

      {/* Chapter two: after the last page */}
      <div style={{ fontFamily: ar ? HAND_AR : HAND_EN, fontSize: ar ? 15 : 18, color: "#5c5142", margin: "16px 0 8px", textAlign: ar ? "right" : "left" }}>
        {ar ? "وبعد ما تخلص:" : "and after the last page:"}
      </div>
      {renderCards(afterWriting)}

      {/* Trust footnote — Writer Protection */}
      <button
        onClick={() => navigate("/protection")}
        style={{
          width: "100%", marginTop: 10,
          display: "flex", alignItems: "center", gap: 9,
          flexDirection: ar ? "row-reverse" : "row",
          background: "transparent", border: "none", cursor: "pointer",
          padding: "10px 4px", fontFamily: SF,
        }}
      >
        <ShieldCheck size={15} color="#7b7366" style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: ar ? "right" : "left", fontSize: 12, color: "#7b7366" }}>
          {ar ? "مخطوطتك تبقى ملكك دائماً. تعرّف على حماية الكاتب" : "Your manuscript always stays yours. See Writer Protection"}
        </span>
        <Chevron size={14} color="rgba(66,53,33,0.45)" style={{ flexShrink: 0 }} />
      </button>
    </section>
  );
}
