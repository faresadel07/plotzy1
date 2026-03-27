import { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from "react";
import { useRoute, Link } from "wouter";
import { useLanguage } from "@/contexts/language-context";
import {
  ArrowLeft, BookOpen, Loader2, Sun, Moon, Minus, Plus,
  List, X, Download, Settings, ChevronLeft, ChevronRight,
  AlignJustify,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const LS_POS = (id: number) => `plotzy_rpos_${id}`;
const LS_RECENT = "plotzy_recently_read";

interface BookMeta {
  id: number;
  title: string;
  authors: { name: string }[];
  coverUrl: string | null;
}

interface RecentBook {
  id: number;
  title: string;
  author: string;
  coverUrl: string | null;
  page: number;
  ts: number;
}

function formatAuthor(a: { name: string }): string {
  const parts = a.name.split(",").map(s => s.trim());
  return parts.length === 2 ? `${parts[1]} ${parts[0]}` : a.name;
}

function saveRecent(book: BookMeta, page: number) {
  try {
    const list: RecentBook[] = JSON.parse(localStorage.getItem(LS_RECENT) || "[]");
    const filtered = list.filter(b => b.id !== book.id);
    filtered.unshift({
      id: book.id,
      title: book.title,
      author: book.authors[0] ? formatAuthor(book.authors[0]) : "",
      coverUrl: book.coverUrl,
      page,
      ts: Date.now(),
    });
    localStorage.setItem(LS_RECENT, JSON.stringify(filtered.slice(0, 24)));
  } catch { /* noop */ }
}

function parseParagraphs(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return normalized
    .split(/\n{2,}/)
    .map(p => p.replace(/\n/g, " ").trim())
    .filter(p => p.length > 12 && !p.startsWith("[Illustration"));
}

function wordCount(s: string) {
  return s.split(/\s+/).filter(Boolean).length;
}

function buildPages(paragraphs: string[], wpp: number): string[][] {
  const pages: string[][] = [];
  let current: string[] = [];
  let count = 0;
  for (const para of paragraphs) {
    const wc = wordCount(para);
    if (count > 0 && count + wc > wpp) {
      pages.push(current);
      current = [para];
      count = wc;
    } else {
      current.push(para);
      count += wc;
    }
  }
  if (current.length) pages.push(current);
  return pages.length ? pages : [[""]];
}

function detectChapters(paras: string[]): { title: string; paraIdx: number }[] {
  const re = /^(chapter\s+[ivxlcdm\d]+[\.\:]?.*|part\s+[ivxlcdm\d]+[\.\:]?.*|book\s+[ivxlcdm\d]+[\.\:]?.*)$/i;
  const chapters: { title: string; paraIdx: number }[] = [];
  for (let i = 0; i < paras.length; i++) {
    if (re.test(paras[i].trim()) && paras[i].trim().length < 80) {
      chapters.push({ title: paras[i].trim(), paraIdx: i });
    }
  }
  return chapters;
}

function findPageForPara(pages: string[][], paraIdx: number): number {
  let total = 0;
  for (let p = 0; p < pages.length; p++) {
    total += pages[p].length;
    if (total > paraIdx) return p;
  }
  return 0;
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Estimate words per page given page pixel dimensions and font settings */
function estimateWpp(
  pageW: number, pageH: number,
  fSize: number, lHeight: number,
  twoPage: boolean,
): number {
  const padH = twoPage ? 72 : 96;   // left+right padding (px)
  const padV = 90;                   // top + footer (px)
  const textW = Math.max(1, pageW - padH);
  const textH = Math.max(1, pageH - padV);
  // Georgia at 16px: ~0.52 em per char average
  const charsPerLine = Math.floor(textW / (fSize * 0.50));
  const wordsPerLine = Math.max(1, charsPerLine / 5.2);
  const lineHeightPx = fSize * lHeight;
  const linesPerPage = Math.max(4, Math.floor(textH / lineHeightPx));
  // Apply a safety factor so we never overflow the card
  return Math.max(60, Math.floor(wordsPerLine * linesPerPage * 0.88));
}

export default function GutenbergReader() {
  const [, params] = useRoute("/discover/:id");
  const gutId = params?.id ? parseInt(params.id) : 0;
  const { lang } = useLanguage();
  const ar = lang === "ar";

  const [meta, setMeta] = useState<BookMeta | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingContent, setLoadingContent] = useState(true);
  const [error, setError] = useState("");

  // Reading settings
  const [dark, setDark] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [lineHeight, setLineHeight] = useState(1.82);
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);

  // Spread-based pagination
  const [spreadIdx, setSpreadIdx] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible] = useState(true);

  // Layout measurements
  const readingRef = useRef<HTMLDivElement>(null);
  const [readingSize, setReadingSize] = useState({ w: 900, h: 600 });
  const [twoPage, setTwoPage] = useState(true);

  useLayoutEffect(() => {
    const el = readingRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setReadingSize({ w: width, h: height });
      setTwoPage(width >= 700);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ── Compute portrait page dimensions (like a real book) ──────────────────
  // A real book: width ≈ 2/3 of height (portrait)
  const PAGE_H = Math.max(380, readingSize.h - 20);
  const PAGE_W_IDEAL = Math.round(PAGE_H * (5 / 7.5)); // ~6×9 inch book ratio
  const maxSpreadW = readingSize.w - 80; // leave room for nav arrows
  const PAGE_W = twoPage
    ? Math.min(PAGE_W_IDEAL, Math.floor((maxSpreadW - 8) / 2)) // 8 = spine
    : Math.min(560, maxSpreadW);
  const SPINE_W = twoPage ? 8 : 0;

  // ── Dynamic words-per-page ────────────────────────────────────────────────
  const wordsPerPage = useMemo(
    () => estimateWpp(PAGE_W, PAGE_H, fontSize, lineHeight, twoPage),
    [PAGE_W, PAGE_H, fontSize, lineHeight, twoPage],
  );

  // ── Derived data ──────────────────────────────────────────────────────────
  const paragraphs = useMemo(() => rawText ? parseParagraphs(rawText) : [], [rawText]);
  const pages = useMemo(() => buildPages(paragraphs, wordsPerPage), [paragraphs, wordsPerPage]);
  const chapters = useMemo(() => detectChapters(paragraphs), [paragraphs]);

  const totalPages = pages.length;
  const totalSpreads = twoPage ? Math.ceil(totalPages / 2) : totalPages;
  const clampedSpread = Math.min(spreadIdx, Math.max(0, totalSpreads - 1));

  const leftPageIdx = twoPage ? clampedSpread * 2 : clampedSpread;
  const rightPageIdx = twoPage ? clampedSpread * 2 + 1 : -1;
  const leftParas = pages[leftPageIdx] || [];
  const rightParas = (twoPage && rightPageIdx < totalPages) ? (pages[rightPageIdx] || null) : null;

  // ── Colours ───────────────────────────────────────────────────────────────
  const bg = dark ? "#07060d" : "#b8b3aa";
  const pageBg = dark ? "#16141f" : "#fdf9f2";
  const fg = dark ? "rgba(230,220,200,0.93)" : "#1c1610";
  const fgMuted = dark ? "rgba(230,220,200,0.35)" : "rgba(28,22,16,0.42)";
  const barBg = dark ? "rgba(7,6,13,0.97)" : "rgba(184,179,170,0.97)";
  const border = dark ? "rgba(255,255,255,0.11)" : "rgba(0,0,0,0.13)";
  const accent = dark ? "rgba(218,178,106,0.95)" : "rgba(140,100,40,0.9)";
  const spineBg = dark
    ? "linear-gradient(to right,rgba(0,0,0,0.55)0%,rgba(0,0,0,0.12)40%,rgba(0,0,0,0.12)60%,rgba(0,0,0,0.55)100%)"
    : "linear-gradient(to right,rgba(0,0,0,0.28)0%,rgba(0,0,0,0.06)40%,rgba(0,0,0,0.06)60%,rgba(0,0,0,0.28)100%)";

  // ── Load metadata ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gutId) return;
    fetch(`${BASE}/api/gutenberg/books/${gutId}`)
      .then(r => r.json())
      .then(d => setMeta(d))
      .catch(() => setError("Failed to load book info"))
      .finally(() => setLoadingMeta(false));
  }, [gutId]);

  // ── Load content ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gutId) return;
    setLoadingContent(true);
    fetch(`${BASE}/api/gutenberg/books/${gutId}/content`)
      .then(r => { if (!r.ok) throw new Error("no text"); return r.json(); })
      .then(d => setRawText(d.content))
      .catch(() => setError("This book's text is not available."))
      .finally(() => setLoadingContent(false));
  }, [gutId]);

  // ── Restore saved position ────────────────────────────────────────────────
  useEffect(() => {
    if (!gutId || !pages.length) return;
    try {
      const saved = localStorage.getItem(LS_POS(gutId));
      if (saved) {
        const p = parseInt(saved);
        if (!isNaN(p) && p >= 0) {
          setSpreadIdx(twoPage ? Math.floor(p / 2) : p);
        }
      }
    } catch { /* noop */ }
  }, [gutId, pages.length]);

  // ── Persist position ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!gutId || !pages.length) return;
    try { localStorage.setItem(LS_POS(gutId), String(leftPageIdx)); } catch { /* noop */ }
    if (meta) saveRecent(meta, leftPageIdx);
  }, [gutId, leftPageIdx, pages.length, meta]);

  // ── Spread navigation ─────────────────────────────────────────────────────
  const goToSpread = useCallback((next: number, dir: "forward" | "backward") => {
    if (animating || next < 0 || next >= totalSpreads) return;
    setDirection(dir);
    setAnimating(true);
    setVisible(false);
    setTimeout(() => {
      setSpreadIdx(next);
      setVisible(true);
      setTimeout(() => setAnimating(false), 280);
    }, 180);
  }, [animating, totalSpreads]);

  const nextSpread = useCallback(() => goToSpread(clampedSpread + 1, "forward"), [goToSpread, clampedSpread]);
  const prevSpread = useCallback(() => goToSpread(clampedSpread - 1, "backward"), [goToSpread, clampedSpread]);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showToc || showSettings) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); nextSpread(); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); prevSpread(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showToc, showSettings, nextSpread, prevSpread]);

  // ── Touch / swipe ─────────────────────────────────────────────────────────
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) { dx < 0 ? nextSpread() : prevSpread(); }
  };

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = () => {
    if (!rawText || !meta) return;
    downloadText(rawText, meta.title.replace(/[^a-z0-9]/gi, "_").slice(0, 60) + ".txt");
  };

  // ── Title / Author ────────────────────────────────────────────────────────
  const title = meta?.title || (loadingMeta ? "" : "Unknown Book");
  const author = meta?.authors[0] ? formatAuthor(meta.authors[0]) : "";

  // ── Chapter name for current spread ──────────────────────────────────────
  const currentChapterName = useMemo(() => {
    if (!chapters.length || !pages.length) return "";
    let parasSoFar = 0;
    for (let p = 0; p <= leftPageIdx; p++) parasSoFar += pages[p]?.length || 0;
    let name = "";
    for (const ch of chapters) { if (ch.paraIdx < parasSoFar) name = ch.title; }
    return name;
  }, [chapters, leftPageIdx, pages]);

  const progress = totalPages > 1 ? (leftPageIdx / (totalPages - 1)) * 100 : 100;
  const slideFrom = direction === "forward" ? "24px" : "-24px";

  // ── Page label ────────────────────────────────────────────────────────────
  const pageLabel = twoPage && rightPageIdx < totalPages
    ? `${leftPageIdx + 1}–${rightPageIdx + 1} / ${totalPages}`
    : `${leftPageIdx + 1} / ${totalPages}`;

  // ── Page card inner padding ───────────────────────────────────────────────
  const pagePad = twoPage ? "32px 32px 0 36px" : "40px 48px 0 48px";
  const pageRPad = twoPage ? "32px 36px 0 32px" : pagePad;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loadingMeta || loadingContent) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-5" style={{ background: dark ? "#07060d" : "#b8b3aa" }}>
        <div className="relative">
          <BookOpen className="w-12 h-12" style={{ color: "rgba(140,100,40,0.4)" }} />
          <Loader2 className="w-5 h-5 animate-spin absolute -bottom-1 -right-1" style={{ color: "rgba(218,178,106,0.9)" }} />
        </div>
        <div className="text-center">
          <p className="font-semibold text-base mb-1" style={{ color: "#1c1610" }}>{title || "Loading…"}</p>
          <p className="text-sm" style={{ color: "rgba(28,22,16,0.45)" }}>
            {loadingContent ? (ar ? "جارٍ تحميل النص…" : "Fetching text…") : (ar ? "جارٍ التحميل…" : "Loading…")}
          </p>
        </div>
      </div>
    );
  }

  if (error && !rawText) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4" style={{ background: dark ? "#07060d" : "#b8b3aa" }}>
        <BookOpen className="w-12 h-12" style={{ color: "rgba(28,22,16,0.3)" }} />
        <p className="text-base text-center max-w-sm px-6" style={{ color: "#1c1610" }}>{error}</p>
        <Link href="/discover">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium"
            style={{ background: "rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.15)", color: "#1c1610" }}>
            <ArrowLeft className="w-4 h-4" /> Back to Library
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex flex-col select-none"
      style={{ background: bg }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ══ TOP BAR ══════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0 z-40"
        style={{ background: barBg, borderBottom: `1px solid ${border}`, backdropFilter: "blur(16px)" }}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link href="/discover">
            <button className="flex items-center gap-1.5 shrink-0 rounded-xl px-2 py-1.5 transition-all hover:opacity-70"
              style={{ color: fgMuted }}>
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs hidden sm:block">{ar ? "المكتبة" : "Library"}</span>
            </button>
          </Link>
          <div className="w-px h-4 shrink-0" style={{ background: border }} />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate leading-tight" style={{ color: fg, maxWidth: 260 }}>{title}</p>
            {currentChapterName && (
              <p className="text-xs truncate leading-tight mt-0.5" style={{ color: fgMuted }}>{currentChapterName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <IconBtn onClick={handleDownload} title="Download" color={fgMuted}><Download className="w-4 h-4" /></IconBtn>
          {chapters.length > 0 && (
            <IconBtn onClick={() => setShowToc(v => !v)} title="Contents" color={fgMuted}><List className="w-4 h-4" /></IconBtn>
          )}
          <IconBtn onClick={() => setShowSettings(v => !v)} title="Settings" color={fgMuted}><Settings className="w-4 h-4" /></IconBtn>
          <IconBtn onClick={() => setDark(d => !d)} title={dark ? "Light" : "Dark"} color={fgMuted}>
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </IconBtn>
        </div>
      </div>

      {/* ══ PROGRESS BAR ═════════════════════════════════════════════════════ */}
      <div className="h-[2px] shrink-0" style={{ background: border }}>
        <div className="h-full transition-all duration-300 ease-out" style={{ width: `${progress}%`, background: accent }} />
      </div>

      {/* ══ READING AREA ═════════════════════════════════════════════════════ */}
      <div
        ref={readingRef}
        className="flex-1 overflow-hidden relative flex items-center justify-center"
      >
        {/* Left arrow */}
        <button
          onClick={prevSpread}
          disabled={clampedSpread === 0}
          className="absolute left-2 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-0 hover:opacity-80"
          style={{ background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.10)", color: fg }}
          aria-label="Previous"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* ── Book spread ── */}
        <div
          style={{
            display: "flex",
            width: PAGE_W * (twoPage ? 2 : 1) + SPINE_W,
            height: PAGE_H,
            transition: "opacity 180ms ease, transform 180ms ease",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateX(0)" : `translateX(${slideFrom})`,
            boxShadow: "0 8px 48px rgba(0,0,0,0.35)",
            borderRadius: 14,
          }}
        >
          {/* Left page */}
          <div
            style={{
              width: PAGE_W,
              height: PAGE_H,
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              background: pageBg,
              border: `1px solid ${border}`,
              borderRight: twoPage ? "none" : undefined,
              borderRadius: twoPage ? "14px 0 0 14px" : "14px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                flex: 1,
                padding: pagePad,
                fontFamily: "'Georgia','Times New Roman',serif",
                fontSize,
                lineHeight,
                color: fg,
                overflow: "hidden",
              }}
            >
              {leftParas.map((para, i) => (
                <p key={i} style={{ marginBottom: "0.78em", textAlign: "justify", textIndent: "1.5em", hyphens: "auto" } as React.CSSProperties}>
                  {para}
                </p>
              ))}
            </div>
            {/* Footer */}
            <div style={{ padding: "8px 28px", borderTop: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: fgMuted, fontFamily: "Georgia,serif" }}>{author}</span>
              <span style={{ fontSize: 11, color: fgMuted }}>{leftPageIdx + 1}</span>
            </div>
          </div>

          {/* Spine */}
          {twoPage && (
            <div style={{ width: SPINE_W, flexShrink: 0, alignSelf: "stretch", background: spineBg }} />
          )}

          {/* Right page */}
          {twoPage && (
            rightParas ? (
              <div
                style={{
                  width: PAGE_W,
                  height: PAGE_H,
                  display: "flex",
                  flexDirection: "column",
                  flexShrink: 0,
                  background: pageBg,
                  border: `1px solid ${border}`,
                  borderLeft: "none",
                  borderRadius: "0 14px 14px 0",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    padding: pageRPad,
                    fontFamily: "'Georgia','Times New Roman',serif",
                    fontSize,
                    lineHeight,
                    color: fg,
                    overflow: "hidden",
                  }}
                >
                  {rightParas.map((para, i) => (
                    <p key={i} style={{ marginBottom: "0.78em", textAlign: "justify", textIndent: "1.5em", hyphens: "auto" } as React.CSSProperties}>
                      {para}
                    </p>
                  ))}
                </div>
                <div style={{ padding: "8px 28px", borderTop: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: fgMuted, fontFamily: "Georgia,serif", maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {title}
                  </span>
                  <span style={{ fontSize: 11, color: fgMuted }}>{rightPageIdx + 1}</span>
                </div>
              </div>
            ) : (
              /* Blank right page (last odd page) */
              <div
                style={{
                  width: PAGE_W,
                  height: PAGE_H,
                  flexShrink: 0,
                  background: dark ? "rgba(18,16,26,0.7)" : "rgba(240,236,228,0.7)",
                  border: `1px solid ${border}`,
                  borderLeft: "none",
                  borderRadius: "0 14px 14px 0",
                }}
              />
            )
          )}
        </div>

        {/* Right arrow */}
        <button
          onClick={nextSpread}
          disabled={clampedSpread >= totalSpreads - 1}
          className="absolute right-2 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-0 hover:opacity-80"
          style={{ background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.10)", color: fg }}
          aria-label="Next"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ══ BOTTOM NAV BAR ═══════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ background: barBg, borderTop: `1px solid ${border}` }}>
        <button
          onClick={prevSpread}
          disabled={clampedSpread === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-25"
          style={{ color: fg, background: clampedSpread > 0 ? "rgba(128,128,128,0.12)" : "transparent" }}
        >
          <ChevronLeft className="w-4 h-4" />
          {ar ? "السابق" : "Previous"}
        </button>

        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xs font-mono" style={{ color: fgMuted }}>{pageLabel}</span>
          <span className="text-xs" style={{ color: fgMuted }}>
            {Math.round(progress)}% {ar ? "مكتمل" : "complete"}
          </span>
        </div>

        <button
          onClick={nextSpread}
          disabled={clampedSpread >= totalSpreads - 1}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-25"
          style={{ color: fg, background: clampedSpread < totalSpreads - 1 ? "rgba(128,128,128,0.12)" : "transparent" }}
        >
          {ar ? "التالي" : "Next"}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ══ TOC DRAWER ═══════════════════════════════════════════════════════ */}
      {showToc && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setShowToc(false)} />
          <div className="relative ml-auto w-80 h-full flex flex-col"
            style={{ background: dark ? "#0f0e0d" : "#faf8f4", borderLeft: `1px solid ${border}` }}>
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: `1px solid ${border}` }}>
              <span className="font-semibold" style={{ color: fg }}>{ar ? "الفهرس" : "Table of Contents"}</span>
              <button onClick={() => setShowToc(false)} style={{ color: fgMuted }}><X className="w-4 h-4" /></button>
            </div>
            <div className="overflow-y-auto flex-1 py-3">
              {chapters.map((ch, i) => {
                const chPage = findPageForPara(pages, ch.paraIdx);
                const chSpread = twoPage ? Math.floor(chPage / 2) : chPage;
                const active = chSpread === clampedSpread;
                return (
                  <button key={i}
                    onClick={() => { goToSpread(chSpread, chSpread > clampedSpread ? "forward" : "backward"); setShowToc(false); }}
                    className="w-full text-left px-6 py-3 text-sm transition-all flex items-start gap-3"
                    style={{
                      color: active ? accent : fgMuted,
                      background: active ? (dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)") : "transparent",
                      fontWeight: active ? 600 : 400,
                    }}>
                    <span className="text-xs mt-0.5 opacity-50 shrink-0">{chPage + 1}</span>
                    <span className="leading-tight">{ch.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ SETTINGS PANEL ═══════════════════════════════════════════════════ */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)" }} onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 z-10"
            style={{ background: dark ? "#1a1917" : "#faf8f4", border: `1px solid ${border}` }}>
            <div className="flex items-center justify-between mb-6">
              <span className="font-semibold" style={{ color: fg }}>{ar ? "إعدادات القراءة" : "Reading Settings"}</span>
              <button onClick={() => setShowSettings(false)} style={{ color: fgMuted }}><X className="w-4 h-4" /></button>
            </div>
            <SettingRow label={ar ? "حجم الخط" : "Font Size"} icon={<span className="text-xs font-mono" style={{ color: fgMuted }}>Aa</span>}>
              <div className="flex items-center gap-3">
                <StepBtn onClick={() => setFontSize(f => Math.max(12, f - 1))} color={fgMuted}><Minus className="w-3.5 h-3.5" /></StepBtn>
                <span className="text-sm w-7 text-center font-mono" style={{ color: fg }}>{fontSize}</span>
                <StepBtn onClick={() => setFontSize(f => Math.min(24, f + 1))} color={fgMuted}><Plus className="w-3.5 h-3.5" /></StepBtn>
              </div>
            </SettingRow>
            <SettingRow label={ar ? "تباعد الأسطر" : "Line Spacing"} icon={<AlignJustify className="w-4 h-4" style={{ color: fgMuted }} />}>
              <div className="flex items-center gap-3">
                <StepBtn onClick={() => setLineHeight(l => Math.max(1.3, parseFloat((l - 0.1).toFixed(1))))} color={fgMuted}><Minus className="w-3.5 h-3.5" /></StepBtn>
                <span className="text-sm w-8 text-center font-mono" style={{ color: fg }}>{lineHeight.toFixed(1)}</span>
                <StepBtn onClick={() => setLineHeight(l => Math.min(2.5, parseFloat((l + 0.1).toFixed(1))))} color={fgMuted}><Plus className="w-3.5 h-3.5" /></StepBtn>
              </div>
            </SettingRow>
            <button
              onClick={() => { handleDownload(); setShowSettings(false); }}
              className="w-full flex items-center gap-3 py-3.5 px-4 rounded-2xl mt-2 text-sm font-medium"
              style={{ background: "rgba(128,128,128,0.10)", border: `1px solid ${border}`, color: fg }}
            >
              <Download className="w-4 h-4" style={{ color: accent }} />
              {ar ? "تحميل كملف نصي (.txt)" : "Download as plain text (.txt)"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, onClick, title, color }: {
  children: React.ReactNode; onClick: () => void; title?: string; color: string;
}) {
  return (
    <button onClick={onClick} title={title}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-60"
      style={{ color }}>
      {children}
    </button>
  );
}

function StepBtn({ children, onClick, color }: { children: React.ReactNode; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-60"
      style={{ color, background: "rgba(128,128,128,0.10)", border: `1px solid rgba(128,128,128,0.2)` }}>
      {children}
    </button>
  );
}

function SettingRow({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3.5" style={{ borderBottom: "1px solid rgba(128,128,128,0.15)" }}>
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-sm" style={{ color: "rgba(100,90,70,0.85)" }}>{label}</span>
      </div>
      {children}
    </div>
  );
}
