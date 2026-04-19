import { useEffect, useRef, useState } from "react";

const USER_MSG    = "Continue the scene where Elena discovers the letter. Keep the melancholic tone from chapter 2.";
const AI_RESPONSE = "Elena's fingers trembled as she unfolded the paper — the ink faded but the words unmistakable, a name she had spent three years trying to forget.";

type Phase = "idle" | "user-typing" | "user-done" | "ai-thinking" | "ai-typing" | "ai-done" | "fading";

export function AIAssistantAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase]       = useState<Phase>("idle");
  const [userText, setUserText] = useState("");
  const [aiText, setAiText]     = useState("");
  const [opacity, setOpacity]   = useState(1);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);
  const clear = () => { if (timerRef.current) clearTimeout(timerRef.current); };

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && !startedRef.current) { startedRef.current = true; setPhase("user-typing"); } },
      { threshold: 0.3 }
    );
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (phase === "user-typing") {
      setOpacity(1); setUserText(""); setAiText("");
      let i = 0;
      const type = () => {
        i++;
        setUserText(USER_MSG.slice(0, i));
        if (i < USER_MSG.length) {
          timerRef.current = setTimeout(type, USER_MSG[i] === " " ? 50 : Math.random() * 25 + 18);
        } else {
          timerRef.current = setTimeout(() => setPhase("user-done"), 350);
        }
      };
      timerRef.current = setTimeout(type, 600);
      return clear;
    }
    if (phase === "user-done") { timerRef.current = setTimeout(() => setPhase("ai-thinking"), 280); return clear; }
    if (phase === "ai-thinking") { timerRef.current = setTimeout(() => setPhase("ai-typing"), 1400); return clear; }
    if (phase === "ai-typing") {
      let i = 0;
      const type = () => {
        i++;
        setAiText(AI_RESPONSE.slice(0, i));
        if (i < AI_RESPONSE.length) {
          const ch = AI_RESPONSE[i];
          timerRef.current = setTimeout(type, ch === "," || ch === "." || ch === "—" ? 160 : ch === " " ? 48 : Math.random() * 28 + 18);
        } else {
          timerRef.current = setTimeout(() => setPhase("ai-done"), 280);
        }
      };
      timerRef.current = setTimeout(type, 180);
      return clear;
    }
    if (phase === "ai-done") { timerRef.current = setTimeout(() => setPhase("fading"), 3600); return clear; }
    if (phase === "fading") {
      setOpacity(0);
      timerRef.current = setTimeout(() => { setUserText(""); setAiText(""); setPhase("user-typing"); }, 700);
      return clear;
    }
  }, [phase]);

  const showUser     = phase !== "idle";
  const showThinking = phase === "ai-thinking";
  const showAI       = ["ai-typing", "ai-done", "fading"].includes(phase);
  const aiDone       = phase === "ai-done" || phase === "fading";

  return (
    <div
      ref={containerRef}
      className="rounded-xl overflow-hidden select-none"
      style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", height: "100%", display: "flex", flexDirection: "column" }}
    >
      {/* ── Top nav bar (matches WritingAnimation style) ── */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ background: "#111", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)", animation: "ai-pulse 2s ease-in-out infinite" }} />
        <span style={{ fontSize: "8.5px", fontWeight: 600, color: "rgba(255,255,255,0.55)", letterSpacing: "0.01em" }}>
          AI Writing Assistant
        </span>
        <div style={{ flex: 1 }} />
        <span
          className="flex items-center gap-1 rounded-md px-2 py-1"
          style={{ background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.1)", fontSize: "7px", fontWeight: 600, color: "rgba(255,255,255,0.5)" }}
        >
          ← Back to Editor
        </span>
      </div>

      {/* ── Chat area ── */}
      <div
        className="flex flex-col justify-end gap-3 p-4"
        style={{ flex: 1, minHeight: 0, transition: "opacity 0.65s ease", opacity }}
      >
        {/* User bubble */}
        {showUser && (
          <div
            className="rounded-xl px-3.5 py-2.5 self-start"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.08)",
              maxWidth: "88%",
            }}
          >
            <p style={{ fontFamily: "-apple-system,'SF Pro Text',sans-serif", fontSize: "9.5px", color: "rgba(255,255,255,0.7)", lineHeight: 1.65 }}>
              {userText}
              {phase === "user-typing" && (
                <span style={{ display: "inline-block", width: "1.5px", height: "0.85em", background: "rgba(255,255,255,0.55)", marginLeft: 2, verticalAlign: "text-bottom", animation: "ai-blink 0.8s step-end infinite" }} />
              )}
            </p>
          </div>
        )}

        {/* AI thinking dots */}
        {showThinking && (
          <div
            className="rounded-xl px-3.5 py-2.5 self-end flex items-center gap-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", maxWidth: "88%" }}
          >
            <div className="flex items-center gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.35)", animation: `ai-bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
              ))}
            </div>
            <span style={{ fontFamily: "-apple-system,sans-serif", fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>Plotzy AI is writing…</span>
          </div>
        )}

        {/* AI response */}
        {showAI && (
          <div
            className="rounded-xl px-3.5 py-3 self-end"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", maxWidth: "92%" }}
          >
            {/* AI label row */}
            <div className="flex items-center gap-1.5 mb-2">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                  <circle cx="5" cy="5" r="3.5" stroke="#fff" strokeOpacity="0.5" strokeWidth="1"/>
                  <circle cx="5" cy="5" r="1.2" fill="#fff" fillOpacity="0.5"/>
                </svg>
              </div>
              <span style={{ fontFamily: "-apple-system,sans-serif", fontSize: "7.5px", fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.16em", textTransform: "uppercase" }}>
                Plotzy AI
              </span>
            </div>
            <p style={{ fontFamily: "Georgia,'Times New Roman',serif", fontSize: "9.5px", color: "rgba(255,255,255,0.72)", lineHeight: 1.72 }}>
              {aiText}
              {!aiDone && (
                <span style={{ display: "inline-block", width: "1.5px", height: "0.85em", background: "rgba(255,255,255,0.6)", marginLeft: 2, verticalAlign: "text-bottom", animation: "ai-blink 0.8s step-end infinite" }} />
              )}
            </p>
          </div>
        )}
      </div>

      {/* ── Input bar (matches Write card status bar style) ── */}
      <div
        className="px-4 pb-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10 }}
      >
        <div
          className="flex items-center gap-2 rounded-xl px-3.5 py-2"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <span style={{ flex: 1, fontFamily: "-apple-system,sans-serif", fontSize: "9px", color: "rgba(255,255,255,0.22)" }}>
            Ask anything about your story…
          </span>
          <div
            className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.07)" }}
          >
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5h7M5 1.5L8.5 5 5 8.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ai-blink  { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes ai-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-4px)} }
        @keyframes ai-pulse  { 0%,100%{opacity:0.5} 50%{opacity:1} }
      `}</style>
    </div>
  );
}
