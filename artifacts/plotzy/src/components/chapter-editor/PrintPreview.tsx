// Two-page book-style preview of the current chapter. The layout is
// content-direction-aware: an Arabic manuscript opens right page first
// with the binding shadows, page-number ordering, running headers and
// padding asymmetry all mirrored, exactly like a printed Arabic book.
// English/LTR manuscripts open left page first. The first letter is
// rendered at the same size as every other letter (no drop cap, by the
// product team's request).
//
// The pages array passed in is treated as the FINAL ordered list of
// pages for the preview. The caller (chapter-editor.tsx) is responsible
// for paginating the raw chapter content into roughly-equal page-sized
// chunks before handing them here.

import { useEffect, useRef } from "react";
import { BookOpen, Printer, ChevronLeft, ChevronRight, X } from "lucide-react";

const PAPER_SIZES: Record<string, { width: number; height: number; widthCm: number; heightCm: number; label: string; labelAr: string; icon: string }> = {
  a5:     { width: 559,  height: 794,  widthCm: 14.8, heightCm: 21.0, label: "Classic Novel",      labelAr: "رواية كلاسيكية",  icon: "📖" },
  pocket: { width: 416,  height: 680,  widthCm: 11.0, heightCm: 18.0, label: "Pocket Book",        labelAr: "كتاب جيب",        icon: "✋" },
  trade:  { width: 576,  height: 864,  widthCm: 15.2, heightCm: 22.9, label: "Professional Trade", labelAr: "تجاري احترافي",   icon: "📚" },
  a4:     { width: 794,  height: 1123, widthCm: 21.0, heightCm: 29.7, label: "Standard A4",        labelAr: "A4 قياسي",        icon: "📄" },
};

interface PrintPreviewProps {
  printPages: string[];
  currentSpread: number;
  setCurrentSpread: React.Dispatch<React.SetStateAction<number>>;
  maxSpread: number;
  fontStyle: React.CSSProperties;
  prefs: { textColor?: string; paperSize?: string; pageTheme?: string; bgColor?: string; [key: string]: any };
  resolvedBgColor: string | undefined;
  title: string;
  bookTitle: string;
  authorName: string;
  /** Reading direction inferred from the chapter content itself, not
   *  from the UI language. Arabic manuscripts get "rtl" even when the
   *  writer is browsing the app in English. */
  contentDir: "rtl" | "ltr";
  /** UI language for the chrome around the preview (top bar, nav
   *  buttons, "min read" etc). Independent of content direction. */
  ar: boolean;
  onClose: () => void;
  renderPageContent: (html: string, isFirstPage: boolean) => React.ReactNode;
}

export function PrintPreview({
  printPages,
  currentSpread,
  setCurrentSpread,
  maxSpread,
  fontStyle,
  prefs,
  resolvedBgColor,
  title,
  bookTitle,
  authorName,
  contentDir,
  ar,
  onClose,
  renderPageContent,
}: PrintPreviewProps) {
  const printScrollRef = useRef<HTMLDivElement>(null);
  const isRTL = contentDir === "rtl";

  const totalWords = printPages.join(" ").split(/\s+/).filter(Boolean).length;
  const readMins = Math.max(1, Math.round(totalWords / 200));
  const progressPct = maxSpread > 0 ? (currentSpread / maxSpread) * 100 : 100;
  const pageFont = fontStyle.fontFamily || "Georgia, 'Times New Roman', serif";
  const pageColor = prefs.textColor || "#111111";
  const pageBg = resolvedBgColor || "#FFFEF8";

  const ps = PAPER_SIZES[prefs.paperSize || "trade"];
  const MAX_SPREAD_W = Math.min(window.innerWidth - 48, 1200);
  const spreadRawW = ps.width * 2 + 6;
  const pvScaleW = Math.min(1, MAX_SPREAD_W / spreadRawW);
  const MAX_SPREAD_H = Math.max(280, window.innerHeight - 56 - 2 - 64 - 96);
  const pvScaleH = Math.min(1, MAX_SPREAD_H / ps.height);
  const pvScale = Math.min(pvScaleW, pvScaleH);
  const pvPageW = Math.round(ps.width * pvScale);
  const pvPageH = Math.round(ps.height * pvScale);
  const pvFontSz = Math.round(14 * pvScale);
  const pvLineh = "1.72";

  // Resolve which manuscript page index lives on the visual left vs
  // visual right side of the spread. For LTR the natural order is
  // [left=even, right=odd]; for RTL the page that reads first is the
  // visual right one, so [right=even, left=odd]. This is the only
  // place we have to think about direction; the rest of the renderer
  // can use these two indices opaquely.
  const startIdx = currentSpread * 2;
  const leftIdx  = isRTL ? startIdx + 1 : startIdx;
  const rightIdx = isRTL ? startIdx     : startIdx + 1;

  const leftHtml  = leftIdx  >= 0 ? printPages[leftIdx]  : undefined;
  const rightHtml = rightIdx >= 0 ? printPages[rightIdx] : undefined;
  const leftPageNum  = leftIdx  + 1;
  const rightPageNum = rightIdx + 1;

  // First-page flags so renderPageContent can tag its `isFirstPage`
  // argument correctly even though we no longer style a drop cap.
  const isLeftFirst  = leftIdx  === 0;
  const isRightFirst = rightIdx === 0;

  // Smooth fade-in on every spread change. Re-mount keyed on
  // currentSpread so the CSS animation re-runs.
  useEffect(() => {
    // No-op; kept for future hook into a CSS variable if needed.
  }, [currentSpread]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col select-none" style={{ background: "#0d0d0f" }}>
      <style>{`
        /* Paragraph layout. We deliberately do NOT style a drop cap —
           the first letter renders at the same size as the rest of the
           paragraph, per the May 2026 design call. */
        .pv-page p, .pv-page-first p { margin: 0 0 0.75em 0; line-height: ${pvLineh}; }
        .pv-page p + p { text-indent: 1.5em; }
        .pv-page strong, .pv-page-first strong { font-weight: 700; }
        .pv-page em, .pv-page-first em { font-style: italic; }
        .pv-page u, .pv-page-first u { text-decoration: underline; }
        .pv-page h1, .pv-page-first h1 { font-size: 1.4em; font-weight: 700; margin: 0.5em 0 0.8em; }
        .pv-page h2, .pv-page-first h2 { font-size: 1.2em; font-weight: 700; margin: 0.5em 0 0.6em; }
        .pv-page h3, .pv-page-first h3 { font-size: 1.05em; font-weight: 600; margin: 0.4em 0 0.5em; }
        .pv-page [style*="text-align: center"], .pv-page-first [style*="text-align: center"] { text-align: center; }
        .pv-page [style*="text-align: right"], .pv-page-first [style*="text-align: right"] { text-align: right; }
        .pv-page [style*="text-align: justify"], .pv-page-first [style*="text-align: justify"] { text-align: justify; }

        @keyframes pv-fade-in {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pv-spread-anim { animation: pv-fade-in 220ms ease-out both; }
      `}</style>

      {/* Top Bar (uses UI language) */}
      <div style={{ height: "56px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <BookOpen style={{ width: "15px", height: "15px", color: "rgba(255,255,255,0.22)", flexShrink: 0 }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: pageFont, fontSize: "13px", color: "rgba(255,255,255,0.55)", fontStyle: "italic", lineHeight: 1.2 }}>
              {bookTitle || (ar ? "كتاب بلا عنوان" : "Untitled Book")}
            </span>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.22)", marginTop: "1px" }}>
              {title} {authorName ? `· ${authorName}` : ""}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <span style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.20)", fontFamily: "system-ui" }}>
            {totalWords.toLocaleString()} {ar ? "كلمة" : "words"}
            {"  ·  "}
            ~{readMins} {ar ? "د قراءة" : "min read"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 16px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.45)", fontSize: "11px", letterSpacing: "0.08em", cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.10)"; e.currentTarget.style.color = "rgba(255,255,255,0.80)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
          >
            <Printer style={{ width: "12px", height: "12px" }} />
            {ar ? "طباعة" : "Print"}
          </button>
          <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.07)" }} />
          <button
            type="button"
            onClick={onClose}
            aria-label={ar ? "إغلاق" : "Close"}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", borderRadius: "6px", border: "none", background: "transparent", color: "rgba(255,255,255,0.30)", cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.80)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.30)"; }}
          >
            <X style={{ width: "16px", height: "16px" }} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ height: "2px", background: "rgba(255,255,255,0.04)", flexShrink: 0 }}>
        <div style={{ height: "100%", background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))", width: `${progressPct}%`, transition: "width 0.4s ease" }} />
      </div>

      {/* Book Area */}
      <div ref={printScrollRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem 1.5rem" }}>
        {printPages.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", color: "rgba(255,255,255,0.20)", fontFamily: pageFont, fontStyle: "italic" }}>
            <BookOpen style={{ width: "40px", height: "40px", opacity: 0.2 }} />
            <p style={{ fontSize: "16px" }}>{ar ? "لا يوجد محتوى بعد. ابدأ الكتابة!" : "No content yet. Start writing!"}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
            {/* Two-Page Spread. Keyed on currentSpread so the fade-in
                replays on every navigation. */}
            <div
              key={currentSpread}
              className="pv-spread-anim"
              style={{
                display: "flex",
                width: pvPageW * 2 + 6,
                height: pvPageH,
                flexShrink: 0,
                boxShadow: "0 48px 120px rgba(0,0,0,0.85), 0 16px 40px rgba(0,0,0,0.55)",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              {/* LEFT visual page. Its inside edge (toward the binding)
                  is on its RIGHT side, regardless of content direction. */}
              {renderBookPage({
                side: "left",
                pageNum: leftPageNum,
                html: leftHtml,
                isFirstPage: isLeftFirst,
                pvPageW, pvPageH, pvScale,
                pageBg, pageColor, pageFont, pvFontSz,
                bookTitle, chapterTitle: title, ar, isRTL,
                renderPageContent,
              })}

              {/* Binding */}
              <div
                style={{
                  width: "6px",
                  height: pvPageH,
                  flexShrink: 0,
                  background: "linear-gradient(to right, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.12) 40%, rgba(0,0,0,0.05) 70%, rgba(0,0,0,0.14) 100%)",
                  boxShadow: "inset 2px 0 8px rgba(0,0,0,0.18), inset -2px 0 8px rgba(0,0,0,0.10)",
                }}
              />

              {/* RIGHT visual page. Its inside edge (toward the binding)
                  is on its LEFT side. */}
              {renderBookPage({
                side: "right",
                pageNum: rightPageNum,
                html: rightHtml,
                isFirstPage: isRightFirst,
                pvPageW, pvPageH, pvScale,
                pageBg, pageColor, pageFont, pvFontSz,
                bookTitle, chapterTitle: title, ar, isRTL,
                renderPageContent,
              })}
            </div>

            {/* Navigation. Arrow ordering follows the UI language so
                the icons read naturally for the writer: LTR has Prev
                on the left and Next on the right; RTL flips them so
                an Arabic reader sees Prev on the right. */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexDirection: isRTL ? "row-reverse" : "row",
              }}
            >
              <button
                type="button"
                onClick={() => setCurrentSpread((s) => Math.max(0, s - 1))}
                disabled={currentSpread === 0}
                style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 14px", borderRadius: "100px", border: `1px solid ${currentSpread === 0 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.14)"}`, background: "transparent", color: currentSpread === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.55)", fontSize: "11px", cursor: currentSpread === 0 ? "not-allowed" : "pointer", transition: "all 0.2s", letterSpacing: "0.03em" }}
              >
                {isRTL ? <ChevronRight style={{ width: "12px", height: "12px" }} /> : <ChevronLeft style={{ width: "12px", height: "12px" }} />}
                {ar ? "السابق" : "Prev"}
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                {Array.from({ length: maxSpread + 1 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentSpread(i)}
                    aria-label={`${ar ? "صفحة" : "Spread"} ${i + 1}`}
                    style={{ width: i === currentSpread ? "16px" : "5px", height: "5px", borderRadius: "100px", background: i === currentSpread ? "hsl(var(--primary))" : "rgba(255,255,255,0.18)", border: "none", cursor: "pointer", transition: "all 0.25s ease", padding: 0 }}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCurrentSpread((s) => Math.min(maxSpread, s + 1))}
                disabled={currentSpread >= maxSpread}
                style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 14px", borderRadius: "100px", border: `1px solid ${currentSpread >= maxSpread ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.14)"}`, background: "transparent", color: currentSpread >= maxSpread ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.55)", fontSize: "11px", cursor: currentSpread >= maxSpread ? "not-allowed" : "pointer", transition: "all 0.2s", letterSpacing: "0.03em" }}
              >
                {ar ? "التالي" : "Next"}
                {isRTL ? <ChevronLeft style={{ width: "12px", height: "12px" }} /> : <ChevronRight style={{ width: "12px", height: "12px" }} />}
              </button>

              <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.12)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "system-ui", marginLeft: "4px" }}>
                ← →  ·  Esc
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── One physical page on the spread ────────────────────────────────────
// The two pages of a spread are almost identical visually, except:
//   - the inside edge (toward the binding) carries the heavier inset
//     shadow + slightly more padding, just like ink wells in a real
//     book gutter
//   - the running header has the book title on the OUTER side and the
//     chapter title on the OUTER side of the OPPOSITE page
//   - the page numbers count outward from the binding
// All three of these flip when the content direction is RTL. We
// compute the "inside vs outside" once, here, instead of duplicating
// styles per (side, dir) combination.
function renderBookPage(args: {
  side: "left" | "right";
  pageNum: number;
  html: string | undefined;
  isFirstPage: boolean;
  pvPageW: number;
  pvPageH: number;
  pvScale: number;
  pageBg: string;
  pageColor: string;
  pageFont: string;
  pvFontSz: number;
  bookTitle: string;
  chapterTitle: string;
  ar: boolean;
  isRTL: boolean;
  renderPageContent: (html: string, isFirstPage: boolean) => React.ReactNode;
}) {
  const {
    side, pageNum, html, isFirstPage,
    pvPageW, pvPageH, pvScale,
    pageBg, pageColor, pageFont, pvFontSz,
    bookTitle, chapterTitle, ar, isRTL,
    renderPageContent,
  } = args;

  // No content for this side (odd total page count). Render a clean
  // half-spread placeholder so the spread still looks like a book.
  if (html === undefined) {
    return (
      <div
        style={{
          width: pvPageW,
          height: pvPageH,
          flexShrink: 0,
          background: pageBg,
          boxShadow:
            side === "left"
              ? "inset -18px 0 36px rgba(0,0,0,0.03)"
              : "inset 18px 0 36px rgba(0,0,0,0.03)",
          opacity: 0.6,
          boxSizing: "border-box",
        }}
      />
    );
  }

  // Inside edge = the side that hugs the binding. For the visually
  // left page, the inside is on its right; for the right page, on its
  // left. The binding shadow is always on the inside edge.
  const insideShadow =
    side === "left"
      ? "inset -18px 0 36px rgba(0,0,0,0.10), inset -2px 0 8px rgba(0,0,0,0.06)"
      : "inset 18px 0 36px rgba(0,0,0,0.05)";

  // Slightly more padding on the binding side, less on the outer edge,
  // matching how trim and gutter work in a printed novel.
  const padOutsideX = Math.round(pvPageW * 0.09);
  const padInsideX  = Math.round(pvPageW * 0.10);
  const padTopY     = Math.round(pvPageH * 0.075);
  const padBotY     = Math.round(pvPageH * 0.07);
  const paddingTRBL =
    side === "left"
      ? `${padTopY}px ${padInsideX}px ${padBotY}px ${padOutsideX}px`
      : `${padTopY}px ${padOutsideX}px ${padBotY}px ${padInsideX}px`;

  // Running header. In LTR books the book title lives on the verso
  // (left), the chapter title lives on the recto (right). In RTL the
  // recto is the right page so book/chapter swap which side they sit
  // on.
  const headerBookSide = isRTL ? "right" : "left";
  const showBookTitle =
    (side === "left"  && headerBookSide === "left") ||
    (side === "right" && headerBookSide === "right");
  const headerText = showBookTitle
    ? bookTitle
    : (chapterTitle || (ar ? "فصل" : "Chapter"));
  const headerOrnamentSide = showBookTitle ? "outside" : "inside";

  return (
    <div
      className={isFirstPage ? "pv-page-first" : "pv-page"}
      style={{
        width: pvPageW,
        height: pvPageH,
        flexShrink: 0,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        background: pageBg,
        padding: paddingTRBL,
        boxShadow: insideShadow,
        boxSizing: "border-box",
      }}
    >
      {/* Running header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexDirection:
            (side === "left" && headerOrnamentSide === "outside") ||
            (side === "right" && headerOrnamentSide === "inside")
              ? "row"
              : "row-reverse",
          borderBottom: "0.5px solid rgba(0,0,0,0.10)",
          paddingBottom: `${Math.round(5 * pvScale)}px`,
          marginBottom: `${Math.round(pvPageH * 0.055)}px`,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: `${Math.round(7 * pvScale)}px`, letterSpacing: "0.32em", textTransform: "uppercase", color: "rgba(0,0,0,0.20)", fontFamily: "system-ui" }}>
          {headerText || ""}
        </span>
        <span style={{ fontSize: `${Math.round(7 * pvScale)}px`, color: "rgba(0,0,0,0.15)", fontFamily: "system-ui" }}>&#10087;</span>
      </div>

      {/* Body. dir attribute lets the writer's mixed-language quotes
          render with correct neutral-character handling without
          fighting the document's overall direction. */}
      <div
        dir={isRTL ? "rtl" : "ltr"}
        style={{ fontFamily: pageFont, fontSize: `${pvFontSz}px`, color: pageColor, flex: 1, overflow: "hidden" }}
      >
        {renderPageContent(html, isFirstPage)}
      </div>

      {/* Footer: page number */}
      <div style={{ flexShrink: 0, marginTop: `${Math.round(pvPageH * 0.025)}px`, borderTop: "0.5px solid rgba(0,0,0,0.08)", paddingTop: `${Math.round(5 * pvScale)}px`, display: "flex", justifyContent: "center" }}>
        <span style={{ fontSize: `${Math.round(9 * pvScale)}px`, color: "rgba(0,0,0,0.22)", fontFamily: pageFont, letterSpacing: "0.15em" }}>
          — {pageNum} —
        </span>
      </div>
    </div>
  );
}
