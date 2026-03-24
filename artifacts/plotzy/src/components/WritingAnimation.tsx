import { useEffect, useRef, useState } from "react";

const CHAPTER_TITLE = "Chapter 3 — The Last Letter";

const BODY_LINES = [
  "Elena unfolded the paper slowly, as if",
  "time itself had thickened around her hands.",
  "The ink was old. The handwriting, familiar.",
  "She had read it a hundred times before —",
  "and yet, tonight, the words felt new.",
];

const FULL_BODY = BODY_LINES.join("\n");

const CHAPTERS = [
  { n: 1, title: "Prologue",        active: false },
  { n: 2, title: "The Departure",   active: false },
  { n: 3, title: "The Last Letter", active: true  },
  { n: 4, title: "Silence",         active: false },
];

type Phase = "idle" | "typing" | "done" | "fading";

export function WritingAnimation() {
  const [phase, setPhase]       = useState<Phase>("idle");
  const [bodyText, setBodyText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [opacity, setOpacity]   = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasEnteredRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => { if (timerRef.current) clearTimeout(timerRef.current); };

  /* ── Start on first intersection ── */
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && !hasEnteredRef.current) { hasEnteredRef.current = true; timerRef.current = setTimeout(() => setPhase("typing"), 500); } },
      { threshold: 0.3 }
    );
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  /* ── Typing phase ── */
  useEffect(() => {
    if (phase !== "typing") return;
    setOpacity(1);
    setBodyText("");
    setWordCount(0);
    let index = 0;
    const typeBody = () => {
      if (index >= FULL_BODY.length) {
        setPhase("done");
        return;
      }
      index++;
      const current = FULL_BODY.slice(0, index);
      setBodyText(current);
      setWordCount(current.split(/\s+/).filter(Boolean).length);
      const nextChar = FULL_BODY[index];
      const delay = nextChar === "\n" ? 220 : nextChar === " " ? 50 : Math.random() * 28 + 20;
      timerRef.current = setTimeout(typeBody, delay);
    };
    timerRef.current = setTimeout(typeBody, 200);
    return clear;
  }, [phase]);

  /* ── Done → pause → fade out → restart ── */
  useEffect(() => {
    if (phase !== "done") return;
    timerRef.current = setTimeout(() => {
      setPhase("fading");
    }, 3200);
    return clear;
  }, [phase]);

  useEffect(() => {
    if (phase !== "fading") return;
    setOpacity(0);
    timerRef.current = setTimeout(() => {
      setBodyText("");
      setWordCount(0);
      setPhase("typing");
    }, 700);
    return clear;
  }, [phase]);

  const bodyLines = bodyText.split("\n");
  const isDone    = phase === "done";
  const isTyping  = phase === "typing";

  return (
    <div
      ref={containerRef}
      className="rounded-2xl overflow-hidden select-none"
      style={{
        background: "#0d0d0d",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.4)",
      }}
    >
      {/* ── Title bar ── */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ background: "#161616", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#febc2e" }} />
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
        <div className="flex-1 flex justify-center">
          <span style={{ fontFamily: "-apple-system, 'SF Pro Text', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.28)", letterSpacing: "0.01em" }}>
            Chapter 3 — The Last Letter
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#30d158", animation: "wa-pulse 2.4s ease-in-out infinite" }} />
          <span style={{ fontFamily: "-apple-system, sans-serif", fontSize: "10px", color: "rgba(255,255,255,0.22)" }}>Saved</span>
        </div>
      </div>

      {/* ── Editor body ── */}
      <div className="flex" style={{ minHeight: "240px", transition: "opacity 0.65s ease", opacity }}>

        {/* Sidebar */}
        <div className="flex flex-col py-3 gap-0.5 flex-shrink-0" style={{ width: "130px", background: "#111", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontFamily: "-apple-system, sans-serif", fontSize: "8.5px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.18em", textTransform: "uppercase", padding: "0 12px 6px" }}>
            Chapters
          </div>
          {CHAPTERS.map((ch) => (
            <div key={ch.n} className="flex items-center gap-2 px-3 py-1.5" style={{ background: ch.active ? "rgba(255,255,255,0.07)" : "transparent", borderLeft: ch.active ? "2px solid rgba(255,255,255,0.35)" : "2px solid transparent" }}>
              <span style={{ fontFamily: "-apple-system, sans-serif", fontSize: "9.5px", color: ch.active ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.25)", lineHeight: 1.3 }}>
                {ch.n}. {ch.title}
              </span>
            </div>
          ))}
        </div>

        {/* Writing area */}
        <div className="flex-1 px-6 py-6 flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-5 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {["B", "I", "U"].map((f) => (
              <span key={f} style={{ fontFamily: "-apple-system, sans-serif", fontSize: "10px", color: "rgba(255,255,255,0.2)", fontWeight: f === "B" ? 700 : 400, fontStyle: f === "I" ? "italic" : "normal", textDecoration: f === "U" ? "underline" : "none" }}>
                {f}
              </span>
            ))}
            <div className="h-3 w-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            {["H1", "H2", "¶"].map((f) => (
              <span key={f} style={{ fontFamily: "-apple-system, sans-serif", fontSize: "9px", color: "rgba(255,255,255,0.18)" }}>{f}</span>
            ))}
          </div>

          {/* Chapter title */}
          <div className="mb-4" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "1rem", fontWeight: 700, color: "rgba(255,255,255,0.88)", letterSpacing: "-0.01em", lineHeight: 1.3 }}>
            {CHAPTER_TITLE}
          </div>
          <div className="mb-4" style={{ height: "1px", background: "rgba(255,255,255,0.06)", width: "40px" }} />

          {/* Body text */}
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "0.78rem", color: "rgba(255,255,255,0.60)", lineHeight: 1.75, letterSpacing: "0.01em", flex: 1 }}>
            {bodyLines.map((line, i) => (
              <div key={i} style={{ minHeight: "1.75em" }}>
                {line}
                {i === bodyLines.length - 1 && !isDone && (isTyping || phase === "idle") && bodyText.length > 0 && (
                  <span style={{ display: "inline-block", width: "1.5px", height: "0.9em", background: "rgba(255,255,255,0.55)", marginLeft: "2px", verticalAlign: "text-bottom", animation: "wa-blink 1s step-end infinite" }} />
                )}
              </div>
            ))}
            {/* After done: soft blinking cursor at end */}
            {isDone && (
              <span style={{ display: "inline-block", width: "1.5px", height: "0.9em", background: "rgba(255,255,255,0.3)", marginLeft: "2px", verticalAlign: "text-bottom", animation: "wa-blink 1.4s step-end infinite" }} />
            )}
          </div>
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className="flex items-center justify-between px-4 py-2" style={{ background: "#111", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-4">
          <span style={{ fontFamily: "-apple-system, sans-serif", fontSize: "9.5px", color: "rgba(255,255,255,0.20)", letterSpacing: "0.04em" }}>Ch. 3 of 4</span>
          <span style={{ fontFamily: "-apple-system, sans-serif", fontSize: "9.5px", color: "rgba(255,255,255,0.20)", letterSpacing: "0.04em" }}>{wordCount.toLocaleString()} words</span>
        </div>
        <span style={{ fontFamily: "-apple-system, sans-serif", fontSize: "9.5px", color: "rgba(255,255,255,0.15)", letterSpacing: "0.04em" }}>Plotzy</span>
      </div>

      <style>{`
        @keyframes wa-blink  { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes wa-pulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}
