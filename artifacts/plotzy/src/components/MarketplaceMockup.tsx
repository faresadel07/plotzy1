import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TABS = ["All", "Editing", "Design", "Marketing"];

const SERVICES = [
  {
    icon: "📖",
    title: "AI Developmental Editor",
    subtitle: "Full manuscript structure analysis",
    badge: "Most Used",
    bullets: ["Chapter-by-chapter pacing analysis", "Character arc & motivation review", "Plot hole detection report"],
    time: "~3 min",
  },
  {
    icon: "✏️",
    title: "AI Copy Editor",
    subtitle: "Grammar, style & voice consistency",
    badge: "Editing",
    bullets: ["Grammar & punctuation correction", "Voice consistency analysis", "Repetition & redundancy flagging"],
    time: "~2 min",
  },
  {
    icon: "🎨",
    title: "AI Cover Generator",
    subtitle: "Professional cover design in seconds",
    badge: "Design",
    bullets: ["Genre-matched visual style", "Multiple layout variations", "High-res export ready"],
    time: "~1 min",
  },
];

export function MarketplaceMockup() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [activeCard, setActiveCard] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const startedRef = useRef(false);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start on scroll into view
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && !startedRef.current) { startedRef.current = true; runCycle(); } },
      { threshold: 0.25 }
    );
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  function runCycle() {
    // Phase 1: animate progress bar
    setAnalyzing(true);
    setProgress(0);
    let p = 0;
    const tick = () => {
      p += Math.random() * 6 + 2;
      if (p >= 100) {
        setProgress(100);
        timerRef.current = setTimeout(() => {
          setAnalyzing(false);
          setProgress(0);
          setActiveCard(prev => { const next = (prev + 1) % SERVICES.length; return next; });
          setActiveTab(prev => (prev + 1) % TABS.length);
          timerRef.current = setTimeout(runCycle, 1200);
        }, 500);
        return;
      }
      setProgress(Math.min(p, 99));
      timerRef.current = setTimeout(tick, 80);
    };
    timerRef.current = setTimeout(tick, 100);
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const svc = SERVICES[activeCard];

  return (
    <div
      ref={containerRef}
      className="rounded-xl overflow-hidden select-none"
      style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* ── Browser bar ── */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ background: "#111", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex gap-1">
          {["rgba(255,95,87,0.6)","rgba(255,189,46,0.6)","rgba(40,200,64,0.6)"].map((c,i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
          ))}
        </div>
        <div
          className="flex-1 rounded-md px-2 py-1 text-center"
          style={{ background: "rgba(255,255,255,0.05)", fontSize: "8px", color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}
        >
          plotzy.app/marketplace
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div
        className="flex items-center gap-1.5 px-3 py-2.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        {TABS.map((tab, i) => (
          <motion.div
            key={tab}
            animate={{
              background: i === activeTab ? "rgba(255,255,255,0.12)" : "transparent",
              color: i === activeTab ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)",
              border: i === activeTab ? "1px solid rgba(255,255,255,0.2)" : "1px solid transparent",
            }}
            transition={{ duration: 0.35 }}
            className="px-2 py-1 rounded-full"
            style={{ fontSize: "8px", fontWeight: 600, cursor: "default" }}
          >
            {tab}
          </motion.div>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: "7.5px", color: "rgba(255,255,255,0.2)" }}>9 services</span>
      </div>

      {/* ── Service card ── */}
      <div className="p-3" style={{ minHeight: 180 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCard}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="rounded-xl p-3.5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {/* Card header */}
            <div className="flex items-start gap-2.5 mb-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.07)", fontSize: "13px" }}
              >
                {svc.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ fontSize: "9.5px", fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>
                    {svc.title}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded-md"
                    style={{ background: "rgba(255,255,255,0.08)", fontSize: "7px", fontWeight: 600, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}
                  >
                    {svc.badge}
                  </span>
                </div>
                <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{svc.subtitle}</div>
              </div>
            </div>

            {/* Bullet points */}
            <div className="flex flex-col gap-1 mb-3">
              {svc.bullets.map((b, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span style={{ fontSize: "7px", color: "rgba(255,255,255,0.25)", marginTop: 1 }}>•</span>
                  <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{b}</span>
                </div>
              ))}
            </div>

            {/* Footer: time + analyze button */}
            <div className="flex items-center justify-between mt-2">
              <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.28)" }}>⏱ {svc.time}</span>

              {/* Analyze button with progress */}
              <div className="relative overflow-hidden rounded-lg" style={{ minWidth: 72 }}>
                <motion.div
                  className="absolute inset-0 origin-left"
                  style={{ background: "rgba(255,255,255,0.12)", transformOrigin: "left" }}
                  animate={{ scaleX: analyzing ? progress / 100 : 0 }}
                  transition={{ duration: 0.08, ease: "linear" }}
                />
                <div
                  className="relative flex items-center gap-1.5 justify-center px-3 py-1.5"
                  style={{
                    background: analyzing ? "rgba(255,255,255,0.06)" : "#fff",
                    border: analyzing ? "1px solid rgba(255,255,255,0.12)" : "none",
                    borderRadius: 8,
                    transition: "background 0.3s",
                  }}
                >
                  {analyzing ? (
                    <>
                      <div style={{ display: "flex", gap: 2 }}>
                        {[0,1,2].map(i => (
                          <div key={i} style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.5)", animation: `mp-bounce 0.9s ease-in-out ${i*0.15}s infinite` }} />
                        ))}
                      </div>
                      <span style={{ fontSize: "8px", fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>Analyzing</span>
                    </>
                  ) : (
                    <>
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5h6M5.5 2L9 5l-3.5 3" stroke="#111" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span style={{ fontSize: "8px", fontWeight: 700, color: "#111" }}>Analyze</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Mini service list below */}
        <div className="flex flex-col gap-1.5 mt-2">
          {SERVICES.filter((_, i) => i !== activeCard).map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div style={{ fontSize: "9px" }}>{s.icon}</div>
              <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>{s.title}</span>
              <span style={{ fontSize: "7px", color: "rgba(255,255,255,0.2)", marginLeft: "auto" }}>{s.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Status bar ── */}
      <div
        className="flex items-center justify-between px-4 py-1.5"
        style={{ background: "#111", borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.22)" }}>9 services available</span>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#30d158", animation: "mp-pulse 2.4s ease-in-out infinite" }} />
          <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.22)" }}>Ready to publish</span>
        </div>
      </div>

      <style>{`
        @keyframes mp-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-3px)} }
        @keyframes mp-pulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}
