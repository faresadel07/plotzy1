import { useEffect, useState } from "react";

export function BookOpeningAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"opening" | "fading">("opening");

  useEffect(() => {
    // Start fading the overlay after book opens
    const fadeTimer = setTimeout(() => setPhase("fading"), 1400);
    // Fully complete after fade
    const doneTimer = setTimeout(() => onComplete(), 2000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#f5f0e8] transition-opacity duration-500 ${
        phase === "fading" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-pulse" />
      </div>

      {/* Book container */}
      <div className="relative book-scene">
        <div className="book-body">
          {/* Book spine (center) */}
          <div className="book-spine-center" />

          {/* Left cover */}
          <div className="book-cover book-cover-left">
            <div className="book-cover-inner book-cover-inner-left">
              <span className="book-title-text">Plotzy</span>
            </div>
          </div>

          {/* Right cover */}
          <div className="book-cover book-cover-right">
            <div className="book-cover-inner book-cover-inner-right" />
          </div>

          {/* Pages (visible between covers) */}
          <div className="book-pages">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="book-page" style={{ animationDelay: `${0.1 + i * 0.04}s` }} />
            ))}
          </div>
        </div>

        {/* Tagline below book */}
        <p className="book-tagline">Your story starts here...</p>
      </div>
    </div>
  );
}
