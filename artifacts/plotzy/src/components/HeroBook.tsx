import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";

const W = 200;
const H = 280;
const D = 32;

export function HeroBook() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotX = useSpring(useTransform(mouseX, [-1, 1], [5, 25]), { stiffness: 60, damping: 20 });
  const rotY = useSpring(useTransform(mouseY, [-1, 1], [-20, -38]), { stiffness: 60, damping: 20 });

  const containerRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent) {
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return;
    mouseX.set(((e.clientX - r.left) / r.width - 0.5) * 2);
    mouseY.set(((e.clientY - r.top) / r.height - 0.5) * 2);
  }
  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  const shadow = `${D * 1.5}px ${D * 2}px 60px rgba(0,0,0,0.55), ${D * 0.5}px ${D * 0.8}px 20px rgba(0,0,0,0.35)`;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: "1100px", width: W + D * 3, height: H + D * 3, display: "flex", alignItems: "center", justifyContent: "center", cursor: "none" }}
    >
      <motion.div
        style={{
          transformStyle: "preserve-3d",
          width: W,
          height: H,
          position: "relative",
          rotateX: rotX,
          rotateY: rotY,
          boxShadow: shadow,
          borderRadius: "2px 4px 4px 2px",
        }}
        initial={{ rotateX: 14, rotateY: -26, rotateZ: 2 }}
        animate={{
          y: [0, -14, 0],
          rotateZ: [2, 2.5, 2],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* ── FRONT COVER ── */}
        <div style={{
          position: "absolute", inset: 0,
          transform: `translateZ(${D / 2}px)`,
          background: "linear-gradient(150deg, #1C1000 0%, #2e1f00 55%, #18100a 100%)",
          borderRadius: "2px 4px 4px 2px",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: 22, boxSizing: "border-box", overflow: "hidden",
        }}>
          {/* Outer gold frame */}
          <div style={{ position: "absolute", inset: 12, border: "1.5px solid rgba(255,255,240,0.45)", borderRadius: 2, pointerEvents: "none" }} />
          {/* Inner thin frame */}
          <div style={{ position: "absolute", inset: 17, border: "0.5px solid rgba(255,255,240,0.2)", borderRadius: 1, pointerEvents: "none" }} />

          {/* Top ornamental line */}
          <div style={{ position: "absolute", top: 26, left: 26, right: 26, height: 1, background: "linear-gradient(to right, transparent, rgba(255,255,240,0.6), transparent)" }} />

          {/* Feather/pen icon drawn in SVG */}
          <svg width="38" height="38" viewBox="0 0 38 38" fill="none" style={{ marginBottom: 10, opacity: 0.85 }}>
            <path d="M28 4C28 4 34 10 30 20C26 30 12 32 8 34C8 34 14 24 16 18C18 12 22 8 28 4Z" stroke="#FFFFF8" strokeWidth="1.3" fill="rgba(255,255,240,0.08)" strokeLinejoin="round" />
            <path d="M8 34L20 18" stroke="#FFFFF8" strokeWidth="1" strokeLinecap="round" />
            <path d="M16 28C16 28 18 22 22 18" stroke="#FFFFF8" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
          </svg>

          {/* Book title */}
          <div style={{
            color: "rgba(255,255,240,0.92)",
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 22, fontWeight: 700,
            letterSpacing: "0.08em",
            textAlign: "center",
            lineHeight: 1.2,
          }}>
            PLOTZY
          </div>

          {/* Subtitle */}
          <div style={{
            color: "rgba(255,255,240,0.42)",
            fontSize: 8, letterSpacing: "0.35em",
            textTransform: "uppercase", marginTop: 8,
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
          }}>
            Write · Create · Publish
          </div>

          {/* Bottom ornamental line */}
          <div style={{ position: "absolute", bottom: 26, left: 26, right: 26, height: 1, background: "linear-gradient(to right, transparent, rgba(255,255,240,0.6), transparent)" }} />

          {/* Corner ornaments */}
          {[["14px","14px"],["14px","auto"],["auto","14px"],["auto","auto"]].map(([t,b], i) => (
            <div key={i} style={{
              position: "absolute",
              top: t === "auto" ? undefined : "20px",
              bottom: b === "auto" ? undefined : "20px",
              left: i % 2 === 0 ? "20px" : undefined,
              right: i % 2 === 1 ? "20px" : undefined,
              width: 8, height: 8,
              borderTop: i < 2 ? "1px solid rgba(255,255,240,0.5)" : undefined,
              borderBottom: i >= 2 ? "1px solid rgba(255,255,240,0.5)" : undefined,
              borderLeft: i % 2 === 0 ? "1px solid rgba(255,255,240,0.5)" : undefined,
              borderRight: i % 2 === 1 ? "1px solid rgba(255,255,240,0.5)" : undefined,
            }} />
          ))}

          {/* Cover gloss */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(125deg, rgba(255,255,255,0.06) 0%, transparent 45%)",
            borderRadius: "2px 4px 4px 2px", pointerEvents: "none",
          }} />
        </div>

        {/* ── BACK COVER ── */}
        <div style={{
          position: "absolute", inset: 0,
          transform: `rotateY(180deg) translateZ(${D / 2}px)`,
          background: "linear-gradient(150deg, #18100a 0%, #2a1800 100%)",
          borderRadius: "4px 2px 2px 4px",
        }} />

        {/* ── SPINE ── */}
        <div style={{
          position: "absolute",
          width: D, height: H,
          left: -(D / 2), top: 0,
          transform: `rotateY(-90deg) translateZ(${D / 2}px)`,
          transformOrigin: "right center",
          background: "linear-gradient(to right, #0a0600, #1a1200, #2a1800)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ position: "absolute", left: "50%", top: 12, bottom: 12, width: 1, background: "linear-gradient(to bottom, transparent, rgba(255,255,240,0.45), transparent)" }} />
          <div style={{
            writingMode: "vertical-rl", textOrientation: "mixed",
            color: "rgba(212,175,55,0.55)", fontSize: 8,
            letterSpacing: "0.25em", textTransform: "uppercase",
            fontFamily: "Georgia, serif",
          }}>
            Plotzy
          </div>
        </div>

        {/* ── PAGE EDGES ── */}
        <div style={{
          position: "absolute",
          width: D, height: H,
          right: -(D / 2), top: 0,
          transform: `rotateY(90deg) translateZ(${D / 2}px)`,
          transformOrigin: "left center",
          overflow: "hidden", borderRadius: "0 2px 2px 0",
          background: "repeating-linear-gradient(to bottom, #ede7dc 0px, #ede7dc 1px, #cfc9bc 1px, #cfc9bc 2px)",
        }} />

        {/* ── TOP EDGE ── */}
        <div style={{
          position: "absolute",
          width: W, height: D,
          top: -(D / 2), left: 0,
          transform: `rotateX(90deg) translateZ(${D / 2}px)`,
          transformOrigin: "center bottom",
          background: "linear-gradient(to bottom, #e5ddd0, #d0c8b8)",
        }} />

        {/* ── BOTTOM EDGE ── */}
        <div style={{
          position: "absolute",
          width: W, height: D,
          bottom: -(D / 2), left: 0,
          transform: `rotateX(-90deg) translateZ(${D / 2}px)`,
          transformOrigin: "center top",
          background: "linear-gradient(to top, #e5ddd0, #d0c8b8)",
        }} />
      </motion.div>
    </div>
  );
}
