import { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from "react";
import { useRoute, Link } from "wouter";
import { useLanguage } from "@/contexts/language-context";
import {
  ArrowLeft, BookOpen, Loader2, Sun, Moon, Minus, Plus,
  List, X, Download, Settings, ChevronLeft, ChevronRight,
  AlignJustify, Copy, Search, LayoutGrid, Bookmark, Type,
} from "lucide-react";
import { SEO } from "@/components/SEO";

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
  totalPages?: number;
  ts: number;
}

function formatAuthor(a: { name: string }): string {
  const parts = a.name.split(",").map(s => s.trim());
  return parts.length === 2 ? `${parts[1]} ${parts[0]}` : a.name;
}

function saveRecent(book: BookMeta, page: number, totalPages?: number) {
  try {
    const list: RecentBook[] = JSON.parse(localStorage.getItem(LS_RECENT) || "[]");
    const filtered = list.filter(b => b.id !== book.id);
    filtered.unshift({
      id: book.id,
      title: book.title,
      author: book.authors[0] ? formatAuthor(book.authors[0]) : "",
      coverUrl: book.coverUrl,
      page,
      totalPages,
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

/**
 * Measures actual paragraph heights in DOM and builds pages that never overflow.
 * Each page contains only whole paragraphs, so sentences are never cut mid-line.
 */
function useMeasuredPages(
  paragraphs: string[],
  pageW: number,
  pageH: number,
  fontSize: number,
  lineHeight: number,
  twoPage: boolean,
  fontFamily: string = "Georgia, serif",
): { pages: string[][]; measuring: boolean } {
  const [pages, setPages] = useState<string[][]>([[""]]);
  const [measuring, setMeasuring] = useState(false);
  const depsKey = `${paragraphs.length}|${pageW.toFixed(0)}|${pageH.toFixed(0)}|${fontSize}|${lineHeight}|${twoPage}|${fontFamily}`;
  const prevKey = useRef("");

  useEffect(() => {
    if (!paragraphs.length || pageW < 80 || pageH < 80) return;
    if (depsKey === prevKey.current) return;
    prevKey.current = depsKey;
    setMeasuring(true);

    requestAnimationFrame(() => {
      const padSide = twoPage ? 34 : 48;
      const padTop = twoPage ? 32 : 40;
      const padBottom = twoPage ? 20 : 24;
      const footerH = 34;
      const paraMarginPx = Math.round(fontSize * 0.78);
      const usableH = pageH - padTop - padBottom - footerH - 8;
      const textW = Math.max(80, pageW - padSide * 2);

      const container = document.createElement("div");
      container.style.cssText = [
        "position:fixed", "visibility:hidden", "pointer-events:none",
        "z-index:-9999", "top:0", "left:0",
        `width:${textW}px`,
        `font-family:${fontFamily || "Georgia, serif"}`,
        `font-size:${fontSize}px`,
        `line-height:${lineHeight}`,
        "text-align:justify",
        "-webkit-hyphens:auto", "hyphens:auto",
        "word-break:normal", "margin:0", "padding:0",
      ].join(";");
      document.body.appendChild(container);

      const newPages: string[][] = [];
      let current: string[] = [];
      let currentH = 0;

      for (const para of paragraphs) {
        const el = document.createElement("p");
        el.style.cssText = `margin:0;padding:0;text-indent:${Math.round(fontSize * 1.5)}px`;
        el.textContent = para;
        container.appendChild(el);
        const pHeight = el.offsetHeight + paraMarginPx;
        container.removeChild(el);

        if (currentH > 0 && currentH + pHeight > usableH) {
          newPages.push(current);
          current = [para];
          currentH = pHeight;
        } else {
          current.push(para);
          currentH += pHeight;
        }
      }
      if (current.length) newPages.push(current);

      document.body.removeChild(container);
      setPages(newPages.length ? newPages : [[""]]);
      setMeasuring(false);
    });
  }, [depsKey, paragraphs]);

  return { pages, measuring };
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
  const [dark, setDark] = useState(() => { try { return localStorage.getItem("plotzy_reader_dark") !== "false"; } catch { return true; } });
  const [fontSize, setFontSize] = useState(16);
  const [lineHeight, setLineHeight] = useState(1.82);
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showPagePanel, setShowPagePanel] = useState(false);
  const [panelJumpInput, setPanelJumpInput] = useState("");

  // Spread-based pagination
  const [spreadIdx, setSpreadIdx] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible] = useState(true);

  // Text selection bubble
  const [selBubble, setSelBubble] = useState<{ text: string; x: number; y: number } | null>(null);
  const [copiedSel, setCopiedSel] = useState(false);

  // Search within book
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [searchResultIdx, setSearchResultIdx] = useState(0);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem(`plotzy_bookmarks_${gutId}`) || "[]"); } catch { return []; }
  });

  // Font family
  const [fontFamily, setFontFamily] = useState(() => {
    try { return localStorage.getItem("plotzy_reader_font") || "Georgia, serif"; } catch { return "Georgia, serif"; }
  });

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

  // ── Derived data ──────────────────────────────────────────────────────────
  const paragraphs = useMemo(() => rawText ? parseParagraphs(rawText) : [], [rawText]);
  const { pages, measuring } = useMeasuredPages(paragraphs, PAGE_W, PAGE_H, fontSize, lineHeight, twoPage, fontFamily);
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
    if (meta) saveRecent(meta, leftPageIdx, pages.length);
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
      if (showToc || showSettings || showPagePanel) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); nextSpread(); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); prevSpread(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showToc, showSettings, showPagePanel, nextSpread, prevSpread]);

  // ── Clear selection bubble on page turn ──────────────────────────────────
  useEffect(() => { setSelBubble(null); }, [leftPageIdx]);

  // ── Text selection bubble ────────────────────────────────────────────────
  const handlePageMouseUp = useCallback((e: React.MouseEvent) => {
    const sel = window.getSelection();
    const text = sel?.toString().trim() || "";
    if (text.length < 2) { setSelBubble(null); return; }
    const range = sel!.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelBubble({ text, x: rect.left + rect.width / 2, y: rect.top - 8 });
    setCopiedSel(false);
  }, []);

  const goToPage = useCallback((pageIdx: number) => {
    setSpreadIdx(twoPage ? Math.floor(pageIdx / 2) : pageIdx);
  }, [twoPage]);

  // ── Search within book ──────────────────────────────────────────────────
  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (!q.trim() || !pages.length) { setSearchResults([]); return; }
    const lower = q.toLowerCase();
    const matches: number[] = [];
    pages.forEach((paras, idx) => {
      if (paras && paras.some(p => p.toLowerCase().includes(lower))) matches.push(idx);
    });
    setSearchResults(matches);
    setSearchResultIdx(0);
    if (matches.length > 0) goToPage(matches[0]);
  }, [pages]);

  const nextSearchResult = () => {
    if (searchResults.length === 0) return;
    const next = (searchResultIdx + 1) % searchResults.length;
    setSearchResultIdx(next);
    goToPage(searchResults[next]);
  };

  const prevSearchResult = () => {
    if (searchResults.length === 0) return;
    const prev = (searchResultIdx - 1 + searchResults.length) % searchResults.length;
    setSearchResultIdx(prev);
    goToPage(searchResults[prev]);
  };

  // ── Bookmarks ─────────────────────────────────────────────────────────────
  const toggleBookmark = () => {
    setBookmarks(prev => {
      const page = leftPageIdx;
      const next = prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page].sort((a, b) => a - b);
      try { localStorage.setItem(`plotzy_bookmarks_${gutId}`, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const isBookmarked = bookmarks.includes(leftPageIdx);

  // ── Highlight search matches in text ──────────────────────────────────────
  const highlightText = useCallback((text: string) => {
    if (!searchQuery || searchQuery.length < 2) return text;
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);
    if (parts.length <= 1) return text;
    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} style={{ background: "rgba(218,178,106,0.4)", color: "inherit", borderRadius: 2, padding: "0 1px" }}>{part}</mark>
        : part
    );
  }, [searchQuery]);

  function handleCopySel() {
    if (!selBubble) return;
    navigator.clipboard.writeText(selBubble.text).then(() => {
      setCopiedSel(true);
      setTimeout(() => { setCopiedSel(false); setSelBubble(null); }, 1500);
    });
  }

  function handleSearchSel() {
    if (!selBubble) return;
    window.open(`https://www.merriam-webster.com/dictionary/${encodeURIComponent(selBubble.text.split(/\s+/)[0])}`, "_blank");
    setSelBubble(null);
  }

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
  const pagePad = twoPage ? "32px 32px 20px 36px" : "40px 48px 24px 48px";
  const pageRPad = twoPage ? "32px 36px 20px 32px" : pagePad;

  // ── Loading ───────────────────────────────────────────────────────────────
  const isLoading = loadingMeta || loadingContent || (measuring && pages.length <= 1);
  const loadingMsg = loadingContent
    ? (ar ? "جارٍ تحميل النص…" : "Fetching text…")
    : measuring
      ? (ar ? "جارٍ تهيئة الصفحات…" : "Laying out pages…")
      : (ar ? "جارٍ التحميل…" : "Loading…");

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-5" style={{ background: dark ? "#07060d" : "#b8b3aa" }}>
        <div className="relative">
          <BookOpen className="w-12 h-12" style={{ color: "rgba(140,100,40,0.4)" }} />
          <Loader2 className="w-5 h-5 animate-spin absolute -bottom-1 -right-1" style={{ color: "rgba(218,178,106,0.9)" }} />
        </div>
        <div className="text-center">
          <p className="font-semibold text-base mb-1" style={{ color: "#1c1610" }}>{title || "Loading…"}</p>
          <p className="text-sm" style={{ color: "rgba(28,22,16,0.45)" }}>{loadingMsg}</p>
        </div>
      </div>
    );
  }

  if (error && !rawText) {
    const gutenbergUrl = gutId ? `https://www.gutenberg.org/ebooks/${gutId}` : null;
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-5" style={{ background: dark ? "#07060d" : "#b8b3aa" }}>
        <BookOpen className="w-12 h-12" style={{ color: "rgba(28,22,16,0.22)" }} />
        <div className="text-center max-w-xs px-6">
          <p className="text-base font-semibold mb-1" style={{ color: "#1c1610" }}>
            {ar ? "النص غير متاح لهذا الكتاب" : "Text not available"}
          </p>
          <p className="text-sm" style={{ color: "rgba(28,22,16,0.55)" }}>
            {ar ? "هذا الكتاب لا يوفر نسخة نصية قابلة للقراءة." : "This book doesn't have a readable plain-text version."}
          </p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Link href="/discover">
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium"
              style={{ background: "rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.15)", color: "#1c1610" }}>
              <ArrowLeft className="w-4 h-4" /> {ar ? "العودة للمكتبة" : "Browse other books"}
            </button>
          </Link>
          {gutenbergUrl && (
            <a href={gutenbergUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs underline underline-offset-2"
              style={{ color: "rgba(28,22,16,0.45)" }}>
              {ar ? "افتح على موقع Gutenberg" : "Open on Gutenberg.org"}
            </a>
          )}
        </div>
      </div>
    );
  }

  const gutenbergAuthorName = meta?.authors?.[0] ? formatAuthor(meta.authors[0]) : "an unknown author";

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: bg }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={e => {
        const sel = window.getSelection();
        if (sel && sel.toString().trim() === "") setSelBubble(null);
      }}
    >
      {meta && (
        <SEO
          title={meta.title}
          description={`Read ${meta.title} by ${gutenbergAuthorName} — free, public domain, on Plotzy.`}
          ogType="book"
          ogImage={meta.coverUrl || undefined}
        />
      )}
      {/* ══ TOP BAR ══════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0 z-40 select-none"
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
            <p className="text-sm font-semibold truncate leading-tight" style={{ color: fg, maxWidth: "min(260px, calc(100vw - 180px))" }}>{title}</p>
            {currentChapterName && (
              <p className="text-xs truncate leading-tight mt-0.5" style={{ color: fgMuted }}>{currentChapterName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <IconBtn onClick={() => setShowSearch(v => !v)} title="Search" color={showSearch ? accent : fgMuted}><Search className="w-4 h-4" /></IconBtn>
          <IconBtn onClick={toggleBookmark} title={isBookmarked ? "Remove bookmark" : "Bookmark"} color={isBookmarked ? accent : fgMuted}>
            <Bookmark className="w-4 h-4" style={{ fill: isBookmarked ? accent : "none" }} />
          </IconBtn>
          <IconBtn onClick={handleDownload} title="Download" color={fgMuted}><Download className="w-4 h-4" /></IconBtn>
          {chapters.length > 0 && (
            <IconBtn onClick={() => setShowToc(v => !v)} title="Contents" color={fgMuted}><List className="w-4 h-4" /></IconBtn>
          )}
          <IconBtn
            onClick={() => setShowPagePanel(v => !v)}
            title={ar ? "كل الصفحات" : "All pages"}
            color={showPagePanel ? accent : fgMuted}
          >
            <LayoutGrid className="w-4 h-4" />
          </IconBtn>
          <IconBtn onClick={() => setShowSettings(v => !v)} title="Settings" color={fgMuted}><Settings className="w-4 h-4" /></IconBtn>
          <IconBtn onClick={() => setDark(d => { const next = !d; try { localStorage.setItem("plotzy_reader_dark", String(next)); } catch {} return next; })} title={dark ? "Light" : "Dark"} color={fgMuted}>
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </IconBtn>
        </div>
      </div>

      {/* ══ SEARCH BAR ═══════════════════════════════════════════════════════ */}
      {showSearch && (
        <div className="flex items-center gap-2 px-4 py-2 shrink-0 z-30" style={{ background: barBg, borderBottom: `1px solid ${border}` }}>
          <Search className="w-3.5 h-3.5 shrink-0" style={{ color: fgMuted }} />
          <input
            autoFocus value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder={ar ? "ابحث في الكتاب..." : "Search in book..."}
            className="flex-1 bg-transparent border-none outline-none text-sm"
            style={{ color: fg, fontFamily }}
          />
          {searchResults.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs" style={{ color: fgMuted }}>{searchResultIdx + 1}/{searchResults.length}</span>
              <button onClick={prevSearchResult} className="w-6 h-6 rounded flex items-center justify-center" style={{ color: fgMuted }}><ChevronLeft className="w-3.5 h-3.5" /></button>
              <button onClick={nextSearchResult} className="w-6 h-6 rounded flex items-center justify-center" style={{ color: fgMuted }}><ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
          )}
          {searchQuery && searchResults.length === 0 && (
            <span className="text-xs shrink-0" style={{ color: fgMuted }}>{ar ? "لا نتائج" : "No results"}</span>
          )}
          <button onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); }} style={{ color: fgMuted }}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ══ BOOKMARKS BAR (if any) ════════════════════════════════════════════ */}
      {bookmarks.length > 0 && !showSearch && (
        <div className="flex items-center gap-2 px-4 py-1.5 shrink-0 z-30 overflow-x-auto" style={{ background: barBg, borderBottom: `1px solid ${border}` }}>
          <Bookmark className="w-3 h-3 shrink-0" style={{ color: accent }} />
          <span className="text-[10px] shrink-0" style={{ color: fgMuted }}>{ar ? "العلامات:" : "Bookmarks:"}</span>
          {bookmarks.map(page => (
            <button key={page} onClick={() => goToPage(page)}
              className="text-[11px] px-2 py-0.5 rounded-lg shrink-0 transition-all"
              style={{ background: leftPageIdx === page ? accent : "rgba(128,128,128,0.15)", color: leftPageIdx === page ? "#000" : fgMuted, fontWeight: 600 }}>
              {page + 1}
            </button>
          ))}
        </div>
      )}

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
              onMouseUp={handlePageMouseUp}
              style={{
                flex: 1,
                padding: pagePad,
                fontFamily,
                fontSize,
                lineHeight,
                color: fg,
                overflow: "hidden",
                cursor: "text",
              }}
            >
              {leftParas.map((para, i) => (
                <p key={i} style={{ marginBottom: "0.78em", textAlign: "justify", textIndent: "1.5em", hyphens: "auto" } as React.CSSProperties}>
                  {highlightText(para)}
                </p>
              ))}
            </div>
            {/* Footer */}
            <div style={{ padding: "6px 28px", borderTop: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
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
                  onMouseUp={handlePageMouseUp}
                  style={{
                    flex: 1,
                    padding: pageRPad,
                    fontFamily,
                    fontSize,
                    lineHeight,
                    color: fg,
                    overflow: "hidden",
                    cursor: "text",
                  }}
                >
                  {rightParas.map((para, i) => (
                    <p key={i} style={{ marginBottom: "0.78em", textAlign: "justify", textIndent: "1.5em", hyphens: "auto" } as React.CSSProperties}>
                      {highlightText(para)}
                    </p>
                  ))}
                </div>
                <div style={{ padding: "6px 28px", borderTop: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
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
      <div className="flex items-center justify-between px-6 py-3 shrink-0 select-none"
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

      {/* ══ SELECTION BUBBLE ═════════════════════════════════════════════════ */}
      {selBubble && (
        <div
          style={{
            position: "fixed",
            left: Math.max(60, Math.min(selBubble.x, window.innerWidth - 60)),
            top: Math.max(60, selBubble.y),
            transform: "translate(-50%, -100%)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            gap: 2,
            background: dark ? "#1e1c2a" : "#1c1a26",
            border: `1px solid ${dark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.12)"}`,
            borderRadius: 10,
            padding: "5px 6px",
            boxShadow: "0 6px 24px rgba(0,0,0,0.45)",
            pointerEvents: "auto",
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          {/* Copy */}
          <button
            onClick={handleCopySel}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 10px", borderRadius: 7,
              background: copiedSel ? "rgba(110,231,183,0.15)" : "transparent",
              border: "none", cursor: "pointer",
              color: copiedSel ? "#6ee7b7" : "#e8e4dc",
              fontSize: 12, fontWeight: 600,
              transition: "all .15s",
              whiteSpace: "nowrap",
            }}
          >
            <Copy style={{ width: 12, height: 12 }} />
            {copiedSel ? "Copied!" : "Copy"}
          </button>
          {/* Divider */}
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)", flexShrink: 0 }} />
          {/* Define (only for single words) */}
          <button
            onClick={handleSearchSel}
            title="Look up in dictionary"
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 10px", borderRadius: 7,
              background: "transparent", border: "none", cursor: "pointer",
              color: "#b8b4cc", fontSize: 12, fontWeight: 500,
              transition: "all .15s",
              whiteSpace: "nowrap",
            }}
          >
            <Search style={{ width: 12, height: 12 }} />
            Define
          </button>
          {/* Close */}
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)", flexShrink: 0 }} />
          <button
            onClick={() => { setSelBubble(null); window.getSelection()?.removeAllRanges(); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 26, height: 26, borderRadius: 6,
              background: "transparent", border: "none", cursor: "pointer",
              color: "#666",
            }}
          >
            <X style={{ width: 11, height: 11 }} />
          </button>
          {/* Small arrow pointing down */}
          <div style={{
            position: "absolute", bottom: -5, left: "50%",
            width: 8, height: 8,
            background: dark ? "#1e1c2a" : "#1c1a26",
            borderRight: `1px solid ${dark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.12)"}`,
            borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.12)"}`,
            transform: "translateX(-50%) rotate(45deg)",
          }} />
        </div>
      )}

      {/* ══ PAGE PANEL SIDEBAR ═══════════════════════════════════════════════ */}
      {showPagePanel && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)" }} onClick={() => setShowPagePanel(false)} />

          {/* Sidebar */}
          <div className="relative flex flex-col w-72 h-full shrink-0 z-10"
            style={{ background: dark ? "#0d0c14" : "#f5f2ec", borderRight: `1px solid ${border}` }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 shrink-0" style={{ borderBottom: `1px solid ${border}` }}>
              <span className="text-sm font-semibold" style={{ color: fg }}>
                {ar ? "كل الصفحات" : "All Pages"}
                <span className="ml-2 text-xs font-normal opacity-40">{totalSpreads}</span>
              </span>
              {/* Jump-to-page input */}
              <form onSubmit={e => {
                e.preventDefault();
                const n = parseInt(panelJumpInput.trim(), 10);
                if (!isNaN(n) && n >= 1 && n <= totalPages) {
                  const spread = twoPage ? Math.floor((n - 1) / 2) : n - 1;
                  goToSpread(Math.min(totalSpreads - 1, Math.max(0, spread)), spread > clampedSpread ? "forward" : "backward");
                  setShowPagePanel(false);
                }
                setPanelJumpInput("");
              }} className="flex items-center gap-1.5">
                <input
                  type="number" min={1} max={totalPages}
                  placeholder={ar ? "صفحة" : "p."}
                  value={panelJumpInput}
                  onChange={e => setPanelJumpInput(e.target.value)}
                  style={{
                    width: 54, padding: "3px 8px", borderRadius: 8, fontSize: 12, textAlign: "center",
                    background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
                    border: `1px solid ${border}`, color: fg, outline: "none",
                  }}
                />
                <button type="submit" style={{ fontSize: 11, color: accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                  {ar ? "انتقل" : "Go"}
                </button>
              </form>
              <button onClick={() => setShowPagePanel(false)} style={{ color: fgMuted, background: "none", border: "none", cursor: "pointer" }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable page grid */}
            <div className="flex-1 overflow-y-auto p-3">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {Array.from({ length: totalSpreads }).map((_, i) => {
                  const lp = twoPage ? i * 2 + 1 : i + 1;
                  const rp = twoPage ? i * 2 + 2 : null;
                  const isActive = i === clampedSpread;
                  const firstWords = pages[twoPage ? i * 2 : i]?.[0]?.slice(0, 60) || "";
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        goToSpread(i, i > clampedSpread ? "forward" : "backward");
                        setShowPagePanel(false);
                      }}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "stretch",
                        border: `1.5px solid ${isActive ? accent : border}`,
                        borderRadius: 10, overflow: "hidden", cursor: "pointer",
                        background: isActive
                          ? (dark ? "rgba(218,178,106,0.08)" : "rgba(140,100,40,0.07)")
                          : (dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"),
                        transition: "all 0.12s",
                        padding: 0,
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.borderColor = dark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.22)"; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.borderColor = border; }}
                    >
                      {/* Mini page preview area */}
                      <div style={{
                        padding: "8px 8px 4px",
                        fontFamily: "Georgia,serif", fontSize: 8,
                        lineHeight: 1.4, color: fgMuted,
                        overflow: "hidden", height: 52,
                        textAlign: "left",
                      }}>
                        {firstWords || "…"}
                      </div>
                      {/* Footer with page number */}
                      <div style={{
                        padding: "3px 8px 5px", borderTop: `1px solid ${border}`,
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        background: isActive
                          ? (dark ? "rgba(218,178,106,0.12)" : "rgba(140,100,40,0.09)")
                          : "transparent",
                      }}>
                        <span style={{ fontSize: 9, color: isActive ? accent : fgMuted, fontWeight: isActive ? 700 : 400, fontFamily: "Georgia,serif" }}>
                          {lp}{rp && rp <= totalPages ? `–${rp}` : ""}
                        </span>
                        {isActive && (
                          <span style={{ fontSize: 7, color: accent, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                            {ar ? "هنا" : "here"}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

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
            <SettingRow label={ar ? "نوع الخط" : "Font"} icon={<Type className="w-4 h-4" style={{ color: fgMuted }} />}>
              <select value={fontFamily} onChange={e => { setFontFamily(e.target.value); try { localStorage.setItem("plotzy_reader_font", e.target.value); } catch {} }}
                className="text-sm rounded-lg px-2 py-1 outline-none"
                style={{ background: "rgba(128,128,128,0.15)", border: `1px solid ${border}`, color: fg, fontFamily }}>
                <option value="Georgia, serif">Georgia</option>
                <option value="'Merriweather', serif">Merriweather</option>
                <option value="'Lora', serif">Lora</option>
                <option value="'Crimson Text', serif">Crimson Text</option>
                <option value="'Libre Baskerville', serif">Libre Baskerville</option>
                <option value="'Inter', sans-serif">Inter</option>
                <option value="'Source Serif 4', serif">Source Serif</option>
                <option value="'Courier Prime', monospace">Courier Prime</option>
              </select>
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
