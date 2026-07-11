import { useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, ArrowLeft, Check, X, PenLine } from "lucide-react";

/* A gentle, guided setup shown once when a writer opens a fresh blank
   blog post. Every question is multiple choice — the writer never has to
   invent an answer from a blank field, they just pick. On finish it hands
   back the choices so the editor can set the category, the word goal, and
   optionally drop in a matching outline. Warm paper look with the site's
   handwriting accents. */

const SERIF = "'Lora', 'Amiri', Georgia, serif";
const HAND = "'Caveat', 'Aref Ruqaa', cursive";
const SF = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif";

export interface BlogBlueprint {
  type: string;
  goal: number;
  tone: string;
  audience: string;
  category: string;
  outline: boolean;
}

interface StepDef {
  key: keyof BlogBlueprint;
  q: { en: string; ar: string };
  hint: { en: string; ar: string };
  options: { label: { en: string; ar: string }; value: string | number }[];
}

const STEPS: StepDef[] = [
  {
    key: "type",
    q: { en: "What are you writing today?", ar: "شو بتكتب اليوم؟" },
    hint: { en: "(pick the shape, not the words)", ar: "(اختر الشكل، مش الكلمات)" },
    options: [
      { label: { en: "A how-to or guide", ar: "شرح أو دليل" }, value: "howto" },
      { label: { en: "A personal story", ar: "قصة شخصية" }, value: "story" },
      { label: { en: "An opinion piece", ar: "مقال رأي" }, value: "opinion" },
      { label: { en: "A review", ar: "مراجعة" }, value: "review" },
      { label: { en: "A list", ar: "قائمة" }, value: "list" },
    ],
  },
  {
    key: "goal",
    q: { en: "How deep are you going?", ar: "قد إيش رايح تتعمّق؟" },
    hint: { en: "(sets a gentle word goal, change it anytime)", ar: "(بيحدد هدف كلمات بسيط، بتغيّره أي وقت)" },
    options: [
      { label: { en: "Quick take · 300 words", ar: "لمحة سريعة · 300 كلمة" }, value: 300 },
      { label: { en: "Standard · 800 words", ar: "عادي · 800 كلمة" }, value: 800 },
      { label: { en: "Deep dive · 1500 words", ar: "تعمّق · 1500 كلمة" }, value: 1500 },
    ],
  },
  {
    key: "tone",
    q: { en: "What should it feel like?", ar: "شو الإحساس اللي بدك ياه؟" },
    hint: { en: "(your voice, your call)", ar: "(صوتك انت)" },
    options: [
      { label: { en: "Warm and personal", ar: "دافئ وشخصي" }, value: "warm" },
      { label: { en: "Clear and practical", ar: "واضح وعملي" }, value: "practical" },
      { label: { en: "Bold and honest", ar: "جريء وصريح" }, value: "bold" },
      { label: { en: "Literary and slow", ar: "أدبي ومتأنٍّ" }, value: "literary" },
    ],
  },
  {
    key: "audience",
    q: { en: "Who are you writing for?", ar: "لمين بتكتب؟" },
    hint: { en: "(keeps one reader in mind)", ar: "(خلّي قارئ واحد ببالك)" },
    options: [
      { label: { en: "Fellow writers", ar: "كتّاب مثلك" }, value: "writers" },
      { label: { en: "Beginners", ar: "مبتدئين" }, value: "beginners" },
      { label: { en: "General readers", ar: "قرّاء عامّين" }, value: "general" },
      { label: { en: "Just for me", ar: "لحالي بس" }, value: "self" },
    ],
  },
  {
    key: "outline",
    q: { en: "Want a head start?", ar: "بدك بداية جاهزة؟" },
    hint: { en: "(a light outline you can fill or delete)", ar: "(هيكل خفيف بتعبّيه أو بتمسحه)" },
    options: [
      { label: { en: "Yes, give me an outline", ar: "آه، أعطني هيكل" }, value: "yes" },
      { label: { en: "No, blank page please", ar: "لا، صفحة فاضية" }, value: "no" },
    ],
  },
];

export function BlogOnboarding({
  ar, onFinish, onSkip,
}: {
  ar: boolean;
  onFinish: (bp: BlogBlueprint) => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const cur = STEPS[step];
  const chosen = answers[cur.key];
  const loc = (v: { en: string; ar: string }) => (ar ? v.ar : v.en);

  const pick = (value: string | number) => {
    const next = { ...answers, [cur.key]: value };
    setAnswers(next);
    // brief beat so the selection reads before advancing
    setTimeout(() => {
      if (step < STEPS.length - 1) setStep(step + 1);
      else onFinish({
        type: String(next.type ?? "story"),
        goal: Number(next.goal ?? 800),
        tone: String(next.tone ?? "warm"),
        audience: String(next.audience ?? "general"),
        category: "",
        outline: next.outline === "yes",
      });
    }, 160);
  };

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 3000,
        background: "rgba(41,33,21,0.55)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
      dir={ar ? "rtl" : "ltr"}
    >
      <div
        style={{
          width: "100%", maxWidth: 460, background: "#f4efe2",
          borderRadius: 22, border: "1px solid rgba(66,53,33,0.14)",
          boxShadow: "0 30px 80px -24px rgba(41,33,21,0.6)",
          padding: "26px 26px 22px", position: "relative",
          fontFamily: SF,
          backgroundImage: "radial-gradient(circle, rgba(66,53,33,0.05) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      >
        {/* Close */}
        <button
          onClick={onSkip}
          title={ar ? "تخطّي" : "Skip"}
          style={{
            position: "absolute", top: 16, insetInlineEnd: 16,
            width: 30, height: 30, borderRadius: 9, border: "none", cursor: "pointer",
            background: "rgba(66,53,33,0.07)", color: "#6d6354",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <PenLine size={14} color="#7b5e3b" />
          <span style={{ fontFamily: "'Courier New', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#9a9181" }}>
            {ar ? "لنبدأ" : "Let's begin"}
          </span>
        </div>

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              height: 4, flex: 1, borderRadius: 3,
              background: i <= step ? "#7b5e3b" : "rgba(66,53,33,0.13)",
              transition: "background 0.3s",
            }} />
          ))}
        </div>

        {/* Question */}
        <h2 style={{ fontFamily: SERIF, fontSize: 25, fontWeight: 700, color: "#2f2618", margin: "0 0 4px", lineHeight: 1.2 }}>
          {loc(cur.q)}
        </h2>
        <p style={{ fontFamily: HAND, fontSize: 17, color: "#8a8070", margin: "0 0 18px", transform: "rotate(-0.4deg)", display: "inline-block" }}>
          {loc(cur.hint)}
        </p>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {cur.options.map((opt) => {
            const active = chosen === opt.value;
            return (
              <button
                key={String(opt.value)}
                onClick={() => pick(opt.value)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, width: "100%",
                  padding: "13px 15px", borderRadius: 13, cursor: "pointer",
                  textAlign: ar ? "right" : "left",
                  background: active ? "#292115" : "#fffdf7",
                  border: `1px solid ${active ? "#292115" : "rgba(66,53,33,0.14)"}`,
                  transition: "all 0.15s",
                  fontFamily: SF, fontSize: 15, fontWeight: 600,
                  color: active ? "#f4efe2" : "#2f2618",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#f7f1e2"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "#fffdf7"; }}
              >
                <span style={{
                  width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                  border: `1.5px solid ${active ? "rgba(244,239,226,0.5)" : "rgba(66,53,33,0.2)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {active && <Check size={12} color="#f4efe2" strokeWidth={3} />}
                </span>
                <span style={{ flex: 1 }}>{loc(opt.label)}</span>
              </button>
            );
          })}
        </div>

        {/* Footer nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
          <button
            onClick={() => (step > 0 ? setStep(step - 1) : onSkip())}
            style={{
              display: "flex", alignItems: "center", gap: 5, background: "none", border: "none",
              cursor: "pointer", fontFamily: SF, fontSize: 12.5, fontWeight: 600, color: "#8a8070", padding: 4,
            }}
          >
            {step > 0 ? (ar ? <><ArrowRight size={13} /> رجوع</> : <><ArrowLeft size={13} /> Back</>) : (ar ? "تخطّي الإعداد" : "Skip setup")}
          </button>
          <span style={{ fontFamily: HAND, fontSize: 15, color: "#9a9181" }}>
            {step + 1} / {STEPS.length}
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
