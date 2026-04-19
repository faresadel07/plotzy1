import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const VOICE_TABS = ["All", "Female", "Male", "Neutral"];

const VOICES = [
  { id: "nova",    emoji: "☀️", label: "Nova",    meta: "American · Warm & Upbeat",       gender: "Female"  },
  { id: "alloy",   emoji: "⚡", label: "Alloy",   meta: "American · Versatile & Clear",   gender: "Neutral" },
  { id: "shimmer", emoji: "✨", label: "Shimmer", meta: "American · Light & Feminine",    gender: "Female"  },
  { id: "onyx",    emoji: "🎩", label: "Onyx",    meta: "American · Deep & Authoritative",gender: "Male"    },
  { id: "echo",    emoji: "📣", label: "Echo",    meta: "American · Resonant & Clear",    gender: "Neutral" },
  { id: "sage",    emoji: "🌿", label: "Sage",    meta: "American · Calm & Thoughtful",   gender: "Neutral" },
];

const CHAPTERS = [
  { n: 1, title: "Prologue",         words: 0,     time: "< 1 min" },
  { n: 2, title: "The Departure",    words: 1766,  time: "12 min"  },
  { n: 3, title: "The Last Letter",  words: 842,   time: "6 min"   },
  { n: 4, title: "Silence",          words: 0,     time: "< 1 min" },
  { n: 5, title: "What Remains",     words: 0,     time: "< 1 min" },
];

const WAVEFORM = Array.from({ length: 22 }, (_, i) => {
  const t = i / 22;
  return Math.max(0.15, Math.sin(t * Math.PI * 4 + 0.5) * 0.45 + 0.55);
});

export function AudiobookMockup() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab]   = useState(0);
  const [activeVoice, setActiveVoice] = useState(0);
  const [quality, setQuality]       = useState<"Standard" | "HD">("Standard");
  const [playingChapter, setPlayingChapter] = useState(1); // 0-indexed
  const [progress, setProgress]     = useState(62);
  const [isPlaying, setIsPlaying]   = useState(true);
  const [previewChapter, setPreviewChapter] = useState<number | null>(null);
  const startedRef = useRef(false);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Intersection → start loop
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && !startedRef.current) { startedRef.current = true; runLoop(); } },
      { threshold: 0.2 }
    );
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  function runLoop() {
    // Phase 1: play progress on ch2
    setPlayingChapter(1); setIsPlaying(true); setProgress(62);
    tickProgress(62, () => {
      // Phase 2: show preview on ch3
      setPreviewChapter(2);
      timerRef.current = setTimeout(() => {
        setPreviewChapter(null);
        // Phase 3: switch voice
        setActiveVoice(v => (v + 1) % VOICES.length);
        timerRef.current = setTimeout(() => {
          setActiveVoice(v => (v + 1) % VOICES.length);
          setActiveTab(t => (t + 1) % VOICE_TABS.length);
          timerRef.current = setTimeout(() => {
            // Phase 4: toggle quality
            setQuality(q => q === "Standard" ? "HD" : "Standard");
            timerRef.current = setTimeout(() => {
              setQuality(q => q === "Standard" ? "HD" : "Standard");
              setActiveTab(0);
              setActiveVoice(0);
              // Phase 5: move to next chapter
              setPlayingChapter(2); setProgress(8); setIsPlaying(true);
              tickProgress(8, () => {
                setIsPlaying(false);
                timerRef.current = setTimeout(runLoop, 1600);
              });
            }, 900);
          }, 800);
        }, 900);
      }, 1800);
    });
  }

  function tickProgress(start: number, onDone: () => void) {
    let p = start;
    const tick = () => {
      p += 1.1;
      if (p >= 98) { setProgress(98); setIsPlaying(false); onDone(); return; }
      setProgress(p);
      timerRef.current = setTimeout(tick, 55);
    };
    timerRef.current = setTimeout(tick, 55);
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const currentVoice = VOICES[activeVoice];
  const filteredVoices = activeTab === 0 ? VOICES : VOICES.filter(v => v.gender === VOICE_TABS[activeTab]);

  return (
    <div
      ref={containerRef}
      className="rounded-xl overflow-hidden select-none"
      style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", height: "100%", display: "flex", flexDirection: "column" }}
    >
      {/* ── Top bar ── */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ background: "#111", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex gap-1">
          {["rgba(255,95,87,0.6)","rgba(255,189,46,0.6)","rgba(40,200,64,0.6)"].map((c, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div className="flex items-center gap-1.5">
          <motion.div
            style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa" }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
          <span style={{ fontSize: "8.5px", fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Audiobook Studio</span>
        </div>
        <div style={{ flex: 1 }} />
      </div>

      {/* ── Two-pane body ── */}
      <div className="flex" style={{ flex: 1, minHeight: 0 }}>

        {/* ── Left: Voices ── */}
        <div
          className="flex flex-col"
          style={{ width: "45%", borderRight: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}
        >
          {/* Voice tabs */}
          <div className="flex gap-1 px-2 pt-2 pb-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {VOICE_TABS.map((tab, i) => (
              <motion.div
                key={tab}
                animate={{
                  background: i === activeTab ? "#fff" : "transparent",
                  color: i === activeTab ? "#111" : "rgba(255,255,255,0.35)",
                }}
                transition={{ duration: 0.3 }}
                className="px-2 py-0.5 rounded-full"
                style={{ fontSize: "7.5px", fontWeight: 600, cursor: "default" }}
              >
                {tab}
              </motion.div>
            ))}
          </div>

          {/* Voice list */}
          <div className="flex flex-col gap-0.5 px-2 py-1.5 flex-1 overflow-hidden">
            <AnimatePresence mode="popLayout">
              {filteredVoices.slice(0, 5).map((v, i) => {
                const isActive = v.id === currentVoice.id;
                return (
                  <motion.div
                    key={v.id}
                    layout
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.25, delay: i * 0.04 }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                    style={{
                      background: isActive ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.02)",
                      border: isActive ? "1px solid rgba(255,255,255,0.15)" : "1px solid transparent",
                    }}
                  >
                    <span style={{ fontSize: "11px" }}>{v.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: "8.5px", fontWeight: 700, color: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.55)" }}>
                        {v.label}
                      </div>
                      <div style={{ fontSize: "7px", color: "rgba(255,255,255,0.28)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {v.meta}
                      </div>
                    </div>
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{ width: 5, height: 5, borderRadius: "50%", background: "#a78bfa", flexShrink: 0 }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Quality & Speed */}
          <div
            className="px-2 pb-2 pt-1.5"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div style={{ fontSize: "7px", fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
              Quality &amp; Speed
            </div>
            <div className="flex gap-1.5">
              {(["Standard", "HD"] as const).map(q => (
                <motion.div
                  key={q}
                  animate={{
                    background: quality === q ? "#fff" : "rgba(255,255,255,0.06)",
                    color: quality === q ? "#111" : "rgba(255,255,255,0.4)",
                    border: quality === q ? "1px solid transparent" : "1px solid rgba(255,255,255,0.08)",
                  }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 text-center py-1 rounded-lg"
                  style={{ fontSize: "8px", fontWeight: 700, cursor: "default" }}
                >
                  {q === "HD" ? "💎 HD" : "⚡ Standard"}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Chapters ── */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {CHAPTERS.map((ch, i) => {
            const isPlaying_ = i === playingChapter && isPlaying;
            const isPreview  = previewChapter === i;
            const isDone     = i < playingChapter || (i === playingChapter && !isPlaying && progress >= 95);

            return (
              <div key={ch.n}>
                <motion.div
                  className="flex items-center gap-2 px-3 py-2"
                  animate={{ background: i === playingChapter ? "rgba(255,255,255,0.04)" : "transparent" }}
                  transition={{ duration: 0.3 }}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  {/* Check / circle */}
                  <div
                    style={{
                      width: 14, height: 14, borderRadius: "50%",
                      border: isDone ? "none" : "1.5px solid rgba(255,255,255,0.2)",
                      background: isDone ? "rgba(255,255,255,0.15)" : "transparent",
                      flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {isDone && <span style={{ fontSize: "7px", color: "rgba(255,255,255,0.7)" }}>✓</span>}
                  </div>

                  <span style={{ fontSize: "8px", fontWeight: 700, color: "rgba(255,255,255,0.4)", width: 10, flexShrink: 0 }}>{ch.n}</span>

                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: "8.5px", fontWeight: 600, color: i === playingChapter ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.5)" }}>
                      {ch.title}
                    </div>
                    <div style={{ fontSize: "7px", color: "rgba(255,255,255,0.28)" }}>
                      {ch.words > 0 ? `${ch.words.toLocaleString()} words · ${ch.time}` : `${ch.time}`}
                    </div>
                  </div>

                  {/* Action button */}
                  <AnimatePresence mode="wait">
                    {isPlaying_ ? (
                      <motion.div
                        key="playing"
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        className="flex items-center gap-1"
                      >
                        {WAVEFORM.slice(0, 8).map((h, wi) => (
                          <motion.div
                            key={wi}
                            style={{ width: 2, borderRadius: 1, background: "#a78bfa", flexShrink: 0 }}
                            animate={{ height: [`${h * 12 + 2}px`, `${h * 6 + 2}px`, `${h * 12 + 2}px`] }}
                            transition={{ duration: 0.5 + wi * 0.07, repeat: Infinity, ease: "easeInOut" }}
                          />
                        ))}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="btn"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg"
                        style={{
                          background: isPreview ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          fontSize: "7.5px", fontWeight: 600,
                          color: isPreview ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)",
                        }}
                      >
                        {isPreview ? "▶ Replay" : "▷ Preview"}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Download icon */}
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.25, flexShrink: 0 }}>
                    <path d="M5 1v5M2.5 4.5 5 7l2.5-2.5M2 8.5h6" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </motion.div>

                {/* Inline mini-player for playing chapter */}
                <AnimatePresence>
                  {i === playingChapter && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="px-3 py-2" style={{ background: "rgba(167,139,250,0.06)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        {/* Mini waveform + progress */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#a78bfa", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {isPlaying ? (
                              <svg width="7" height="7" viewBox="0 0 8 8" fill="#000"><rect x="1" y="1" width="2" height="6" rx="0.5"/><rect x="5" y="1" width="2" height="6" rx="0.5"/></svg>
                            ) : (
                              <svg width="7" height="7" viewBox="0 0 8 8" fill="#000" style={{ marginLeft: 1 }}><path d="M1.5 1L6.5 4 1.5 7V1z"/></svg>
                            )}
                          </div>
                          <div style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                            <motion.div
                              style={{ height: "100%", background: "#a78bfa", borderRadius: 2 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ type: "spring", stiffness: 60, damping: 20 }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ fontSize: "7px", color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
                            {Math.floor((progress / 100) * 362 / 60)}:{String(Math.floor((progress / 100) * 362) % 60).padStart(2, "0")}
                          </span>
                          <span style={{ fontSize: "7px", color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>6:02</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Status bar ── */}
      <div
        className="flex items-center justify-between px-4 py-1.5"
        style={{ background: "#111", borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.22)" }}>10 voices available</span>
        <div className="flex items-center gap-1">
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#a78bfa", animation: "ab-pulse 1.6s ease-in-out infinite" }} />
          <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.22)" }}>{currentVoice.label} · {quality}</span>
        </div>
      </div>

      <style>{`
        @keyframes ab-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  );
}
