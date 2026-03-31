import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CHAPTER_TITLE = "Chapter 3 — The Last Letter";

const BODY_PARAGRAPHS = [
  "Elena unfolded the paper slowly, as if time itself had thickened around her hands. The ink was old. The handwriting, familiar.",
  "She had read it a hundred times before — and yet, tonight, the words felt entirely new.",
];
const FULL_TEXT = BODY_PARAGRAPHS.join("\n\n");

type Phase = "idle" | "typing" | "done" | "fading";

// ── toolbar icon (generic pill/box) ──
function TIcon({ children, yellow }: { children: React.ReactNode; yellow?: boolean }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded text-[8px] font-semibold select-none leading-none"
      style={{
        color: yellow ? "#111" : "rgba(255,255,255,0.5)",
        background: yellow ? "#f5c842" : "transparent",
        padding: yellow ? "3px 7px" : "2px 3px",
        border: yellow ? "none" : "none",
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

// ── AI suggestion bubble ──
function AISuggestion({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.95 }}
          transition={{ duration: 0.35 }}
          className="absolute right-3 bottom-8 z-10"
          style={{ maxWidth: 180 }}
        >
          <div
            className="rounded-xl px-3 py-2 text-[9px] leading-relaxed"
            style={{
              background: "#1a1a1a",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.55)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#f5c842" }} />
              <span className="text-[8px] font-bold" style={{ color: "#f5c842" }}>AI suggestion</span>
            </div>
            "…the weight of years pressed into every curve of ink."
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function WritingAnimation() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [bodyText, setBodyText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [showAI, setShowAI] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasEnteredRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => { if (timerRef.current) clearTimeout(timerRef.current); };

  // Start when visible
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && !hasEnteredRef.current) { hasEnteredRef.current = true; timerRef.current = setTimeout(() => setPhase("typing"), 600); } },
      { threshold: 0.2 }
    );
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Typing
  useEffect(() => {
    if (phase !== "typing") return;
    setOpacity(1);
    setBodyText("");
    setWordCount(0);
    setShowAI(false);
    let index = 0;
    const typeBody = () => {
      if (index >= FULL_TEXT.length) {
        setPhase("done");
        setTimeout(() => setShowAI(true), 600);
        return;
      }
      index++;
      const current = FULL_TEXT.slice(0, index);
      setBodyText(current);
      setWordCount(current.split(/\s+/).filter(Boolean).length);
      const nextChar = FULL_TEXT[index];
      const delay = nextChar === "\n" ? 180 : nextChar === " " ? 45 : Math.random() * 25 + 18;
      timerRef.current = setTimeout(typeBody, delay);
    };
    timerRef.current = setTimeout(typeBody, 200);
    return clear;
  }, [phase]);

  // Done → reset
  useEffect(() => {
    if (phase !== "done") return;
    timerRef.current = setTimeout(() => setPhase("fading"), 4000);
    return clear;
  }, [phase]);

  useEffect(() => {
    if (phase !== "fading") return;
    setOpacity(0);
    setShowAI(false);
    timerRef.current = setTimeout(() => { setBodyText(""); setWordCount(0); setPhase("typing"); }, 700);
    return clear;
  }, [phase]);

  const paragraphs = bodyText.split("\n\n");
  const isDone = phase === "done";
  const isTyping = phase === "typing";

  return (
    <div
      ref={containerRef}
      className="rounded-xl overflow-hidden select-none"
      style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* ── Top nav bar ── */}
      <div
        className="flex items-center gap-1.5 px-3 py-2"
        style={{ background: "#111", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Back to Book */}
        <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.45)", fontWeight: 600, whiteSpace: "nowrap", marginRight: 4 }}>← Back to Book</span>
        <span style={{ fontSize: "7.5px", color: "rgba(255,255,255,0.2)" }}>1 pg · {wordCount} w</span>
        <div style={{ width: 1, height: 10, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />
        {/* Icon row */}
        {["↩","↪","🎙","⊞","📖","🖼","🏷","⊕","🔊","▤","🖨","⋮"].map((ic, i) => (
          <span key={i} style={{ fontSize: "7px", color: "rgba(255,255,255,0.22)", flexShrink: 0 }}>{ic}</span>
        ))}
        <div style={{ flex: 1 }} />
        {/* AI Writing Assistant */}
        <motion.span
          className="flex items-center gap-1 rounded-md px-2 py-1"
          style={{ background: "#f5c842", fontSize: "7.5px", fontWeight: 700, color: "#111", flexShrink: 0 }}
          animate={{ boxShadow: isDone ? ["0 0 0px #f5c84244", "0 0 8px #f5c84299", "0 0 0px #f5c84244"] : "0 0 0px transparent" }}
          transition={{ duration: 1.6, repeat: isDone ? Infinity : 0 }}
        >
          ✦ AI Writing Assistant
        </motion.span>
        <span
          className="flex items-center gap-1 rounded-md px-2 py-1 ml-1"
          style={{ background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.12)", fontSize: "7.5px", fontWeight: 600, color: "rgba(255,255,255,0.7)", flexShrink: 0 }}
        >
          💾 Save
        </span>
      </div>

      {/* ── Formatting toolbar ── */}
      <div
        className="flex items-center gap-2 px-3 py-1.5"
        style={{ background: "#f9f9f9", borderBottom: "1px solid #e8e8e8" }}
      >
        {/* Font */}
        <span style={{ fontSize: "8px", fontWeight: 600, color: "#333", whiteSpace: "nowrap" }}>EB Garamond</span>
        <span style={{ fontSize: "7px", color: "#aaa" }}>▾</span>
        <div style={{ width: 1, height: 10, background: "#ddd" }} />
        {/* Size */}
        <span style={{ fontSize: "7.5px", color: "#555" }}>−</span>
        <span style={{ fontSize: "8px", fontWeight: 700, color: "#222" }}>18</span>
        <span style={{ fontSize: "7.5px", color: "#555" }}>+</span>
        <div style={{ width: 1, height: 10, background: "#ddd" }} />
        {/* B I U */}
        {[["B","700","normal","none"],["I","400","italic","none"],["U","400","normal","underline"]].map(([l,w,s,d]) => (
          <span key={l} style={{ fontSize: "8px", fontWeight: w as any, fontStyle: s as any, textDecoration: d as any, color: "#333", cursor: "default" }}>{l}</span>
        ))}
        <div style={{ width: 1, height: 10, background: "#ddd" }} />
        {/* Alignment icons */}
        {["≡","⋮≡","≡⋮","≡⋮≡"].map((a, i) => (
          <span key={i} style={{ fontSize: "8px", color: i === 0 ? "#111" : "#bbb" }}>{a}</span>
        ))}
        <div style={{ width: 1, height: 10, background: "#ddd" }} />
        {/* Color swatches */}
        {["#fff","#e8dcc8","#111"].map((c) => (
          <span key={c} style={{ width: 9, height: 9, borderRadius: 2, background: c, border: c === "#fff" ? "1px solid #ccc" : "none", flexShrink: 0, display: "inline-block" }} />
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: "7.5px", color: "#888" }}>1.85 ▾</span>
        <span style={{ fontSize: "7.5px", color: "#888" }}>100%</span>
      </div>

      {/* ── Editor body ── */}
      <div className="flex relative" style={{ minHeight: 200, transition: "opacity 0.65s ease", opacity }}>
        {/* Left dark panel */}
        <div style={{ width: "12%", background: "#0d0d0d", flexShrink: 0 }} />

        {/* White page */}
        <div
          className="relative flex-1 flex flex-col"
          style={{ background: "#fff", padding: "20px 24px 24px", boxShadow: "0 4px 32px rgba(0,0,0,0.3)" }}
        >
          {/* Chapter title */}
          <div
            style={{
              fontFamily: "Georgia,'Times New Roman',serif",
              fontSize: "13px", fontWeight: 700,
              color: "#111", marginBottom: 12, lineHeight: 1.3,
              letterSpacing: "-0.01em",
            }}
          >
            {CHAPTER_TITLE}
          </div>
          <div style={{ width: 32, height: 1, background: "#ddd", marginBottom: 12 }} />

          {/* Body text */}
          <div
            style={{
              fontFamily: "Georgia,'Times New Roman',serif",
              fontSize: "9.5px", lineHeight: 1.85,
              color: "#222", flex: 1,
            }}
          >
            {paragraphs.map((para, pi) => (
              <p key={pi} style={{ marginBottom: pi < paragraphs.length - 1 ? 10 : 0, margin: `0 0 ${pi < paragraphs.length - 1 ? "10px" : "0"}` }}>
                {para}
                {pi === paragraphs.length - 1 && !isDone && (isTyping) && bodyText.length > 0 && (
                  <span style={{ display: "inline-block", width: "1.5px", height: "0.85em", background: "#555", marginLeft: "1px", verticalAlign: "text-bottom", animation: "wa-blink 1s step-end infinite" }} />
                )}
              </p>
            ))}
            {isDone && (
              <span style={{ display: "inline-block", width: "1.5px", height: "0.85em", background: "#888", marginLeft: "1px", verticalAlign: "text-bottom", animation: "wa-blink 1.4s step-end infinite" }} />
            )}
          </div>

          {/* AI suggestion overlay */}
          <AISuggestion visible={showAI} />
        </div>

        {/* Right dark panel */}
        <div style={{ width: "12%", background: "#0d0d0d", flexShrink: 0 }} />
      </div>

      {/* ── Status bar ── */}
      <div
        className="flex items-center justify-between px-4 py-1.5"
        style={{ background: "#111", borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <span style={{ fontFamily: "-apple-system, sans-serif", fontSize: "9px", color: "rgba(255,255,255,0.22)" }}>Ch. 3 of 4</span>
        <span style={{ fontFamily: "-apple-system, sans-serif", fontSize: "9px", color: "rgba(255,255,255,0.22)" }}>{wordCount} words</span>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#30d158", animation: "wa-pulse 2.4s ease-in-out infinite" }} />
          <span style={{ fontFamily: "-apple-system, sans-serif", fontSize: "9px", color: "rgba(255,255,255,0.22)" }}>Saved</span>
        </div>
      </div>

      <style>{`
        @keyframes wa-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes wa-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}
