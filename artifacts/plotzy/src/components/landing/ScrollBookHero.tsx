import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { TextShimmer } from "@/components/ui/text-shimmer";

/* ═══════════════════════════════════════════════════════════════
   ScrollBookHero
   ─ Library BG with warm 2D illustration
   ─ Scroll-driven 3D book falls from top, lands, opens
   ─ Content floats up from open pages (TextShimmer headline)
   ─ Gold CTA buttons
═══════════════════════════════════════════════════════════════ */

const GOLD = "#FFFFF8";
const GOLD_LIGHT = "#FFFFFF";
const GOLD_DARK = "#FFFFF8";

interface ScrollBookHeroProps {
  onStartWriting: () => void;
  onExplore: () => void;
}

export function ScrollBookHero({ onStartWriting, onExplore }: ScrollBookHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bookLanded, setBookLanded] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  /* ── Smooth spring for scroll progress ── */
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 60, damping: 20 });

  /* ── Book falls from top: 0→0.3 of scroll ── */
  const bookY = useTransform(smoothProgress, [0, 0.25], ["-120vh", "0vh"]);
  const bookRotateX = useTransform(smoothProgress, [0, 0.20, 0.25], ["-35deg", "8deg", "0deg"]);
  const bookRotateZ = useTransform(smoothProgress, [0, 0.25], ["12deg", "0deg"]);
  const bookScale = useTransform(smoothProgress, [0, 0.15, 0.25], [0.6, 1.1, 1.0]);
  const bookOpacity = useTransform(smoothProgress, [0, 0.05], [0, 1]);

  /* ── Book cover open angle: 0.28→0.5 ── */
  const leftCoverAngle = useTransform(smoothProgress, [0.28, 0.52], [0, -155]);
  const rightCoverAngle = useTransform(smoothProgress, [0.28, 0.52], [0, 155]);
  const spineScaleX = useTransform(smoothProgress, [0.28, 0.52], [1, 0.12]);

  /* ── Content fades in from pages: 0.50→0.70 ── */
  const contentOpacity = useTransform(smoothProgress, [0.50, 0.65], [0, 1]);
  const contentY = useTransform(smoothProgress, [0.50, 0.68], ["60px", "0px"]);

  /* ── Book shrinks as content grows ── */
  const bookShrink = useTransform(smoothProgress, [0.52, 0.68], [1, 0.7]);
  const bookMoveUp = useTransform(smoothProgress, [0.52, 0.68], ["0px", "-120px"]);

  /* ── Parallax library elements ── */
  const bgParallax = useTransform(smoothProgress, [0, 1], ["0%", "25%"]);

  /* ── State triggers for CSS animations ── */
  useEffect(() => {
    const unsub = smoothProgress.on("change", (v) => {
      if (!hasScrolled && v > 0.01) setHasScrolled(true);
      if (v > 0.25 && !bookLanded) setBookLanded(true);
      if (v > 0.45 && !bookOpen) setBookOpen(true);
      if (v > 0.58 && !contentVisible) setContentVisible(true);
    });
    return unsub;
  }, [smoothProgress, bookLanded, bookOpen, contentVisible, hasScrolled]);

  const features = [
    { icon: "✦", label: "AI Writing Assistant" },
    { icon: "✦", label: "Smart Outline Builder" },
    { icon: "✦", label: "One-Click Publish" },
    { icon: "✦", label: "Live Analytics" },
  ];

  return (
    /* ── 200vh scroll container so there's room to scroll ── */
    <div ref={containerRef} style={{ height: "200vh", position: "relative" }}>

      {/* ═══ STICKY VIEWPORT ═══ */}
      <div style={{
        position: "sticky",
        top: 0,
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}>

        {/* ── LIBRARY BACKGROUND ── */}
        <motion.div
          style={{ y: bgParallax }}
          className="absolute inset-0 -z-10"
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "url('/library-hero.png')",
              backgroundSize: "cover",
              backgroundPosition: "center center",
              backgroundRepeat: "no-repeat",
              transform: "scale(1.1)",
            }}
          />
          {/* Dark overlay */}
          <div className="absolute inset-0" style={{
            background: "linear-gradient(to bottom, rgba(20,3,0,0.55) 0%, rgba(15,2,0,0.72) 60%, rgba(8,1,0,0.88) 100%)"
          }} />
          {/* Golden chandelier glow */}
          <div className="absolute" style={{
            top: "-5%", left: "20%", width: "60%", height: "55%",
            background: "radial-gradient(ellipse at 50% 20%, rgba(212,175,55,0.18) 0%, transparent 65%)",
            animation: "shimmer 5s ease-in-out infinite",
          }} />
        </motion.div>

        {/* ── FLOATING BOOK DECORATIONS (before scroll) ── */}
        <AnimatePresence>
          {!hasScrolled && (
            <>
              {[
                { x: "8%",  y: "20%", rot: -15, color: "#8B2020", delay: 0 },
                { x: "82%", y: "15%", rot:  12, color: "#1A3A6B", delay: 0.3 },
                { x: "5%",  y: "65%", rot:   8, color: "#1A5C2A", delay: 0.5 },
                { x: "88%", y: "60%", rot: -10, color: "#6B3A1A", delay: 0.2 },
                { x: "50%", y: "8%",  rot:   4, color: "#4A1A6B", delay: 0.4 },
              ].map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: [0, -10, 0], transition: { opacity: { duration: 0.6, delay: b.delay }, y: { duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: b.delay } } }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: "absolute",
                    left: b.x, top: b.y,
                    transform: `rotate(${b.rot}deg)`,
                    width: 44, height: 62,
                    background: `linear-gradient(135deg, ${b.color} 0%, ${b.color}cc 100%)`,
                    borderRadius: 4,
                    boxShadow: "4px 6px 16px rgba(0,0,0,0.5)",
                    zIndex: 2,
                  }}
                >
                  <div style={{ position: "absolute", top: 8, left: 5, right: 5, height: 2, background: "rgba(255,255,255,0.3)", borderRadius: 1 }} />
                  <div style={{ position: "absolute", top: 13, left: 5, right: 5, height: 1.5, background: "rgba(255,255,255,0.15)", borderRadius: 1 }} />
                </motion.div>
              ))}
            </>
          )}
        </AnimatePresence>

        {/* ── INITIAL HERO TEXT (before scroll) ── */}
        <AnimatePresence>
          {!hasScrolled && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.9, ease: "easeOut" } }}
              exit={{ opacity: 0, y: -20, transition: { duration: 0.4 } }}
              style={{
                position: "absolute",
                top: 0, left: 0, right: 0, bottom: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 5,
                textAlign: "center",
                padding: "0 1.5rem",
                pointerEvents: "none",
              }}
            >
              {/* Badge */}
              <div style={{
                display: "inline-block",
                padding: "6px 22px",
                borderRadius: 999,
                border: `1px solid ${GOLD}55`,
                background: `${GOLD}18`,
                color: GOLD_LIGHT,
                fontSize: "0.78rem",
                letterSpacing: "0.14em",
                fontWeight: 600,
                textTransform: "uppercase",
                marginBottom: 22,
              }}>✦ Your story starts here</div>

              <h1 style={{
                fontSize: "clamp(2.2rem, 6vw, 5rem)",
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "#fff",
                maxWidth: 820,
                marginBottom: 20,
                textShadow: "0 4px 40px rgba(0,0,0,0.8)",
              }}>
                Write your first book{" "}
                <span style={{
                  background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%, ${GOLD_DARK} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>easily</span>{" "}with{" "}
                <span style={{
                  background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>Plotzy</span>
              </h1>

              <p style={{
                fontSize: "clamp(0.95rem, 1.8vw, 1.2rem)",
                color: "rgba(255,235,195,0.85)",
                maxWidth: 520,
                lineHeight: 1.7,
                marginBottom: 32,
                textShadow: "0 2px 12px rgba(0,0,0,0.5)",
              }}>
                Discover independent authors and craft high-quality books in one place.
              </p>

              {/* Scroll hint */}
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                style={{ marginTop: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
              >
                <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.2em", color: `${GOLD}99`, fontWeight: 600 }}>Scroll to reveal</span>
                <svg width="20" height="28" viewBox="0 0 20 28" fill="none">
                  <rect x="1" y="1" width="18" height="26" rx="9" stroke={GOLD} strokeOpacity="0.5" strokeWidth="1.5"/>
                  <rect x="9" y="5" width="2" height="6" rx="1" fill={GOLD} fillOpacity="0.6"/>
                </svg>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════
            THE 3D BOOK (appears on scroll)
        ══════════════════════════════════════════ */}
        <motion.div
          style={{
            y: bookY,
            rotateX: bookRotateX,
            rotateZ: bookRotateZ,
            scale: bookScale,
            opacity: bookOpacity,
            scaleY: bookShrink,
            translateY: bookMoveUp,
            position: "absolute",
            zIndex: 10,
            perspective: "1200px",
          }}
        >
          {/* Book outer wrapper */}
          <div style={{
            width: 240,
            height: 320,
            position: "relative",
            transformStyle: "preserve-3d",
            perspective: "1200px",
          }}>

            {/* Pages (visible when open) */}
            <div style={{
              position: "absolute",
              inset: "6px 8px",
              background: "linear-gradient(90deg, #EDE0C8 0%, #F5ECD8 45%, #FDFAF3 50%, #F5ECD8 55%, #EDE0C8 100%)",
              borderRadius: 3,
              boxShadow: "inset 0 0 20px rgba(0,0,0,0.15)",
              zIndex: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}>
              {/* Page lines */}
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} style={{
                  position: "absolute",
                  left: "10%", right: "10%",
                  top: `${12 + i * 5}%`,
                  height: 1,
                  background: "rgba(139,110,70,0.15)",
                  borderRadius: 1,
                }} />
              ))}
              {/* Centre spine crease */}
              <div style={{
                position: "absolute",
                left: "50%",
                top: 0, bottom: 0,
                width: 2,
                background: "linear-gradient(180deg, transparent, rgba(139,110,70,0.25) 20%, rgba(139,110,70,0.45) 50%, rgba(139,110,70,0.25) 80%, transparent)",
                transform: "translateX(-50%)",
              }} />
            </div>

            {/* LEFT COVER */}
            <motion.div
              style={{
                position: "absolute",
                top: 0, left: 0,
                width: "50%", height: "100%",
                transformOrigin: "right center",
                transformStyle: "preserve-3d",
                rotateY: leftCoverAngle,
                zIndex: bookOpen ? 3 : 5,
              }}
            >
              <div style={{
                width: "100%", height: "100%",
                background: `linear-gradient(160deg, #7B0F0F 0%, #9B1515 35%, #6B0A0A 70%, #4A0707 100%)`,
                borderRadius: "6px 0 0 6px",
                boxShadow: "inset -4px 0 12px rgba(0,0,0,0.5), inset 2px 0 6px rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                position: "relative",
              }}>
                {/* Gold decorative lines on cover */}
                <div style={{ position: "absolute", top: 14, left: 10, right: 6, height: 1, background: `${GOLD}55` }} />
                <div style={{ position: "absolute", bottom: 14, left: 10, right: 6, height: 1, background: `${GOLD}55` }} />
                <div style={{ position: "absolute", top: 18, left: 10, right: 6, height: 1, background: `${GOLD}33` }} />
                <div style={{ position: "absolute", bottom: 18, left: 10, right: 6, height: 1, background: `${GOLD}33` }} />
                {/* "P" monogram */}
                <div style={{
                  fontFamily: "'Georgia', serif",
                  fontSize: 42,
                  fontWeight: 700,
                  color: GOLD,
                  opacity: 0.85,
                  textShadow: `0 0 20px ${GOLD}66`,
                  letterSpacing: 2,
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                }}>PLOTZY</div>
              </div>
            </motion.div>

            {/* RIGHT COVER */}
            <motion.div
              style={{
                position: "absolute",
                top: 0, right: 0,
                width: "50%", height: "100%",
                transformOrigin: "left center",
                transformStyle: "preserve-3d",
                rotateY: rightCoverAngle,
                zIndex: bookOpen ? 3 : 5,
              }}
            >
              <div style={{
                width: "100%", height: "100%",
                background: `linear-gradient(200deg, #9B1515 0%, #7B0F0F 35%, #5C0A0A 70%, #4A0707 100%)`,
                borderRadius: "0 6px 6px 0",
                boxShadow: "inset 4px 0 12px rgba(0,0,0,0.5), inset -2px 0 6px rgba(255,255,255,0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                position: "relative",
              }}>
                <div style={{ position: "absolute", top: 14, left: 6, right: 10, height: 1, background: `${GOLD}55` }} />
                <div style={{ position: "absolute", bottom: 14, left: 6, right: 10, height: 1, background: `${GOLD}55` }} />
                <div style={{ position: "absolute", top: 18, left: 6, right: 10, height: 1, background: `${GOLD}33` }} />
                <div style={{ position: "absolute", bottom: 18, left: 6, right: 10, height: 1, background: `${GOLD}33` }} />
              </div>
            </motion.div>

            {/* SPINE */}
            <motion.div
              style={{
                position: "absolute",
                top: 0, left: "50%",
                width: 16,
                height: "100%",
                transform: "translateX(-50%)",
                scaleX: spineScaleX,
                transformOrigin: "center",
                background: "linear-gradient(180deg, #3A0808 0%, #5C0F0F 50%, #3A0808 100%)",
                zIndex: 6,
              }}
            />

            {/* BOOK SHADOW */}
            <div style={{
              position: "absolute",
              bottom: -20,
              left: "10%",
              right: "10%",
              height: 30,
              background: "radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, transparent 70%)",
              filter: "blur(8px)",
              zIndex: -1,
            }} />
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════
            CONTENT EMERGING FROM OPEN BOOK
        ══════════════════════════════════════════ */}
        <motion.div
          style={{
            opacity: contentOpacity,
            y: contentY,
            position: "absolute",
            zIndex: 20,
            textAlign: "center",
            padding: "0 1.5rem",
            width: "100%",
            maxWidth: 900,
            pointerEvents: contentVisible ? "auto" : "none",
          }}
        >
          {/* Gold particle sparks */}
          <motion.div style={{ position: "absolute", top: -60, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 14 }}
            initial={{ opacity: 0 }} animate={contentVisible ? { opacity: 1 } : {}}>
            {["✦","✧","✦","✧","✦"].map((s, i) => (
              <motion.span key={i} style={{ color: GOLD, fontSize: i % 2 === 0 ? 12 : 8, opacity: 0.7 }}
                animate={{ y: [0, -12, 0], opacity: [0.7, 1, 0.7] }}
                transition={{ repeat: Infinity, duration: 2 + i * 0.4, delay: i * 0.2 }}>{s}</motion.span>
            ))}
          </motion.div>

          {/* TextShimmer headline */}
          <div style={{ marginBottom: 20, marginTop: 80 }}>
            <TextShimmer
              duration={1.2}
              spread={3}
              as="h2"
              className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight [--base-color:theme(colors.yellow.600)] [--base-gradient-color:theme(colors.yellow.200)] dark:[--base-color:theme(colors.yellow.600)] dark:[--base-gradient-color:theme(colors.yellow.300)]"
            >
              Write your first book easily with Plotzy
            </TextShimmer>
          </div>

          {/* Sub-copy */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={contentVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{
              fontSize: "clamp(0.95rem, 1.6vw, 1.15rem)",
              color: "rgba(255,235,195,0.9)",
              maxWidth: 540,
              margin: "0 auto 28px",
              lineHeight: 1.75,
              textShadow: "0 2px 12px rgba(0,0,0,0.5)",
            }}
          >
            Your story deserves to exist. Plotzy's AI platform makes writing your first book feel natural, guided, and genuinely exciting.
          </motion.p>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={contentVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.5 }}
            style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginBottom: 32 }}
          >
            {features.map((f, i) => (
              <div key={i} style={{
                padding: "6px 16px",
                borderRadius: 999,
                border: `1px solid ${GOLD}44`,
                background: `${GOLD}14`,
                color: GOLD_LIGHT,
                fontSize: "0.8rem",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}>
                {f.icon} {f.label}
              </div>
            ))}
          </motion.div>

          {/* CTA BUTTONS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={contentVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.65 }}
            style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}
          >
            <button
              onClick={onStartWriting}
              style={{
                padding: "15px 40px",
                borderRadius: 14,
                fontWeight: 700,
                fontSize: "0.92rem",
                letterSpacing: "0.04em",
                background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 55%, ${GOLD_DARK} 100%)`,
                border: "none",
                color: "#1a0a00",
                boxShadow: `0 8px 32px ${GOLD}55, 0 2px 8px rgba(0,0,0,0.4)`,
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
                minWidth: 200,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-3px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 14px 40px ${GOLD}70, 0 2px 8px rgba(0,0,0,0.4)`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = "";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 32px ${GOLD}55, 0 2px 8px rgba(0,0,0,0.4)`;
              }}
            >
              📖 Start Writing Now
            </button>

            <button
              onClick={onExplore}
              style={{
                padding: "15px 40px",
                borderRadius: 14,
                fontWeight: 600,
                fontSize: "0.92rem",
                letterSpacing: "0.04em",
                background: "rgba(255,255,255,0.08)",
                color: GOLD_LIGHT,
                border: `1.5px solid ${GOLD}55`,
                cursor: "pointer",
                backdropFilter: "blur(10px)",
                transition: "background 0.2s, border-color 0.2s",
                minWidth: 200,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = `${GOLD}22`;
                (e.currentTarget as HTMLButtonElement).style.borderColor = `${GOLD}99`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = `${GOLD}55`;
              }}
            >
              Explore Library
            </button>
          </motion.div>
        </motion.div>

      </div>{/* /sticky */}
    </div>
  );
}
