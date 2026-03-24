import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useGutenbergBook } from "@/hooks/use-gutenberg";
import {
  ArrowLeft, BookOpen, Loader2, Download, ChevronDown,
  AlignJustify, BookMarked, StickyNote, X, Trash2, Plus,
  Highlighter, Clipboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
interface Highlight {
  id: string;
  text: string;
  color: string;
}

interface Note {
  id: string;
  quote: string;
  quoteColor: string;
  body: string;
  createdAt: number;
}

/* ─── Constants ─── */
const THEMES = [
  { id: "light", bg: "bg-white",       text: "text-gray-900",   bar: "bg-white/90 border-black/10" },
  { id: "sepia", bg: "bg-[#f5efe0]",   text: "text-[#3d2b1f]",  bar: "bg-[#f5efe0]/90 border-[#3d2b1f]/10" },
  { id: "dark",  bg: "bg-[#1a1a1a]",   text: "text-gray-100",   bar: "bg-zinc-900/90 border-white/10" },
  { id: "night", bg: "bg-[#0d0d14]",   text: "text-[#d4c9ff]",  bar: "bg-[#0d0d14]/90 border-white/10" },
];

const FONT_SIZES = [
  { id: "sm", label: "S",  cls: "text-base leading-8" },
  { id: "md", label: "M",  cls: "text-lg leading-9" },
  { id: "lg", label: "L",  cls: "text-xl leading-10" },
  { id: "xl", label: "XL", cls: "text-2xl leading-[3rem]" },
];

const FONTS = [
  { id: "serif", label: "Serif", cls: "font-serif" },
  { id: "sans",  label: "Sans",  cls: "font-sans" },
];

const HL_COLORS = [
  { id: "yellow", bg: "#fef08a", label: "Yellow" },
  { id: "green",  bg: "#bbf7d0", label: "Green" },
  { id: "blue",   bg: "#bfdbfe", label: "Blue" },
  { id: "pink",   bg: "#fbcfe8", label: "Pink" },
  { id: "orange", bg: "#fed7aa", label: "Orange" },
];

/* ─── Helpers ─── */
function uid() { return Math.random().toString(36).slice(2); }

function parseGutenbergText(raw: string): string[] {
  let text = raw;
  const startPats = [/\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG/i];
  const endPats   = [/\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG/i, /End of (the )?Project Gutenberg/i];
  for (const p of startPats) {
    const m = text.search(p);
    if (m !== -1) { text = text.slice(m + text.slice(m).indexOf("\n") + 1); break; }
  }
  for (const p of endPats) {
    const m = text.search(p);
    if (m !== -1) { text = text.slice(0, m); break; }
  }
  return text.split(/\n{2,}/).map(b => b.replace(/\r/g, "").trim()).filter(b => b.length > 0);
}

/** Apply highlights to a paragraph's text — returns HTML string */
function applyHighlights(text: string, highlights: Highlight[]): string {
  let result = escapeHtml(text);
  for (const hl of highlights) {
    const escaped = escapeHtml(hl.text);
    if (!escaped.trim()) continue;
    const idx = result.indexOf(escaped);
    if (idx === -1) continue;
    result =
      result.slice(0, idx) +
      `<mark style="background:${hl.color};border-radius:3px;padding:0 2px;">${escaped}</mark>` +
      result.slice(idx + escaped.length);
  }
  return result;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ─── Download Menu ─── */
function DownloadMenu({ book }: { book: any }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const opts = [
    book.downloadUrl && { label: "EPUB", url: book.downloadUrl, color: "text-blue-500" },
    book.txtUrl      && { label: "TXT",  url: book.txtUrl,      color: "text-green-500" },
    book.pdfUrl      && { label: "PDF",  url: book.pdfUrl,      color: "text-red-500" },
  ].filter(Boolean) as { label: string; url: string; color: string }[];
  if (!opts.length) return null;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-current/20 opacity-70 hover:opacity-100 transition-opacity">
        <Download className="w-3.5 h-3.5" />
        Download
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 right-0 z-50 min-w-[110px] bg-white dark:bg-zinc-900 border border-border rounded-xl shadow-2xl overflow-hidden">
          {opts.map(o => (
            <a key={o.label} href={o.url} target="_blank" rel="noopener noreferrer"
               onClick={() => setOpen(false)}
               className="flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-xs font-medium text-foreground">
              <span className={cn("font-bold uppercase text-[10px]", o.color)}>{o.label}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main ─── */
export default function GutenbergReader() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const bookId = parseInt(id || "0", 10);

  const { data: book, isLoading: bookLoading, isError: bookError } = useGutenbergBook(bookId || null);

  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  const [themeIdx, setThemeIdx] = useState(() => {
    const v = localStorage.getItem("reader-themeIdx"); return v ? parseInt(v) : 0;
  });
  const [fontSizeIdx, setFontSizeIdx] = useState(() => {
    const v = localStorage.getItem("reader-fontSizeIdx"); return v ? parseInt(v) : 1;
  });
  const [fontIdx, setFontIdx] = useState(() => {
    const v = localStorage.getItem("reader-fontIdx"); return v ? parseInt(v) : 0;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [spreadIdx, setSpreadIdx] = useState(0);

  /* ─── Highlights & Notes ─── */
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [pendingQuote, setPendingQuote] = useState<{ text: string; color: string } | null>(null);

  /* ─── Selection popup ─── */
  const [selPopup, setSelPopup] = useState<{ x: number; y: number; text: string } | null>(null);
  const selPopupRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const theme    = THEMES[themeIdx];
  const fontSize = FONT_SIZES[fontSizeIdx];
  const font     = FONTS[fontIdx];

  const lsKeyHL   = `gutenberg-hl-${bookId}`;
  const lsKeyNote = `gutenberg-notes-${bookId}`;

  /* ─── Persist to localStorage ─── */
  useEffect(() => {
    const stored = localStorage.getItem(lsKeyHL);
    if (stored) try { setHighlights(JSON.parse(stored)); } catch {}
  }, [lsKeyHL]);
  useEffect(() => {
    const stored = localStorage.getItem(lsKeyNote);
    if (stored) try { setNotes(JSON.parse(stored)); } catch {}
  }, [lsKeyNote]);
  useEffect(() => { localStorage.setItem(lsKeyHL,   JSON.stringify(highlights)); }, [highlights, lsKeyHL]);
  useEffect(() => { localStorage.setItem(lsKeyNote, JSON.stringify(notes));      }, [notes, lsKeyNote]);

  /* ─── Persist reading preferences ─── */
  useEffect(() => { localStorage.setItem("reader-themeIdx",    String(themeIdx));    }, [themeIdx]);
  useEffect(() => { localStorage.setItem("reader-fontSizeIdx", String(fontSizeIdx)); }, [fontSizeIdx]);
  useEffect(() => { localStorage.setItem("reader-fontIdx",     String(fontIdx));     }, [fontIdx]);

  /* ─── Save to Recently Viewed when book loads ─── */
  useEffect(() => {
    if (!book) return;
    const key = "gutenberg-recently-viewed";
    const stored: any[] = JSON.parse(localStorage.getItem(key) || "[]");
    const filtered = stored.filter((b: any) => b.id !== book.id);
    const entry = { id: book.id, title: book.title, authors: book.authors, coverImage: book.coverImage };
    localStorage.setItem(key, JSON.stringify([entry, ...filtered].slice(0, 8)));
  }, [book?.id]);

  /* ─── Paginated spreads ─── */
  const CHARS_PER_PAGE = [700, 950, 1200, 1500][fontSizeIdx] ?? 950;
  const spreads = useMemo(() => {
    if (!paragraphs.length) return [] as [string[], string[]][];
    const pages: string[][] = [];
    let cur: string[] = [];
    let curLen = 0;
    for (const para of paragraphs) {
      if (curLen + para.length > CHARS_PER_PAGE && cur.length > 0) {
        pages.push(cur);
        cur = [para];
        curLen = para.length;
      } else {
        cur.push(para);
        curLen += para.length;
      }
    }
    if (cur.length > 0) pages.push(cur);
    const out: [string[], string[]][] = [];
    for (let i = 0; i < pages.length; i += 2) {
      out.push([pages[i], pages[i + 1] ?? []]);
    }
    return out;
  }, [paragraphs, fontSizeIdx]);

  const progress = spreads.length > 1 ? Math.round((spreadIdx / (spreads.length - 1)) * 100) : 0;

  /* ─── Clamp spreadIdx when spreads change (font-size change) ─── */
  useEffect(() => {
    setSpreadIdx(i => Math.min(i, Math.max(0, spreads.length - 1)));
  }, [spreads.length]);

  /* ─── Save / restore page position per book ─── */
  const lsKeySpread = `gutenberg-spread-${bookId}`;
  useEffect(() => {
    if (!reading) return;
    const saved = localStorage.getItem(lsKeySpread);
    if (saved) setSpreadIdx(Math.max(0, parseInt(saved)));
  }, [reading, lsKeySpread]);
  useEffect(() => {
    if (!reading) return;
    localStorage.setItem(lsKeySpread, String(spreadIdx));
  }, [spreadIdx, reading, lsKeySpread]);

  /* ─── Keyboard navigation ─── */
  useEffect(() => {
    if (!reading) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        setSpreadIdx(i => Math.min(i + 1, spreads.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setSpreadIdx(i => Math.max(i - 1, 0));
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [reading, spreads.length]);

  /* ─── Close popups on outside click ─── */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (selPopupRef.current && !selPopupRef.current.contains(e.target as Node)) {
        setSelPopup(null);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* ─── Detect text selection ─── */
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) { setSelPopup(null); return; }
      const text = sel.toString().trim();
      if (text.length < 2) { setSelPopup(null); return; }
      const range = sel.getRangeAt(0);
      const rect  = range.getBoundingClientRect();
      setSelPopup({
        x: rect.left + rect.width / 2,
        y: rect.top + window.scrollY - 12,
        text,
      });
    }, 10);
  }, []);

  /* ─── Add highlight ─── */
  const addHighlight = useCallback((color: string) => {
    if (!selPopup) return;
    setHighlights(prev => [...prev, { id: uid(), text: selPopup.text, color }]);
    window.getSelection()?.removeAllRanges();
    setSelPopup(null);
  }, [selPopup]);

  /* ─── Copy selection to Notes ─── */
  const copyToNotes = useCallback((color = "#fef08a") => {
    if (!selPopup) return;
    setPendingQuote({ text: selPopup.text, color: "transparent" });
    setNoteInput("");
    setShowNotes(true);
    window.getSelection()?.removeAllRanges();
    setSelPopup(null);
  }, [selPopup]);

  /* ─── Save note ─── */
  const saveNote = useCallback(() => {
    if (!pendingQuote && !noteInput.trim()) return;
    const note: Note = {
      id: uid(),
      quote: pendingQuote?.text || "",
      quoteColor: pendingQuote?.color || "transparent",
      body: noteInput.trim(),
      createdAt: Date.now(),
    };
    setNotes(prev => [note, ...prev]);
    setPendingQuote(null);
    setNoteInput("");
  }, [pendingQuote, noteInput]);

  const deleteNote    = (id: string) => setNotes(prev => prev.filter(n => n.id !== id));
  const deleteHighlight = (id: string) => setHighlights(prev => prev.filter(h => h.id !== id));

  /* ─── Load book text ─── */
  const loadText = useCallback(async () => {
    if (!book?.txtUrl) return;
    setTextLoading(true);
    setTextError(null);
    try {
      const res = await fetch(`/api/gutenberg/proxy-text?url=${encodeURIComponent(book.txtUrl)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.text();
      const parsed = parseGutenbergText(raw);
      if (!parsed.length) throw new Error("No readable content found");
      setParagraphs(parsed);
      setReading(true);
      setTimeout(() => window.scrollTo({ top: 0 }), 50);
    } catch (e: any) {
      setTextError(e.message || "Failed to load");
    } finally {
      setTextLoading(false);
    }
  }, [book?.txtUrl]);

  /* ─── Loading / Error ─── */
  if (bookLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading book…</p>
      </div>
    </div>
  );

  if (bookError || !book) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <BookMarked className="w-12 h-12 mx-auto text-muted-foreground/40" />
        <p className="font-semibold">Book not found</p>
        <button onClick={() => navigate("/gutenberg")} className="text-sm text-primary hover:underline">← Back to Library</button>
      </div>
    </div>
  );

  const authorLine = book.authors.slice(0, 2).join(" & ") || "Unknown Author";

  /* ─── Book Info Screen ─── */
  if (!reading) return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/gutenberg")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Public Domain Library
        </button>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex gap-8 mb-10">
          <div className="flex-shrink-0">
            {book.coverImage ? (
              <img src={book.coverImage} alt={book.title} className="w-36 h-52 object-cover rounded-2xl shadow-2xl shadow-black/20" />
            ) : (
              <div className="w-36 h-52 rounded-2xl bg-gradient-to-br from-violet-500/20 to-primary/20 border border-border flex items-center justify-center shadow-lg">
                <BookMarked className="w-12 h-12 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Project Gutenberg</div>
            <h1 className="text-2xl font-bold text-foreground leading-snug mb-2">{book.title}</h1>
            <p className="text-muted-foreground text-sm mb-4">{authorLine}</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {book.languages.map((l: string) => (
                <span key={l} className="text-[10px] font-bold uppercase bg-muted px-2 py-0.5 rounded-md text-muted-foreground">{l}</span>
              ))}
              {book.downloadCount > 0 && (
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{book.downloadCount.toLocaleString()} downloads</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {book.txtUrl ? (
                <button onClick={loadText} disabled={textLoading}
                        className="flex items-center gap-2 bg-foreground text-background text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                  {textLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</> : <><BookOpen className="w-4 h-4" /> Read Now</>}
                </button>
              ) : (
                <a href={book.readUrl || `https://www.gutenberg.org/ebooks/${book.id}`} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 bg-foreground text-background text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
                  <BookOpen className="w-4 h-4" /> Read on Gutenberg
                </a>
              )}
              <DownloadMenu book={book} />
            </div>
            {textError && <p className="mt-3 text-xs text-destructive">{textError} — try downloading the file instead.</p>}
          </div>
        </div>
        {book.subjects.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Subjects</h3>
            <div className="flex flex-wrap gap-1.5">
              {book.subjects.map((s: string) => (
                <span key={s} className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full">{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  /* ─── Reading View ─── */
  return (
    <div className={cn("min-h-screen transition-colors duration-300 select-text", theme.bg, theme.text)}>

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-0.5 z-50 bg-black/10">
        <div className="h-full bg-primary transition-all duration-150" style={{ width: `${progress}%` }} />
      </div>

      {/* ── Toolbar ── */}
      <div className={cn("fixed top-0.5 left-0 right-0 z-40 border-b backdrop-blur transition-colors duration-300", theme.bar)}>
        <div className={cn("transition-all duration-300", showNotes ? "mr-80" : "")}>
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">

            <button onClick={() => navigate("/gutenberg")}
                    className="flex items-center gap-1.5 text-sm font-medium opacity-60 hover:opacity-100 transition-opacity flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Library</span>
            </button>

            <div className="flex-1 min-w-0 text-center">
              <p className="text-sm font-semibold truncate opacity-70">{book.title}</p>
            </div>

            {/* Notes button */}
            <button
              onClick={() => setShowNotes(v => !v)}
              className={cn("flex items-center gap-1.5 text-sm font-medium flex-shrink-0 px-3 py-1.5 rounded-xl transition-all",
                showNotes ? "bg-primary/15 text-primary opacity-100" : "opacity-60 hover:opacity-100")}
            >
              <StickyNote className="w-4 h-4" />
              <span className="hidden sm:inline">Notes</span>
              {notes.length > 0 && (
                <span className="bg-primary text-primary-foreground text-[9px] font-bold px-1 py-0.5 rounded-full min-w-[14px] text-center">
                  {notes.length}
                </span>
              )}
            </button>

            {/* Settings */}
            <div className="relative flex-shrink-0" ref={settingsRef}>
              <button onClick={() => setShowSettings(v => !v)}
                      className={cn("flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl border transition-all",
                        showSettings ? "opacity-100 border-current/20 bg-current/10" : "opacity-60 hover:opacity-100 border-transparent")}>
                <AlignJustify className="w-4 h-4" />
                <span>Aa</span>
              </button>
              {showSettings && (
                <div className={cn(
                  "absolute top-full right-0 mt-2 z-50 w-64 rounded-2xl shadow-2xl border p-4 space-y-4",
                  theme.id === "dark" || theme.id === "night" ? "bg-zinc-900 border-white/10" : "bg-white border-black/10"
                )}>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest opacity-50 mb-2">Font Size</p>
                    <div className="flex gap-1">
                      {FONT_SIZES.map((fs, i) => (
                        <button key={fs.id} onClick={() => setFontSizeIdx(i)}
                                className={cn("flex-1 py-1.5 rounded-lg text-xs font-bold transition-all",
                                  i === fontSizeIdx ? "bg-foreground text-background" : "opacity-40 hover:opacity-70")}>
                          {fs.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest opacity-50 mb-2">Font</p>
                    <div className="flex gap-1">
                      {FONTS.map((ff, i) => (
                        <button key={ff.id} onClick={() => setFontIdx(i)}
                                className={cn("flex-1 py-1.5 rounded-lg text-xs font-medium transition-all",
                                  i === fontIdx ? "bg-foreground text-background" : "opacity-40 hover:opacity-70")}>
                          {ff.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest opacity-50 mb-2">Theme</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {THEMES.map((t, i) => (
                        <button key={t.id} onClick={() => setThemeIdx(i)}
                                className={cn("h-8 rounded-lg border-2 transition-all text-[9px] font-bold flex items-center justify-center",
                                  t.bg, t.text,
                                  i === themeIdx ? "border-primary scale-105" : "border-transparent opacity-60 hover:opacity-100")}>
                          {["Light","Sepia","Dark","Night"][i]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-1 border-t border-current/10">
                    <p className="text-[10px] opacity-50 mb-1">Progress: {progress}%</p>
                    <div className="h-1 rounded-full bg-current/10 overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Selection Popup (highlighter toolbar) ── */}
      {selPopup && (
        <div
          ref={selPopupRef}
          className="fixed z-[60] flex items-center gap-1 px-2 py-1.5 rounded-xl shadow-2xl border border-white/20 backdrop-blur bg-zinc-900/95"
          style={{
            left: Math.max(8, Math.min(selPopup.x - 120, window.innerWidth - 248)),
            top: selPopup.y - 52,
          }}
        >
          {/* Highlighter label */}
          <span className="text-[10px] text-white/50 mr-1 select-none">
            <Highlighter className="w-3 h-3 inline" />
          </span>

          {/* Color dots */}
          {HL_COLORS.map(c => (
            <button
              key={c.id}
              title={c.label}
              onClick={() => addHighlight(c.bg)}
              className="w-5 h-5 rounded-full border-2 border-white/20 hover:scale-125 transition-transform flex-shrink-0"
              style={{ background: c.bg }}
            />
          ))}

          {/* Divider */}
          <div className="w-px h-4 bg-white/20 mx-1" />

          {/* Copy to Notes */}
          <button
            onClick={() => copyToNotes()}
            title="Copy to Notes"
            className="flex items-center gap-1 text-white/80 hover:text-white text-[10px] font-medium px-2 py-0.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Clipboard className="w-3 h-3" />
            <span>Note</span>
          </button>
        </div>
      )}

      {/* ── Notes Panel (right drawer) ── */}
      <div className={cn(
        "fixed top-0 right-0 h-full z-30 w-80 flex flex-col border-l transition-transform duration-300",
        theme.id === "dark" || theme.id === "night"
          ? "bg-zinc-950 border-white/10 text-gray-100"
          : theme.id === "sepia"
          ? "bg-[#ede7d5] border-[#3d2b1f]/10 text-[#3d2b1f]"
          : "bg-gray-50 border-gray-200 text-gray-900",
        showNotes ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-current/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <StickyNote className="w-4 h-4 opacity-60" />
            <span className="font-semibold text-sm">Notes</span>
            {notes.length > 0 && <span className="text-xs opacity-50">({notes.length})</span>}
          </div>
          <button onClick={() => setShowNotes(false)} className="opacity-40 hover:opacity-80 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New note composer */}
        <div className="px-3 py-3 border-b border-current/10 flex-shrink-0 space-y-2">
          {pendingQuote && (
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-current/5 border border-current/10">
              <div className="w-1 rounded-full self-stretch flex-shrink-0" style={{ background: "#fef08a", minHeight: 16 }} />
              <p className="text-xs opacity-70 italic line-clamp-3 flex-1">"{pendingQuote.text}"</p>
              <button onClick={() => setPendingQuote(null)} className="opacity-30 hover:opacity-70 flex-shrink-0 mt-0.5">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <textarea
            value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
            placeholder={pendingQuote ? "Add your note (optional)…" : "Write a note…"}
            rows={2}
            className="w-full text-xs rounded-lg p-2 resize-none border border-current/15 bg-current/5 placeholder:opacity-30 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <button
            onClick={saveNote}
            disabled={!pendingQuote && !noteInput.trim()}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-30 transition-opacity"
          >
            <Plus className="w-3 h-3" />
            Save Note
          </button>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {notes.length === 0 ? (
            <div className="py-10 text-center opacity-30 space-y-2">
              <StickyNote className="w-8 h-8 mx-auto" />
              <p className="text-xs">No notes yet.<br />Select text and tap "Note" to add one.</p>
            </div>
          ) : notes.map(note => (
            <div key={note.id} className="group rounded-xl border border-current/10 bg-current/[0.03] overflow-hidden">
              {note.quote && (
                <div className="flex items-start gap-2 px-3 pt-3 pb-2">
                  <div className="w-0.5 rounded-full self-stretch flex-shrink-0" style={{ background: "#fbbf24", minHeight: 16 }} />
                  <p className="text-[11px] opacity-60 italic leading-relaxed flex-1">"{note.quote}"</p>
                </div>
              )}
              {note.body && (
                <p className="text-xs leading-relaxed px-3 pb-3 pt-1 opacity-80 whitespace-pre-wrap">{note.body}</p>
              )}
              <div className="flex items-center justify-between px-3 pb-2">
                <span className="text-[9px] opacity-30">
                  {new Date(note.createdAt).toLocaleDateString()}
                </span>
                <button onClick={() => deleteNote(note.id)}
                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-red-500">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {/* Saved highlights section */}
          {highlights.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest opacity-40 mb-2">Highlights ({highlights.length})</p>
              <div className="space-y-1.5">
                {highlights.map(hl => (
                  <div key={hl.id} className="group flex items-start gap-2 px-2.5 py-2 rounded-lg border border-current/10">
                    <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ background: hl.color }} />
                    <p className="text-[11px] flex-1 leading-relaxed opacity-70 italic">"{hl.text}"</p>
                    <button onClick={() => deleteHighlight(hl.id)}
                            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-red-500 flex-shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Book Spread ── */}
      <div
        className={cn("transition-all duration-300 flex flex-col", showNotes ? "mr-80" : "")}
        style={{ paddingTop: 52, height: "100vh" }}
        onMouseUp={handleMouseUp}
      >
        {/* ── Pages area ── */}
        <div className="flex-1 flex items-stretch px-3 sm:px-6 py-4 gap-0 overflow-hidden min-h-0">

          {/* Left page */}
          <div
            className={cn("flex-1 overflow-hidden flex flex-col rounded-l-2xl", fontSize.cls, font.cls)}
            style={
              theme.id === "light" ? { background: "#fafaf9", borderTop: "1px solid rgba(0,0,0,0.07)", borderBottom: "1px solid rgba(0,0,0,0.07)", borderLeft: "1px solid rgba(0,0,0,0.07)" }
              : theme.id === "sepia" ? { background: "#f5efe0", borderTop: "1px solid rgba(61,43,31,0.10)", borderBottom: "1px solid rgba(61,43,31,0.10)", borderLeft: "1px solid rgba(61,43,31,0.10)" }
              : theme.id === "dark" ? { background: "#1c1c1e", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", borderLeft: "1px solid rgba(255,255,255,0.06)" }
              : { background: "#0d0d14", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", borderLeft: "1px solid rgba(255,255,255,0.06)" }
            }
          >
            <div className="flex-1 overflow-hidden px-6 sm:px-10 py-8">
              {/* Title header on first spread */}
              {spreadIdx === 0 && (
                <div className="text-center mb-8 pb-6 border-b border-current/10">
                  <p className="text-[10px] font-semibold uppercase tracking-widest opacity-35 mb-2">Project Gutenberg</p>
                  <h1 className="text-lg sm:text-xl font-bold mb-1 leading-snug">{book.title}</h1>
                  <p className="opacity-45 text-sm">{authorLine}</p>
                </div>
              )}
              {(spreads[spreadIdx]?.[0] ?? []).map((para, i) => {
                const isHeading  = /^[A-Z\s\d\.\-_,'"]+$/.test(para) && para.length < 80 && !para.includes(".");
                const isOrnament = /^[\*\-_=~\s]{3,}$/.test(para);
                const html       = applyHighlights(para, highlights);
                if (isOrnament) return <div key={i} className="text-center opacity-25 my-6">* * *</div>;
                if (isHeading)  return <h2 key={i} className="text-base font-bold mt-8 mb-3 opacity-75 tracking-wide text-center" dangerouslySetInnerHTML={{ __html: html }} />;
                return <p key={i} className="mb-4 indent-8 opacity-90 text-pretty" dangerouslySetInnerHTML={{ __html: html }} />;
              })}
              {/* End-of-book indicator on last spread */}
              {spreadIdx === spreads.length - 1 && (spreads[spreadIdx]?.[1] ?? []).length === 0 && (
                <div className="text-center mt-10 opacity-25 text-sm">— fin —</div>
              )}
            </div>
          </div>

          {/* Spine */}
          <div
            style={{
              width: 2, flexShrink: 0,
              background: theme.id === "dark" || theme.id === "night"
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.07)",
            }}
          />

          {/* Right page */}
          <div
            className={cn("flex-1 overflow-hidden flex-col rounded-r-2xl hidden sm:flex", fontSize.cls, font.cls)}
            style={
              theme.id === "light" ? { background: "#fafaf9", borderTop: "1px solid rgba(0,0,0,0.07)", borderBottom: "1px solid rgba(0,0,0,0.07)", borderRight: "1px solid rgba(0,0,0,0.07)" }
              : theme.id === "sepia" ? { background: "#f0e9d6", borderTop: "1px solid rgba(61,43,31,0.10)", borderBottom: "1px solid rgba(61,43,31,0.10)", borderRight: "1px solid rgba(61,43,31,0.10)" }
              : theme.id === "dark" ? { background: "#1c1c1e", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", borderRight: "1px solid rgba(255,255,255,0.06)" }
              : { background: "#0d0d14", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", borderRight: "1px solid rgba(255,255,255,0.06)" }
            }
          >
            <div className="flex-1 overflow-hidden px-6 sm:px-10 py-8">
              {(spreads[spreadIdx]?.[1] ?? []).map((para, i) => {
                const isHeading  = /^[A-Z\s\d\.\-_,'"]+$/.test(para) && para.length < 80 && !para.includes(".");
                const isOrnament = /^[\*\-_=~\s]{3,}$/.test(para);
                const html       = applyHighlights(para, highlights);
                if (isOrnament) return <div key={i} className="text-center opacity-25 my-6">* * *</div>;
                if (isHeading)  return <h2 key={i} className="text-base font-bold mt-8 mb-3 opacity-75 tracking-wide text-center" dangerouslySetInnerHTML={{ __html: html }} />;
                return <p key={i} className="mb-4 indent-8 opacity-90 text-pretty" dangerouslySetInnerHTML={{ __html: html }} />;
              })}
              {/* End-of-book indicator */}
              {spreadIdx === spreads.length - 1 && (spreads[spreadIdx]?.[1] ?? []).length > 0 && (
                <div className="text-center mt-10 opacity-25 text-sm">— fin —</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Navigation bar ── */}
        <div
          className={cn("flex items-center justify-between px-6 py-3 border-t flex-shrink-0", theme.bar)}
          style={{ borderColor: theme.id === "dark" || theme.id === "night" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }}
        >
          <button
            onClick={() => setSpreadIdx(i => Math.max(0, i - 1))}
            disabled={spreadIdx === 0}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition-all disabled:opacity-25 hover:opacity-70"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          <span className="text-xs opacity-40 font-medium tabular-nums select-none">
            {spreads.length > 0 ? `${spreadIdx + 1} / ${spreads.length}` : "—"}
          </span>

          <button
            onClick={() => setSpreadIdx(i => Math.min(spreads.length - 1, i + 1))}
            disabled={spreadIdx >= spreads.length - 1}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition-all disabled:opacity-25 hover:opacity-70"
          >
            Next
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
}
