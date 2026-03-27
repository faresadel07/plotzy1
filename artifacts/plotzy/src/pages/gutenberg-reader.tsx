import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRoute, Link } from "wouter";
import { useLanguage } from "@/contexts/language-context";
import {
  ArrowLeft, BookOpen, Loader2, Sun, Moon, Minus, Plus,
  List, X, Download, Settings, ChevronLeft, ChevronRight,
  AlignJustify,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const WORDS_PER_PAGE = 220;
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
    const entry: RecentBook = {
      id: book.id,
      title: book.title,
      author: book.authors[0] ? formatAuthor(book.authors[0]) : "",
      coverUrl: book.coverUrl,
      page,
      ts: Date.now(),
    };
    filtered.unshift(entry);
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

function buildPages(paragraphs: string[]): string[][] {
  const pages: string[][] = [];
  let current: string[] = [];
  let count = 0;
  for (const para of paragraphs) {
    const wc = wordCount(para);
    if (count > 0 && count + wc > WORDS_PER_PAGE) {
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

  // Spread-based pagination (one spread = two pages side by side)
  const [spreadIdx, setSpreadIdx] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible] = useState(true);

  // Detect if we can show two pages (wide enough screen)
  const [twoPage, setTwoPage] = useState(true);
  useEffect(() => {
    const check = () => setTwoPage(window.innerWidth >= 760);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Derived data ──────────────────────────────────────────────────────────
  const paragraphs = useMemo(() => rawText ? parseParagraphs(rawText) : [], [rawText]);
  const pages = useMemo(() => buildPages(paragraphs), [paragraphs]);
  const chapters = useMemo(() => detectChapters(paragraphs), [paragraphs]);

  const totalPages = pages.length;
  // In two-page mode, we navigate by spreads; in single-page mode by single pages
  const totalSpreads = twoPage ? Math.ceil(totalPages / 2) : totalPages;
  const clampedSpread = Math.min(spreadIdx, Math.max(0, totalSpreads - 1));

  // Compute actual page indices for left (and right) page
  const leftPageIdx = twoPage ? clampedSpread * 2 : clampedSpread;
  const rightPageIdx = twoPage ? clampedSpread * 2 + 1 : -1;
  const leftParas = pages[leftPageIdx] || [];
  const rightParas = (twoPage && rightPageIdx < totalPages) ? (pages[rightPageIdx] || null) : null;

  // ── Colours ───────────────────────────────────────────────────────────────
  const bg = dark ? "#07060d" : "#cac5bb";
  const pageBg = dark ? "#16141f" : "#fdf9f2";
  const fg = dark ? "rgba(230,220,200,0.93)" : "#1c1610";
  const fgMuted = dark ? "rgba(230,220,200,0.35)" : "rgba(28,22,16,0.42)";
  const barBg = dark ? "rgba(7,6,13,0.97)" : "rgba(202,197,187,0.97)";
  const border = dark ? "rgba(255,255,255,0.11)" : "rgba(0,0,0,0.11)";
  const accent = dark ? "rgba(218,178,106,0.95)" : "rgba(140,100,40,0.9)";
  const spineBg = dark
    ? "linear-gradient(to right, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.10) 35%, rgba(0,0,0,0.10) 65%, rgba(0,0,0,0.40) 100%)"
    : "linear-gradient(to right, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.05) 65%, rgba(0,0,0,0.22) 100%)";

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
          // Convert saved page number to spread index
          setSpreadIdx(twoPage ? Math.floor(p / 2) : p);
        }
      }
    } catch { /* noop */ }
  }, [gutId, pages.length]);

  // ── Persist position + recently read ─────────────────────────────────────
  useEffect(() => {
    if (!gutId || !pages.length) return;
    try { localStorage.setItem(LS_POS(gutId), String(leftPageIdx)); } catch { /* noop */ }
    if (meta) saveRecent(meta, leftPageIdx);
  }, [gutId, leftPageIdx, pages.length, meta]);

  // ── Spread flip animation ─────────────────────────────────────────────────
  const goToSpread = useCallback((next: number, dir: "forward" | "backward") => {
    if (animating || next < 0 || next >= totalSpreads) return;
    setDirection(dir);
    setAnimating(true);
    setVisible(false);
    setTimeout(() => {
      setSpreadIdx(next);
      setVisible(true);
      setTimeout(() => setAnimating(false), 300);
    }, 200);
  }, [animating, totalSpreads]);

  const nextSpread = () => goToSpread(clampedSpread + 1, "forward");
  const prevSpread = () => goToSpread(clampedSpread - 1, "backward");

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showToc || showSettings) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); nextSpread(); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); prevSpread(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showToc, showSettings, clampedSpread, animating, totalSpreads]);

  // ── Touch/swipe ───────────────────────────────────────────────────────────
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) { dx < 0 ? nextSpread() : prevSpread(); }
  };

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = () => {
    if (!rawText || !meta) return;
    const filename = meta.title.replace(/[^a-z0-9]/gi, "_").slice(0, 60) + ".txt";
    downloadText(rawText, filename);
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
    for (const ch of chapters) {
      if (ch.paraIdx < parasSoFar) name = ch.title;
    }
    return name;
  }, [chapters, leftPageIdx, pages]);

  // ── Progress ─────────────────────────────────────────────────────────────
  const progress = totalPages > 1 ? (leftPageIdx / (totalPages - 1)) * 100 : 100;
  const slideFrom = direction === "forward" ? "28px" : "-28px";

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loadingMeta || loadingContent) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-5" style={{ background: bg }}>
        <div className="relative">
          <BookOpen className="w-12 h-12" style={{ color: fgMuted }} />
          <Loader2 className="w-5 h-5 animate-spin absolute -bottom-1 -right-1" style={{ color: accent }} />
        </div>
        <div className="text-center">
          <p className="font-semibold text-base mb-1" style={{ color: fg }}>{title || "Loading…"}</p>
          <p className="text-sm" style={{ color: fgMuted }}>
            {loadingContent ? (ar ? "جارٍ تحميل النص وحفظه…" : "Fetching and caching text…") : (ar ? "جارٍ التحميل…" : "Loading…")}
          </p>
        </div>
        <div className="w-48 h-1 rounded-full overflow-hidden" style={{ background: border }}>
          <div className="h-full rounded-full animate-pulse" style={{ background: accent, width: "60%" }} />
        </div>
      </div>
    );
  }

  if (error && !rawText) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4" style={{ background: bg }}>
        <BookOpen className="w-12 h-12" style={{ color: fgMuted }} />
        <p className="text-base text-center max-w-sm px-6" style={{ color: fg }}>{error}</p>
        <Link href="/discover">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all"
            style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${border}`, color: fg }}>
            <ArrowLeft className="w-4 h-4" /> Back to Library
          </button>
        </Link>
      </div>
    );
  }

  // ── Page counter display ──────────────────────────────────────────────────
  const pageLabel = twoPage && rightPageIdx < totalPages
    ? `${leftPageIdx + 1}–${rightPageIdx + 1} / ${totalPages}`
    : `${leftPageIdx + 1} / ${totalPages}`;

  return (
    <div
      ref={containerRef}
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
          <IconBtn onClick={handleDownload} title="Download .txt" color={fgMuted}><Download className="w-4 h-4" /></IconBtn>
          {chapters.length > 0 && (
            <IconBtn onClick={() => setShowToc(v => !v)} title="Contents" color={fgMuted}><List className="w-4 h-4" /></IconBtn>
          )}
          <IconBtn onClick={() => setShowSettings(v => !v)} title="Settings" color={fgMuted}><Settings className="w-4 h-4" /></IconBtn>
          <IconBtn onClick={() => setDark(d => !d)} title={dark ? "Light mode" : "Dark mode"} color={fgMuted}>
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </IconBtn>
        </div>
      </div>

      {/* ══ PROGRESS BAR ═════════════════════════════════════════════════════ */}
      <div className="h-[2px] shrink-0" style={{ background: border }}>
        <div className="h-full transition-all duration-300 ease-out" style={{ width: `${progress}%`, background: accent }} />
      </div>

      {/* ══ READING AREA ═════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-hidden relative flex flex-col items-center px-10 py-4">

        {/* Left click zone */}
        <div className="absolute left-0 top-0 bottom-0 w-12 z-20 cursor-pointer flex items-center justify-center"
          onClick={prevSpread}>
          {clampedSpread > 0 && (
            <ChevronLeft className="w-5 h-5 opacity-20 hover:opacity-60 transition-opacity" style={{ color: fg }} />
          )}
        </div>

        {/* Book spread */}
        <div
          className="flex-1 w-full self-stretch flex"
          style={{
            maxWidth: twoPage ? 1040 : 700,
            transition: "opacity 200ms ease, transform 200ms ease",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateX(0)" : `translateX(${slideFrom})`,
          }}
        >
          {/* ── Left page ── */}
          <div className="flex-1 flex flex-col overflow-hidden"
            style={{
              background: pageBg,
              border: `1px solid ${border}`,
              borderRight: twoPage ? "none" : undefined,
              borderRadius: twoPage ? "14px 0 0 14px" : "14px",
              boxShadow: twoPage
                ? "4px 0 12px rgba(0,0,0,0.18), -4px 4px 18px rgba(0,0,0,0.12)"
                : "-4px 4px 24px rgba(0,0,0,0.15), 4px 4px 24px rgba(0,0,0,0.10)",
            }}>
            <div
              className="flex-1 overflow-hidden flex flex-col justify-start"
              style={{
                padding: twoPage ? "36px 36px 0 40px" : "40px 52px 0 52px",
                fontFamily: "'Georgia', 'Times New Roman', serif",
                fontSize,
                lineHeight,
                color: fg,
              }}
            >
              {leftParas.map((para, i) => (
                <p key={i} className="mb-[0.82em] last:mb-0 text-justify hyphens-auto" style={{ textIndent: "1.5em" }}>
                  {para}
                </p>
              ))}
            </div>
            <div className="px-8 py-2.5 flex items-center justify-between shrink-0"
              style={{ borderTop: `1px solid ${border}` }}>
              <span className="text-[11px]" style={{ color: fgMuted, fontFamily: "Georgia, serif" }}>{author}</span>
              <span className="text-[11px]" style={{ color: fgMuted }}>{leftPageIdx + 1}</span>
            </div>
          </div>

          {/* ── Spine ── */}
          {twoPage && (
            <div className="w-4 shrink-0 self-stretch" style={{ background: spineBg }} />
          )}

          {/* ── Right page ── */}
          {twoPage && (
            rightParas ? (
              <div className="flex-1 flex flex-col overflow-hidden"
                style={{
                  background: pageBg,
                  border: `1px solid ${border}`,
                  borderLeft: "none",
                  borderRadius: "0 14px 14px 0",
                  boxShadow: "4px 4px 18px rgba(0,0,0,0.12), -2px 0 8px rgba(0,0,0,0.10)",
                }}>
                <div
                  className="flex-1 overflow-hidden flex flex-col justify-start"
                  style={{
                    padding: "36px 40px 0 36px",
                    fontFamily: "'Georgia', 'Times New Roman', serif",
                    fontSize,
                    lineHeight,
                    color: fg,
                  }}
                >
                  {rightParas.map((para, i) => (
                    <p key={i} className="mb-[0.82em] last:mb-0 text-justify hyphens-auto" style={{ textIndent: "1.5em" }}>
                      {para}
                    </p>
                  ))}
                </div>
                <div className="px-8 py-2.5 flex items-center justify-between shrink-0"
                  style={{ borderTop: `1px solid ${border}` }}>
                  <span className="text-[11px] truncate max-w-[60%]" style={{ color: fgMuted, fontFamily: "Georgia, serif" }}>
                    {title.length > 36 ? title.slice(0, 36) + "…" : title}
                  </span>
                  <span className="text-[11px]" style={{ color: fgMuted }}>{rightPageIdx + 1}</span>
                </div>
              </div>
            ) : (
              /* Blank right page when on last odd page */
              <div className="flex-1 flex flex-col overflow-hidden"
                style={{
                  background: dark ? "rgba(22,20,31,0.45)" : "rgba(242,238,230,0.6)",
                  border: `1px solid ${border}`,
                  borderLeft: "none",
                  borderRadius: "0 14px 14px 0",
                }} />
            )
          )}
        </div>

        {/* Right click zone */}
        <div className="absolute right-0 top-0 bottom-0 w-12 z-20 cursor-pointer flex items-center justify-center"
          onClick={nextSpread}>
          {clampedSpread < totalSpreads - 1 && (
            <ChevronRight className="w-5 h-5 opacity-20 hover:opacity-60 transition-opacity" style={{ color: fg }} />
          )}
        </div>
      </div>

      {/* ══ BOTTOM NAV BAR ═══════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ background: barBg, borderTop: `1px solid ${border}` }}>

        <button
          onClick={prevSpread}
          disabled={clampedSpread === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-25"
          style={{ color: fg, background: clampedSpread > 0 ? "rgba(255,255,255,0.06)" : "transparent" }}
        >
          <ChevronLeft className="w-4 h-4" />
          {ar ? "السابق" : "Previous"}
        </button>

        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xs font-mono" style={{ color: fgMuted }}>
            {ar
              ? `${pageLabel.replace("–", "–").split("/").reverse().join(" من ")}`
              : pageLabel}
          </span>
          {totalPages > 0 && (
            <span className="text-xs" style={{ color: fgMuted }}>
              {Math.round(progress)}% {ar ? "مكتمل" : "complete"}
            </span>
          )}
        </div>

        <button
          onClick={nextSpread}
          disabled={clampedSpread >= totalSpreads - 1}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-25"
          style={{ color: fg, background: clampedSpread < totalSpreads - 1 ? "rgba(255,255,255,0.06)" : "transparent" }}
        >
          {ar ? "التالي" : "Next"}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ══ TOC DRAWER ═══════════════════════════════════════════════════════ */}
      {showToc && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setShowToc(false)} />
          <div className="relative ml-auto w-80 h-full flex flex-col" style={{ background: dark ? "#0f0e0d" : "#faf8f4", borderLeft: `1px solid ${border}` }}>
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
                    onClick={() => {
                      goToSpread(chSpread, chSpread > clampedSpread ? "forward" : "backward");
                      setShowToc(false);
                    }}
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
                <StepBtn onClick={() => setFontSize(f => Math.min(26, f + 1))} color={fgMuted}><Plus className="w-3.5 h-3.5" /></StepBtn>
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
              className="w-full flex items-center gap-3 py-3.5 px-4 rounded-2xl mt-2 text-sm font-medium transition-all"
              style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${border}`, color: fg }}
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

/* ── Small reusable sub-components ───────────────────────────────────────── */

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
      style={{ color, background: "rgba(255,255,255,0.06)", border: `1px solid ${color.replace(")", ",0.2)")}` }}>
      {children}
    </button>
  );
}

function SettingRow({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-sm" style={{ color: "rgba(240,232,218,0.7)" }}>{label}</span>
      </div>
      {children}
    </div>
  );
}
