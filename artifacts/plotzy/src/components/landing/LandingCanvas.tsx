import { useEffect, useRef } from "react";

/* ─────────────────────────────────────────────────────────────
   LandingCanvas – Warm 2D illustrated library hero background
   Uses the generated cartoon library illustration as the hero BG.
   A subtle gradient overlay ensures hero text remains readable.
───────────────────────────────────────────────────────────── */

const STYLES = `
@keyframes libShimmer {
  0%, 100% { opacity: 0.60; }
  50%       { opacity: 0.90; }
}
.lib-shimmer { animation: libShimmer 5s ease-in-out infinite; }
`;

export function LandingCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!document.getElementById("__lib-hero-styles")) {
      const style = document.createElement("style");
      style.id = "__lib-hero-styles";
      style.textContent = STYLES;
      document.head.appendChild(style);
    }
    return () => { document.getElementById("__lib-hero-styles")?.remove(); };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 overflow-hidden select-none">

      {/* ── Main library illustration ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/library-hero.png')",
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* ── Gradient overlay: darken bottom so text pops, keep top vibrant ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(30,4,2,0.35) 0%, rgba(20,2,1,0.62) 55%, rgba(10,1,0,0.82) 100%)",
        }}
      />

      {/* ── Subtle warm golden chandelier glow (centre-top) ── */}
      <div
        className="lib-shimmer absolute"
        style={{
          top: "-5%",
          left: "25%",
          width: "50%",
          height: "50%",
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(255,200,80,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
