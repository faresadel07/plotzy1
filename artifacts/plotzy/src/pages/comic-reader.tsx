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
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Download, Maximize, Minimize } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useIsPhone } from "@/hooks/use-is-phone";
import { findComic, comicPage, comicPdfUrl } from "@/lib/comics";

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Desktop-only in-site PDF overlay (phones open the system viewer in
  // a new tab instead; iframed PDFs are broken on iOS).
  const [pdfOpen, setPdfOpen] = useState(false);
  const touchX = useRef<number | null>(null);
  const width = isPhone ? 800 : 1400;
  const pdfUrl = comic ? comicPdfUrl(comic) : null;

  // Track fullscreen state so the toggle icon stays honest even when
  // the user exits with Escape.
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

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

        {/* Download the whole issue as PDF. Desktop opens an in-site
            viewer overlay (no leaving Plotzy); phones open the system
            viewer in a new tab, keeping this tab on the site. */}
        {pdfUrl && (isPhone ? (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download PDF"
            title="Download PDF"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 34, height: 34, borderRadius: 999, flexShrink: 0,
              background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.14)",
              color: "#fff", textDecoration: "none",
            }}
          >
            <Download size={15} />
          </a>
        ) : (
          <button
            onClick={() => setPdfOpen(true)}
            aria-label="Download PDF"
            title="Download PDF"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 34, height: 34, borderRadius: 999, flexShrink: 0,
              background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.14)",
              color: "#fff", cursor: "pointer",
            }}
          >
            <Download size={15} />
          </button>
        ))}

        {/* Fullscreen (desktop) */}
        {!isPhone && (
          <button
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else void document.documentElement.requestFullscreen();
            }}
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 34, height: 34, borderRadius: 999, flexShrink: 0,
              background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.14)",
              color: "#fff", cursor: "pointer",
            }}
          >
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        )}
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

      {/* In-site PDF overlay (desktop): the browser's PDF viewer inside
          Plotzy, with its own save button — the reader never leaves. */}
      {pdfOpen && pdfUrl && (
        <div style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#141416", borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {comic.title} · PDF
            </span>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.6)", textDecoration: "none", padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.14)" }}
            >
              Open in new tab
            </a>
            <button
              onClick={() => setPdfOpen(false)}
              aria-label="Close PDF"
              style={{ width: 32, height: 32, borderRadius: 999, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.10)", color: "#fff", display: "grid", placeItems: "center" }}
            >
              <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>×</span>
            </button>
          </div>
          <iframe
            src={pdfUrl}
            title={`${comic.title} PDF`}
            style={{ flex: 1, border: "none", background: "#333" }}
          />
        </div>
      )}
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
