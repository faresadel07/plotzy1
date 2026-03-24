import { useEffect, useRef, useState } from "react";

const USER_MSG   = "Continue the scene where Elena discovers the letter. Keep the melancholic tone from chapter 2.";
const AI_RESPONSE = "Elena's fingers trembled as she unfolded the paper, the ink faded but the words unmistakable — a name she had spent three years trying to forget.";

type Phase = "idle" | "user-typing" | "user-done" | "ai-thinking" | "ai-typing" | "ai-done" | "fading";

export function AIAssistantAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase]       = useState<Phase>("idle");
  const [userText, setUserText] = useState("");
  const [aiText, setAiText]     = useState("");
  const [opacity, setOpacity]   = useState(1);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef  = useRef(false);

  const clear = () => { if (timerRef.current) clearTimeout(timerRef.current); };

  /* ── Enter viewport once → start loop ── */
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && !startedRef.current) { startedRef.current = true; setPhase("user-typing"); } },
      { threshold: 0.4 }
    );
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  /* ── Phase machine ── */
  useEffect(() => {
    if (phase === "user-typing") {
      setOpacity(1);
      setUserText(""); setAiText("");
      let i = 0;
      const type = () => {
        i++;
        setUserText(USER_MSG.slice(0, i));
        if (i < USER_MSG.length) {
          const delay = USER_MSG[i] === " " ? 52 : Math.random() * 28 + 20;
          timerRef.current = setTimeout(type, delay);
        } else {
          timerRef.current = setTimeout(() => setPhase("user-done"), 350);
        }
      };
      timerRef.current = setTimeout(type, 600);
      return clear;
    }

    if (phase === "user-done") {
      timerRef.current = setTimeout(() => setPhase("ai-thinking"), 280);
      return clear;
    }

    if (phase === "ai-thinking") {
      timerRef.current = setTimeout(() => setPhase("ai-typing"), 1400);
      return clear;
    }

    if (phase === "ai-typing") {
      let i = 0;
      const type = () => {
        i++;
        setAiText(AI_RESPONSE.slice(0, i));
        if (i < AI_RESPONSE.length) {
          const ch = AI_RESPONSE[i];
          const delay = ch === "," || ch === "." || ch === "—" ? 155 : ch === " " ? 50 : Math.random() * 30 + 18;
          timerRef.current = setTimeout(type, delay);
        } else {
          timerRef.current = setTimeout(() => setPhase("ai-done"), 280);
        }
      };
      timerRef.current = setTimeout(type, 180);
      return clear;
    }

    if (phase === "ai-done") {
      /* Pause, then fade out and restart */
      timerRef.current = setTimeout(() => setPhase("fading"), 3400);
      return clear;
    }

    if (phase === "fading") {
      setOpacity(0);
      timerRef.current = setTimeout(() => {
        setUserText(""); setAiText("");
        setPhase("user-typing");
      }, 700);
      return clear;
    }
  }, [phase]);

  const showUser     = phase !== "idle";
  const showThinking = phase === "ai-thinking";
  const showAI       = phase === "ai-typing" || phase === "ai-done" || phase === "fading";
  const aiDone       = phase === "ai-done" || phase === "fading";

  return (
    <div
      ref={containerRef}
      className="rounded-2xl overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.18)] border border-white/5 bg-[#0c0c0c]"
    >
      {/* Header */}
      <div className="bg-[#111] px-5 py-3 flex items-center gap-2 border-b border-white/5">
        <div className="w-2 h-2 rounded-full bg-white/50" style={{ animation: "aa-pulse 2s ease-in-out infinite" }} />
        <span className="text-white/60 text-xs font-medium" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" }}>
          AI Writing Assistant
        </span>
      </div>

      {/* Chat area */}
      <div className="p-5 space-y-4 min-h-[220px] flex flex-col justify-end" style={{ transition: "opacity 0.65s ease", opacity }}>

        {/* User bubble */}
        {showUser && (
          <div className="bg-white/6 rounded-xl px-4 py-3 max-w-[82%]" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" }}>
            <p className="text-white/70 text-[13px] leading-relaxed">
              {userText}
              {phase === "user-typing" && (
                <span style={{ display: "inline-block", width: 1.5, height: "0.9em", background: "rgba(255,255,255,0.5)", marginLeft: 2, verticalAlign: "text-bottom", animation: "aa-blink 0.8s step-end infinite" }} />
              )}
            </p>
          </div>
        )}

        {/* AI thinking dots */}
        {showThinking && (
          <div className="bg-white/6 border border-white/8 rounded-xl px-4 py-3 ml-auto max-w-[90%] flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.4)", animation: `aa-bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
              ))}
            </div>
            <span className="text-white/30 text-[11px]" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" }}>
              Plotzy AI is writing…
            </span>
          </div>
        )}

        {/* AI response */}
        {showAI && (
          <div className="bg-white/6 border border-white/8 rounded-xl px-4 py-3 ml-auto max-w-[90%]">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1.5C3.07 1.5 1.5 3.07 1.5 5S3.07 8.5 5 8.5 8.5 6.93 8.5 5 6.93 1.5 5 1.5zm0 3V5l1.5 0.75" stroke="#EFEFEF" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" }}>
                Plotzy AI
              </span>
            </div>
            <p className="text-white/75 text-[13px] leading-[1.7]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              {aiText}
              {!aiDone && (
                <span style={{ display: "inline-block", width: 1.5, height: "0.9em", background: "rgba(255,255,255,0.6)", marginLeft: 2, verticalAlign: "text-bottom", animation: "aa-blink 0.8s step-end infinite" }} />
              )}
            </p>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="px-5 pb-5">
        <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-4 py-2.5" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" }}>
          <span className="flex-1 text-[12px] text-white/25">Ask anything about your story…</span>
          <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5h7M5 1.5L8.5 5 5 8.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes aa-blink  { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes aa-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
        @keyframes aa-pulse  { 0%,100%{opacity:0.5} 50%{opacity:1} }
      `}</style>
    </div>
  );
}
