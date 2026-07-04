// Full-screen comic reader. Pages stream straight from the Internet
// Archive at a width tuned to the device (800px phones, 1400px
// desktop), with the two neighbouring pages preloaded so flipping
// feels instant.
//
// Phone: swipe left/right to flip, tap the side thirds to flip, tap
// the middle to toggle the chrome. Desktop: on-screen arrows and the
// keyboard (left/right/space), same middle-click chrome toggle.
// Reading position is remembered per issue in localStorage.

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useIsPhone } from "@/hooks/use-is-phone";
import { findComic, comicPage } from "@/lib/comics";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export default function ComicReader() {
  const [, params] = useRoute("/comics/:id");
  const [, navigate] = useLocation();
  const isPhone = useIsPhone();
  const comic = findComic(params?.id ?? "");

  const posKey = comic ? `plotzy_comic_pos_${comic.id}` : "";
  const [page, setPage] = useState(() => {
    if (!comic) return 0;
    try {
      const saved = Number(window.localStorage?.getItem(posKey));
      if (Number.isFinite(saved) && saved > 0 && saved < comic.pages) return saved;
    } catch { /* private mode */ }
    return 0;
  });
  const [chrome, setChrome] = useState(true);
  const [loading, setLoading] = useState(true);
  const touchX = useRef<number | null>(null);
  const width = isPhone ? 800 : 1400;

  // Unknown id (stale link): land on the library instead of a black
  // screen.
  useEffect(() => {
    if (!comic) navigate("/comics");
  }, [comic, navigate]);

  const go = useCallback((delta: number) => {
    if (!comic) return;
    setPage((p) => {
      const next = Math.max(0, Math.min(comic.pages - 1, p + delta));
      if (next !== p) setLoading(true);
      return next;
    });
  }, [comic]);

  // Persist position + preload neighbours on every page change.
  useEffect(() => {
    if (!comic) return;
    try { window.localStorage?.setItem(posKey, String(page)); } catch { /* noop */ }
    [page + 1, page - 1].forEach((n) => {
      if (n >= 0 && n < comic.pages) {
        const img = new Image();
        img.src = comicPage(comic.id, n, width);
      }
    });
  }, [comic, page, posKey, width]);

  // Keyboard navigation (desktop).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      if (e.key === "Escape") navigate("/comics");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, navigate]);

  if (!comic) return null;

  return (
    <div
      dir="ltr"
      style={{
        position: "fixed", inset: 0, zIndex: 40, background: "#0b0b0d",
        fontFamily: SF, userSelect: "none", WebkitUserSelect: "none",
        overflow: "hidden",
      }}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 55) go(dx < 0 ? 1 : -1);
      }}
    >
      <SEO titleOverride={`${comic.title} · Plotzy Comics`} />

      {/* Page image */}
      <div
        style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
        onClick={(e) => {
          const x = e.clientX / window.innerWidth;
          if (x < 0.3) go(-1);
          else if (x > 0.7) go(1);
          else setChrome((v) => !v);
        }}
      >
        {loading && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
            <Loader2 size={26} color="rgba(255,255,255,0.45)" style={{ animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        <img
          key={page}
          src={comicPage(comic.id, page, width)}
          alt={`${comic.title}, page ${page + 1}`}
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
          draggable={false}
          style={{
            maxWidth: "100%", maxHeight: "100%",
            objectFit: "contain",
            opacity: loading ? 0.35 : 1,
            transition: "opacity 160ms ease",
          }}
        />
      </div>

      {/* Desktop flip arrows */}
      {!isPhone && chrome && (
        <>
          {page > 0 && (
            <button onClick={() => go(-1)} aria-label="Previous page" style={arrowStyle("left")}>
              <ChevronLeft size={22} />
            </button>
          )}
          {page < comic.pages - 1 && (
            <button onClick={() => go(1)} aria-label="Next page" style={arrowStyle("right")}>
              <ChevronRight size={22} />
            </button>
          )}
        </>
      )}

      {/* Top chrome */}
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0,
          padding: "calc(env(safe-area-inset-top, 0px) + 10px) 14px 12px",
          background: "linear-gradient(180deg, rgba(0,0,0,0.78), rgba(0,0,0,0))",
          display: "flex", alignItems: "center", gap: 12,
          transition: "opacity 220ms ease, transform 220ms ease",
          opacity: chrome ? 1 : 0,
          transform: chrome ? "none" : "translateY(-12px)",
          pointerEvents: chrome ? "auto" : "none",
        }}
      >
        <button
          onClick={() => navigate("/comics")}
          aria-label="Back to comics"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 34, height: 34, borderRadius: 999, flexShrink: 0,
            background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.14)",
            color: "#fff", cursor: "pointer",
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {comic.title}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
            {comic.series}{comic.year ? ` · ${comic.year}` : ""}
          </div>
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.75)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
          {page + 1} / {comic.pages}
        </div>
      </div>

      {/* Bottom chrome: page slider */}
      <div
        style={{
          position: "absolute", left: 0, right: 0, bottom: 0,
          padding: "18px 18px calc(env(safe-area-inset-bottom, 0px) + 16px)",
          background: "linear-gradient(0deg, rgba(0,0,0,0.78), rgba(0,0,0,0))",
          transition: "opacity 220ms ease, transform 220ms ease",
          opacity: chrome ? 1 : 0,
          transform: chrome ? "none" : "translateY(12px)",
          pointerEvents: chrome ? "auto" : "none",
        }}
      >
        <input
          type="range"
          min={0}
          max={comic.pages - 1}
          value={page}
          aria-label="Page"
          onChange={(e) => { setLoading(true); setPage(Number(e.target.value)); }}
          style={{ width: "100%", accentColor: "#fff", cursor: "pointer" }}
        />
      </div>
    </div>
  );
}

function arrowStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    [side]: 18,
    width: 44, height: 44, borderRadius: 999,
    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)",
    color: "#fff", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    backdropFilter: "blur(8px)",
  };
}
