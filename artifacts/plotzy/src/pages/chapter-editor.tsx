import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useChapters, useUpdateChapter, useDeleteChapter } from "@/hooks/use-chapters";
import { useBook, useUpdateBook } from "@/hooks/use-books";
import { useChapterVersions, useSaveVersion, useRestoreVersion, useDeleteVersion } from "@/hooks/use-chapter-versions";
import { AIAssistant } from "@/components/ai-assistant";
import { BookCustomizer } from "@/components/book-customizer";
import { StoryBible } from "@/components/story-bible";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2, Trash2, Wand2, Palette, PlusCircle, X, FileText, Mic, Square, Eye, EyeOff, BookOpen, Image as ImageIcon, PenTool, CheckCircle2, Layers, Printer, ChevronLeft, ChevronRight, AlignCenter, History, RotateCcw, RotateCw, Clock, PanelRight, BookMarked, ChevronDown, LayoutGrid } from "lucide-react";
import { ReactSketchCanvas, type ReactSketchCanvasRef } from "react-sketch-canvas";
import { AmbientSoundscape } from "@/components/AmbientSoundscape";
import { playTypewriterSound } from "@/hooks/use-audio";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { useTheme } from "next-themes";
import { type BookPreferences } from "@/shared/schema";
import { PageStylePicker, PAGE_STYLES } from "@/components/page-style-picker";
import { queryClient } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const FONT_MAP: Record<string, string> = {
  "serif": "font-serif",
  "sans": "font-sans",
  "mono": "font-mono",
};

const FONT_STYLE_MAP: Record<string, React.CSSProperties> = {
  "eb-garamond":       { fontFamily: "'EB Garamond', serif" },
  "cormorant":         { fontFamily: "'Cormorant Garamond', serif" },
  "libre-baskerville": { fontFamily: "'Libre Baskerville', serif" },
  "lora":              { fontFamily: "'Lora', serif" },
  "merriweather":      { fontFamily: "'Merriweather', serif" },
  "source-serif":      { fontFamily: "'Source Serif 4', serif" },
  "playfair":          { fontFamily: "'Playfair Display', serif" },
  "crimson":           { fontFamily: "'Crimson Text', serif" },
  "inter":             { fontFamily: "'Inter', sans-serif" },
  "open-sans":         { fontFamily: "'Open Sans', sans-serif" },
  "poppins":           { fontFamily: "'Poppins', sans-serif" },
  "montserrat":        { fontFamily: "'Montserrat', sans-serif" },
  "plus-jakarta":      { fontFamily: "'Plus Jakarta Sans', sans-serif" },
  "space-grotesk":     { fontFamily: "'Space Grotesk', sans-serif" },
  "courier-prime":     { fontFamily: "'Courier Prime', monospace" },
  "special-elite":     { fontFamily: "'Special Elite', cursive" },
  "roboto-mono":       { fontFamily: "'Roboto Mono', monospace" },
  "space-mono":        { fontFamily: "'Space Mono', monospace" },
  "arabic-sans":       { fontFamily: "'Cairo', sans-serif" },
  "arabic-serif":      { fontFamily: "'Amiri', serif" },
  "arabic-naskh":      { fontFamily: "'Noto Naskh Arabic', serif" },
};

const LINE_HEIGHT_MAP: Record<string, string> = {
  "tight":    "1.55",
  "normal":   "1.85",
  "relaxed":  "2.15",
  "spacious": "2.55",
};

const LETTER_SPACING_MAP: Record<string, string> = {
  "tight":  "-0.02em",
  "normal": "0em",
  "wide":   "0.04em",
};

export type DrawingSize = 'small' | 'medium' | 'large' | 'full';
export type DrawingAlign = 'left' | 'center' | 'right';

export type PageBlock =
  | string
  | { type: 'text', content: string, fontFamily?: string }
  | { type: 'image', content: string }
  | { type: 'drawing', content: string, size?: DrawingSize, align?: DrawingAlign, widthPct?: number };

function parsePages(raw: string): PageBlock[] {
  if (!raw) return [""];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(item => {
        // Handle explicit block objects
        if (typeof item === 'object' && item !== null && 'type' in item) {
          return item as PageBlock;
        }
        // Fallback to string for legacy data
        return String(item);
      });
    }
  } catch { }
  return [raw];
}

function serializePages(pages: PageBlock[]): string {
  return JSON.stringify(pages);
}

// ── Fixed Page Dimensions (true A4 at 72 dpi) ────────────────────────────────
// Page card is 595px wide (A4 = 595pt wide at 72dpi — same as PDF standard).
// Horizontal margin: 76px each side → content width = 595 - 152 = 443px.
// True A4 at 72 dpi: 595 × 842 px.
// Strip heights (header + footer) ≈ 185px → content height = 842 - 185 = 657px.
const PAGE_CONTENT_HEIGHT = 657; // px — textarea height (A4 at 72dpi)
const PAGE_CONTENT_WIDTH  = 443; // px — content area inside page card (595 - 2×76)

function getPageText(block: PageBlock): string {
  if (typeof block === "string") return block;
  return block.type === "text" ? block.content : "";
}

function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/**
 * Binary-search for the character index where text height ≤ maxHeight.
 * Returns a position snapped to the nearest word/paragraph boundary.
 */
function findSplitPoint(text: string, measureEl: HTMLDivElement, maxHeight: number): number {
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    measureEl.textContent = text.slice(0, mid);
    if (measureEl.offsetHeight <= maxHeight) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  if (lo === 0) return Math.floor(text.length / 2); // safety
  // Snap to word/paragraph boundary
  const candidate = text.slice(0, lo);
  const lastNewline = candidate.lastIndexOf('\n');
  const lastSpace   = candidate.lastIndexOf(' ');
  const boundary    = Math.max(lastNewline, lastSpace);
  return boundary > lo * 0.6 ? boundary : lo; // only snap if close enough
}

/**
 * Split text into an array of page-sized chunks using measurement div.
 */
function splitIntoPages(text: string, measureEl: HTMLDivElement, maxHeight: number): string[] {
  const pages: string[] = [];
  let remaining = text;
  let safety = 0;
  while (remaining.length > 0 && safety++ < 200) {
    measureEl.textContent = remaining;
    if (measureEl.offsetHeight <= maxHeight) {
      pages.push(remaining);
      break;
    }
    const split = findSplitPoint(remaining, measureEl, maxHeight);
    pages.push(remaining.slice(0, split).trimEnd());
    remaining = remaining.slice(split).trimStart();
  }
  return pages.length > 0 ? pages : [""];
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function ChapterEditor() {
  const [, params] = useRoute("/books/:bookId/chapters/:chapterId");
  const bookId = params?.bookId ? parseInt(params.bookId) : 0;
  const chapterId = params?.chapterId ? parseInt(params.chapterId) : 0;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t, lang, isRTL } = useLanguage();
  const { resolvedTheme } = useTheme();
  const ar = lang === "ar";

  const { data: chapters, isLoading } = useChapters(bookId);
  const { data: book } = useBook(bookId);
  const updateChapter = useUpdateChapter();
  const deleteChapter = useDeleteChapter();
  const updateBook = useUpdateBook();
  const { data: versions = [] } = useChapterVersions(chapterId || null);
  const saveVersion = useSaveVersion(chapterId || null);
  const restoreVersion = useRestoreVersion(chapterId || null);
  const deleteVersion = useDeleteVersion(chapterId || null);

  const chapter = chapters?.find(c => c.id === chapterId);

  const [title, setTitle] = useState("");
  const [pages, setPages] = useState<PageBlock[]>([""]);
  const [isDirty, setIsDirty] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showStoryBible, setShowStoryBible] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showPageStylePicker, setShowPageStylePicker] = useState(false);
  const [prefs, setPrefs] = useState<BookPreferences>({});
  const [previewPrefs, setPreviewPrefs] = useState<BookPreferences | null>(null);
  // effectivePrefs — uses live preview while customizer is open, real prefs otherwise
  const effectivePrefs = previewPrefs ?? prefs;
  const [deletingPage, setDeletingPage] = useState<number | null>(null);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isPrintView, setIsPrintView] = useState(false);
  const [isTypewriterMode, setIsTypewriterMode] = useState(() =>
    localStorage.getItem("plotzy-typewriter-mode") === "true"
  );
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [restoringSnapId, setRestoringSnapId] = useState<number | null>(null);
  const [showRefPanel, setShowRefPanel] = useState(false);
  const [refChapterId, setRefChapterId] = useState<number | null>(null);
  const [refDropdownOpen, setRefDropdownOpen] = useState(false);

  // ── Inline AI Ghost-Text Suggestion ──────────────────────────────────────
  const [inlineSuggestion, setInlineSuggestion] = useState<string>("");
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionPageIdx, setSuggestionPageIdx] = useState<number>(-1);
  const suggestionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionAbortRef = useRef<AbortController | null>(null);

  // ── Pages Thumbnail Panel ─────────────────────────────────────────────────
  const [showPagePanel, setShowPagePanel] = useState(false);
  const pageElsRef = useRef<(HTMLDivElement | null)[]>([]);

  // ── Show Don't Tell ───────────────────────────────────────────────────────
  type SDTFinding = { original: string; suggestion: string; type: string };
  const [sdtFindings, setSdtFindings] = useState<SDTFinding[]>([]);
  const [sdtIndex, setSdtIndex] = useState(0);
  const [sdtLoading, setSdtLoading] = useState(false);
  const [sdtPageIdx, setSdtPageIdx] = useState<number>(-1);
  const sdtDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sdtAbortRef = useRef<AbortController | null>(null);

  const toggleTypewriterMode = () => {
    setIsTypewriterMode(v => {
      const next = !v;
      localStorage.setItem("plotzy-typewriter-mode", String(next));
      toast({
        title: next
          ? (ar ? "⌨️ وضع الآلة الكاتبة مفعّل" : "⌨️ Typewriter Mode ON")
          : (ar ? "وضع الآلة الكاتبة معطّل" : "Typewriter Mode OFF"),
        description: next
          ? (ar ? "المؤشر سيبقى في منتصف الشاشة أثناء الكتابة" : "Cursor stays centered while you type")
          : undefined,
      });
      return next;
    });
  };

  const scrollToCursorCenter = (el: HTMLTextAreaElement) => {
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 28;
    const selStart = el.selectionStart ?? 0;
    const textBefore = el.value.substring(0, selStart);
    const linesBefore = (textBefore.match(/\n/g) || []).length;
    const rect = el.getBoundingClientRect();
    const caretTop = rect.top + linesBefore * lineHeight;
    const targetY = window.scrollY + caretTop - window.innerHeight / 2 + lineHeight / 2;
    window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
  };

  const [currentSpread, setCurrentSpread] = useState(0);

  // Hidden measurement div for height-based auto-pagination
  const measureRef = useRef<HTMLDivElement>(null);

  // Rich Media State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const [showCanvas, setShowCanvas] = useState(false);
  const [canvasColor, setCanvasColor] = useState("#000000");
  const [canvasStroke, setCanvasStroke] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [drawingSize, setDrawingSize] = useState<DrawingSize>('large');
  const [selectedDrawingIdx, setSelectedDrawingIdx] = useState<number | null>(null);
  const [resizingDrawing, setResizingDrawing] = useState<{ idx: number, startX: number, startPct: number } | null>(null);

  // Voice dictation state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const printScrollRef = useRef<HTMLDivElement>(null);
  const restoredPositionRef = useRef(false);

  /* ── Print View derived state (must be before useEffects that reference maxSpread) ── */
  const printPages = pages
    .map(p => (typeof p === 'string' ? p : p.type === 'text' ? p.content : ''))
    .filter(p => p.trim().length > 0);
  const maxSpread = Math.max(0, Math.ceil(printPages.length / 2) - 1);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    };
  }, []);

  useEffect(() => {
    if (chapter && !isDirty) {
      setTitle(chapter.title);
      setPages(parsePages(chapter.content));
    }
  }, [chapter, isDirty]);

  // ── Re-paginate oversized pages after chapter loads ───────────────────────
  // Fixes old data that was saved with too-long pages (duplication bug).
  // Runs once per chapter load after the measureEl div is in the DOM.
  useEffect(() => {
    if (!chapter || isDirty) return;
    const measureEl = measureRef.current;
    if (!measureEl) return;

    // Use rAF to ensure the DOM is fully painted before measuring
    const raf = requestAnimationFrame(() => {
      setPages(prev => {
        let changed = false;
        const result: PageBlock[] = [];

        for (const block of prev) {
          const text = getPageText(block);
          const fontId = typeof block === 'string'
            ? 'eb-garamond'
            : ((block as { type: string; fontFamily?: string }).fontFamily ?? 'eb-garamond');
          const fontFamily = (FONT_STYLE_MAP[fontId] || {}).fontFamily as string | undefined;
          if (fontFamily) measureEl.style.fontFamily = fontFamily;

          measureEl.textContent = text;
          if (measureEl.offsetHeight > PAGE_CONTENT_HEIGHT) {
            const chunks = splitIntoPages(text, measureEl, PAGE_CONTENT_HEIGHT);
            for (const chunk of chunks) {
              result.push({ type: 'text', content: chunk, fontFamily: fontId || undefined } as PageBlock);
            }
            changed = true;
          } else {
            result.push(block);
          }
        }

        return changed ? result : prev;
      });
    });

    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter?.id]);

  /* ── Print View: scroll to top when opened ── */
  useEffect(() => {
    if (isPrintView && printScrollRef.current) {
      printScrollRef.current.scrollTop = 0;
    }
  }, [isPrintView]);

  /* ── Print View keyboard navigation ── */
  useEffect(() => {
    if (!isPrintView) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        setCurrentSpread(s => Math.min(maxSpread, s + 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setCurrentSpread(s => Math.max(0, s - 1));
      } else if (e.key === "Escape") {
        setIsPrintView(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isPrintView, maxSpread]);

  useEffect(() => {
    if (book?.bookPreferences) setPrefs(book.bookPreferences as BookPreferences);
  }, [book]);

  useEffect(() => {
    if (showCanvas && canvasRef.current) {
      canvasRef.current.eraseMode(isEraser);
    }
  }, [isEraser, showCanvas]);

  useEffect(() => {
    if (!resizingDrawing) return;
    const { idx, startX, startPct } = resizingDrawing;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      const newPct = Math.max(20, Math.min(100, startPct + (dx / 508) * 100));
      setPages(prev => {
        const next = [...prev];
        const block = next[idx];
        if (typeof block !== 'string' && block.type === 'drawing') {
          next[idx] = { ...block, widthPct: Math.round(newPct) };
        }
        return next;
      });
      setIsDirty(true);
    };
    const onUp = () => setResizingDrawing(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [resizingDrawing]);

  // ── Last-read position: save & restore per chapter ─────────────────────
  const lastPageStorageKey = (id: number) => `plotzy_last_page_${id}`;

  // Reset restored flag whenever we switch chapters
  useEffect(() => {
    restoredPositionRef.current = false;
    setActivePageIndex(0);
  }, [chapterId]);

  // After pages are loaded, scroll to the last-visited page
  useEffect(() => {
    if (!chapterId || pages.length === 0 || restoredPositionRef.current) return;
    const saved = localStorage.getItem(lastPageStorageKey(chapterId));
    if (!saved) {
      // No saved position — mark done so save-effect can begin
      restoredPositionRef.current = true;
      return;
    }
    const idx = parseInt(saved, 10);
    if (isNaN(idx) || idx <= 0) {
      restoredPositionRef.current = true;
      return;
    }
    // Pages haven't fully loaded yet — wait for next pages.length change
    if (idx >= pages.length) return;
    // Pages loaded and idx is valid — restore position
    restoredPositionRef.current = true;
    setActivePageIndex(idx);
    requestAnimationFrame(() => {
      setTimeout(() => {
        pageElsRef.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    });
  }, [chapterId, pages.length]);

  // Save current page whenever the active page changes (only after restore is done)
  useEffect(() => {
    if (!chapterId || !restoredPositionRef.current) return;
    localStorage.setItem(lastPageStorageKey(chapterId), String(activePageIndex));
  }, [chapterId, activePageIndex]);

  // ── Inline ghost-text suggestion: debounce → AI → show ─────────────────
  useEffect(() => {
    // Clear any pending suggestion immediately when active page changes
    setInlineSuggestion("");
    setSuggestionPageIdx(-1);

    const currentText = getPageText(pages[activePageIndex] ?? "").trim();
    if (currentText.split(/\s+/).filter(Boolean).length < 5) return; // need ≥5 words

    // Cancel previous debounce
    if (suggestionDebounceRef.current) clearTimeout(suggestionDebounceRef.current);

    // Debounce 1.6 s of inactivity
    suggestionDebounceRef.current = setTimeout(async () => {
      // Cancel any in-flight request
      if (suggestionAbortRef.current) suggestionAbortRef.current.abort();
      suggestionAbortRef.current = new AbortController();

      setSuggestionLoading(true);
      try {
        const res = await fetch("/api/continue-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: currentText, language: lang, bookId }),
          credentials: "include",
          signal: suggestionAbortRef.current.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        const raw: string = data.continuedText || "";
        // Take up to first ~12 words as the inline hint
        const words = raw.trim().split(/\s+/).slice(0, 24).join(" ");
        if (words) {
          setInlineSuggestion(words);
          setSuggestionPageIdx(activePageIndex);
        }
      } catch {
        // aborted or network error — ignore
      } finally {
        setSuggestionLoading(false);
      }
    }, 1600);

    return () => {
      if (suggestionDebounceRef.current) clearTimeout(suggestionDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages[activePageIndex], activePageIndex]);

  // ── Show Don't Tell: debounce → AI → highlight ───────────────────────────
  useEffect(() => {
    setSdtFindings([]);
    setSdtIndex(0);
    setSdtPageIdx(-1);

    const currentText = getPageText(pages[activePageIndex] ?? "").trim();
    if (currentText.split(/\s+/).filter(Boolean).length < 20) return;

    if (sdtDebounceRef.current) clearTimeout(sdtDebounceRef.current);

    sdtDebounceRef.current = setTimeout(async () => {
      if (sdtAbortRef.current) sdtAbortRef.current.abort();
      sdtAbortRef.current = new AbortController();

      setSdtLoading(true);
      try {
        const res = await fetch("/api/show-dont-tell", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: currentText, language: lang }),
          credentials: "include",
          signal: sdtAbortRef.current.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        const findings: SDTFinding[] = data.findings || [];
        if (findings.length > 0) {
          setSdtFindings(findings);
          setSdtIndex(0);
          setSdtPageIdx(activePageIndex);
        }
      } catch {
        // aborted or network error — ignore
      } finally {
        setSdtLoading(false);
      }
    }, 4000);

    return () => {
      if (sdtDebounceRef.current) clearTimeout(sdtDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages[activePageIndex], activePageIndex]);

  // ── Lock all page textareas to the fixed page height ──────────────────────
  // Overflow is handled by the pagination system (handlePageChange), not by
  // letting the textarea grow. Keeping a fixed height preserves the page metaphor.
  useLayoutEffect(() => {
    document.querySelectorAll<HTMLTextAreaElement>('[data-page-textarea]').forEach(ta => {
      ta.style.height = `${PAGE_CONTENT_HEIGHT}px`;
    });
  }, [pages, effectivePrefs.fontSize, effectivePrefs.lineHeight, effectivePrefs.letterSpacing]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!chapter) {
    return <div className="text-center py-20">{ar ? "الفصل غير موجود." : "Chapter not found."}</div>;
  }

  const handlePageChange = (index: number, value: string) => {
    const measureEl = measureRef.current;
    // Helper: stamp the active font into a block when the user first types in it
    const stampBlock = (cur: PageBlock, text: string): PageBlock => {
      if (typeof cur === 'string') {
        // Legacy string block → convert to text block and freeze the APPLIED font
        // (never the live-preview font — existing text must not shift)
        return { type: 'text', content: text, fontFamily: prefs.fontFamily || 'eb-garamond' };
      }
      if (cur.type === 'text') {
        // Already a text block — preserve its stored font, just update content
        return { ...cur, content: text };
      }
      return cur; // drawing / image — shouldn't happen here
    };

    if (!measureEl) {
      setPages(prev => {
        const next = [...prev];
        next[index] = stampBlock(next[index], value);
        return next;
      });
      setIsDirty(true);
      return;
    }

    // Sync measureEl font to the actual block font for accurate measurement
    const blockFontIdForMeasure = typeof pages[index] === 'string'
      ? (prefs.fontFamily || 'eb-garamond')
      : ((pages[index] as { type: string; fontFamily?: string }).fontFamily ?? (prefs.fontFamily || 'eb-garamond'));
    const blockFontFamilyForMeasure = (FONT_STYLE_MAP[blockFontIdForMeasure] || {}).fontFamily;
    if (blockFontFamilyForMeasure) measureEl.style.fontFamily = blockFontFamilyForMeasure;

    // Measure the full text height
    measureEl.textContent = value;
    const textHeight = measureEl.offsetHeight;

    if (textHeight <= PAGE_CONTENT_HEIGHT) {
      setPages(prev => {
        const next = [...prev];
        next[index] = stampBlock(next[index], value);
        return next;
      });
      setIsDirty(true);
      return;
    }

    // Overflow — collect text from this page + all subsequent pages, re-split cleanly
    const blockFont = typeof pages[index] === 'string'
      ? (prefs.fontFamily || 'eb-garamond')
      : ((pages[index] as { type: string; fontFamily?: string }).fontFamily ?? (prefs.fontFamily || 'eb-garamond'));

    setPages(prev => {
      const next = [...prev];

      // Gather all text from the current page onwards (avoids duplication)
      const allParts: string[] = [value];
      for (let j = index + 1; j < next.length; j++) {
        const t = getPageText(next[j]);
        if (t.trim()) allParts.push(t);
      }
      const allText = allParts.join('\n');

      // Re-split the combined text
      const chunks = splitIntoPages(allText, measureEl, PAGE_CONTENT_HEIGHT);

      // Distribute chunks starting from the current page
      for (let i = 0; i < chunks.length; i++) {
        const targetIndex = index + i;
        if (targetIndex < next.length) {
          const cur = next[targetIndex];
          if (i === 0) {
            // First chunk: preserve font stamp on current page
            if (typeof cur === 'string') {
              next[targetIndex] = { type: 'text', content: chunks[0], fontFamily: blockFont || undefined };
            } else if (cur.type === 'text') {
              next[targetIndex] = { ...cur, content: chunks[0] };
            } else {
              next[targetIndex] = chunks[0] as PageBlock;
            }
          } else {
            next[targetIndex] = { type: 'text', content: chunks[i], fontFamily: blockFont || undefined } as PageBlock;
          }
        } else {
          next.push({ type: 'text', content: chunks[i], fontFamily: blockFont || undefined } as PageBlock);
        }
      }

      return next;
    });

    setIsDirty(true);

    // Move cursor to next page
    setTimeout(() => {
      const textareas = document.querySelectorAll<HTMLTextAreaElement>("[data-page-textarea]");
      const target = textareas[index + 1];
      if (target) {
        target.focus();
        try { target.setSelectionRange(0, 0); } catch { /* ok */ }
      }
    }, 60);
  };

  const handleAddPage = () => {
    setPages(prev => [...prev, ""]);
    setIsDirty(true);
    setTimeout(() => {
      const textareas = document.querySelectorAll("[data-page-textarea]");
      const last = textareas[textareas.length - 1] as HTMLTextAreaElement | null;
      last?.focus();
    }, 50);
  };

  const handleDeletePage = (index: number) => {
    if (pages.length <= 1) return;
    setPages(pages.filter((_, i) => i !== index));
    setIsDirty(true);
    setDeletingPage(null);
    if (activePageIndex >= index && activePageIndex > 0) setActivePageIndex(activePageIndex - 1);
  };

  const handleSave = async () => {
    try {
      const currentContent = serializePages(pages);

      // Calculate word count difference for daily tracking (excluding JSON artifacts)
      const previousContent = chapter?.content || "";
      const previousPages = parsePages(previousContent);
      const previousText = previousPages.map(p => typeof p === 'string' ? p : p.type === 'text' ? p.content : '').join(" ").trim();
      const previousWords = previousText ? previousText.split(/\s+/).length : 0;

      const newText = pages.map(p => typeof p === 'string' ? p : p.type === 'text' ? p.content : '').join(" ").trim();
      const newWords = newText ? newText.split(/\s+/).length : 0;

      const wordsAdded = newWords - previousWords;

      await updateChapter.mutateAsync({ id: chapterId, bookId, title, content: currentContent });

      // Auto-save a version snapshot on every manual save
      const now = new Date();
      const label = `${now.toLocaleDateString(ar ? "ar" : "en", { month: "short", day: "numeric" })} ${now.toLocaleTimeString(ar ? "ar" : "en", { hour: "2-digit", minute: "2-digit" })}`;
      saveVersion.mutate({ content: currentContent, label });

      // Track progress if there's a net change in words
      if (wordsAdded !== 0) {
        fetch(`/api/books/${bookId}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wordsAdded })
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: [`/api/books/${bookId}/progress`] });
        }).catch(err => console.error("Failed to track progress:", err));
      }

      setIsDirty(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      toast({ title: ar ? "تم الحفظ!" : "Saved successfully" });
    } catch {
      toast({ title: ar ? "فشل الحفظ" : "Failed to save", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteChapter.mutateAsync({ id: chapterId, bookId });
      toast({ title: ar ? "تم حذف الفصل" : "Chapter deleted" });
      navigate(`/books/${bookId}`);
    } catch {
      toast({ title: ar ? "فشل الحذف" : "Failed to delete", variant: "destructive" });
    }
  };

  const handleSavePrefs = async (newPrefs: BookPreferences) => {
    const newFont = newPrefs.fontFamily;
    // The font that existing unfrozen blocks are currently RENDERED with
    // (fall back to "eb-garamond" if never explicitly set).
    const currentRenderedFont = prefs.fontFamily || 'eb-garamond';

    // Freeze the current rendered font into every unfrozen text block whenever
    // the global font is changing, so those blocks never inherit the new font.
    // We run this unconditionally (even when oldFont was undefined) so that
    // blocks written before the font system existed are locked in correctly.
    if (newFont && currentRenderedFont !== newFont) {
      setPages(prev => prev.map(block => {
        if (typeof block === 'string' && block.trim()) {
          // Plain string → promote to typed block and freeze font
          return { type: 'text' as const, content: block, fontFamily: currentRenderedFont };
        }
        if (typeof block !== 'string' && block.type === 'text' && !block.fontFamily) {
          // Text block without a frozen font → freeze it now
          return { ...block, fontFamily: currentRenderedFont };
        }
        return block;
      }));
    }
    setPreviewPrefs(null);
    setPrefs(newPrefs);
    setIsDirty(true);
    await updateBook.mutateAsync({ id: bookId, bookPreferences: newPrefs });
  };

  // ── Voice dictation ──────────────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        setRecordingTime(0);
        setIsTranscribing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
          });
          const res = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: base64, language: book?.language || lang }),
            credentials: "include",
          });
          if (!res.ok) throw new Error("Transcription failed");
          const { text } = await res.json();
          if (text?.trim()) {
            setPages(prev => {
              const next = [...prev];
              const idx = activePageIndex < next.length ? activePageIndex : next.length - 1;
              const currentBlock = next[idx];

              if (typeof currentBlock === 'string') {
                next[idx] = currentBlock ? currentBlock + " " + text.trim() : text.trim();
              } else if (typeof currentBlock === 'object' && currentBlock.type === 'text') {
                next[idx] = { ...currentBlock, content: currentBlock.content ? currentBlock.content + " " + text.trim() : text.trim() };
              } else {
                // If active block is an image/drawing, insert dictation as a new string block after it
                next.splice(idx + 1, 0, text.trim());
                setActivePageIndex(idx + 1);
              }
              return next;
            });
            setIsDirty(true);
            toast({ title: ar ? "تمت الإضافة إلى الصفحة" : "Added to your page" });
          }
        } catch {
          toast({ title: ar ? "فشل التحويل" : "Transcription failed", variant: "destructive" });
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      toast({ title: ar ? "تعذر الوصول إلى الميكروفون" : "Could not access microphone", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // ── Rich Media Handling ───────────────────────────────────────────────────

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPages(prev => {
        const next = [...prev];
        // Insert image block after current active text block, or replace empty block
        const currentBlock = next[activePageIndex];
        if (typeof currentBlock === 'string' && !currentBlock.trim() && pages.length === 1) {
          next[activePageIndex] = { type: 'image', content: base64 };
        } else {
          next.splice(activePageIndex + 1, 0, { type: 'image', content: base64 });
          // add an empty text block after the image so they can keep typing
          next.splice(activePageIndex + 2, 0, "");
          setTimeout(() => setActivePageIndex(activePageIndex + 2), 50);
        }
        return next;
      });
      setIsDirty(true);
    };
    reader.readAsDataURL(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveDrawing = async () => {
    if (!canvasRef.current) return;
    try {
      const base64 = await canvasRef.current.exportImage("png");
      setPages(prev => {
        const next = [...prev];
        const currentBlock = next[activePageIndex];
        const block: PageBlock = { type: 'drawing', content: base64, size: drawingSize };
        if (typeof currentBlock === 'string' && !currentBlock.trim() && pages.length === 1) {
          next[activePageIndex] = block;
        } else {
          next.splice(activePageIndex + 1, 0, block);
          next.splice(activePageIndex + 2, 0, "");
          setTimeout(() => setActivePageIndex(activePageIndex + 2), 50);
        }
        return next;
      });
      setIsDirty(true);
      setShowCanvas(false);
      setIsEraser(false);
      canvasRef.current.clearCanvas();
    } catch (e) {
      console.error(e);
      toast({ title: ar ? "فشل حفظ الرسم" : "Failed to save drawing", variant: "destructive" });
    }
  };

  const updateDrawingBlock = (idx: number, updates: Partial<{ size: DrawingSize; align: DrawingAlign; widthPct: number }>) => {
    setPages(prev => {
      const next = [...prev];
      const block = next[idx];
      if (typeof block !== 'string' && block.type === 'drawing') {
        next[idx] = { ...block, ...updates };
      }
      return next;
    });
    setIsDirty(true);
  };

  // ────────────────────────────────────────────────────────────────────────────

  const fontClass = FONT_MAP[effectivePrefs.fontFamily || "serif"] || "";
  const fontStyle = FONT_STYLE_MAP[effectivePrefs.fontFamily || ""] || {};
  const isArabicFont = effectivePrefs.fontFamily?.startsWith("arabic");
  const textDir = (isArabicFont || ar) ? "rtl" : "ltr";
  const isDark = resolvedTheme === "dark";

  // Page style background pattern (from saved preference)
  const activePageStyleDef = PAGE_STYLES.find(s => s.id === (effectivePrefs.pageStyle || "blank"));
  const bgPatternCSS = activePageStyleDef ? activePageStyleDef.background(isDark) : {};

  // Manuscript uses its own background color unless user has set a custom one
  const resolvedBgColor = effectivePrefs.bgColor || (bgPatternCSS as any).backgroundColor;

  const editorOuterStyle: React.CSSProperties = {
    backgroundColor: resolvedBgColor || "hsl(var(--background))",
    backgroundImage: (bgPatternCSS as any).backgroundImage,
    backgroundSize: (bgPatternCSS as any).backgroundSize,
    backgroundAttachment: "local",
  };

  const pageStyle: React.CSSProperties = {
    color: effectivePrefs.textColor || undefined,
    ...fontStyle,
  };
  const totalWords = pages.map(getPageText).join(" ").split(/\s+/).filter(Boolean).length;

  /* ── Reference Panel ── */
  const otherChapters = chapters?.filter(c => c.id !== chapterId) ?? [];
  const refChapter = otherChapters.find(c => c.id === refChapterId) ?? null;
  const refParsedPages = refChapter ? parsePages(refChapter.content) : [];
  const refFullText = refParsedPages
    .map(p => (typeof p === 'string' ? p : p.type === 'text' ? p.content : ''))
    .filter(p => p.trim())
    .join('\n\n');
  const refWordCount = refFullText.split(/\s+/).filter(Boolean).length;

  const renderPageContent = (text: string, isFirstPage: boolean) => {
    const paragraphs = text.split(/\n+/).filter(p => p.trim());
    if (!paragraphs.length) return <p style={{ color: 'rgba(17,17,17,0.25)', fontStyle: 'italic' }}>Empty page…</p>;
    return paragraphs.map((para, i) => {
      if (isFirstPage && i === 0 && para.length > 0) {
        return (
          <p key={i} style={{ marginBottom: '1.1em', lineHeight: '1.72' }}>
            <span style={{
              float: 'left', fontSize: '4.8em', lineHeight: '0.72',
              paddingRight: '0.09em', paddingTop: '0.07em',
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontWeight: 700, color: '#111111',
            }}>
              {para.charAt(0)}
            </span>
            {para.slice(1)}
          </p>
        );
      }
      return (
        <p key={i} style={{ textIndent: i === 0 ? 0 : '1.5em', marginBottom: '0.85em', lineHeight: '1.72' }}>
          {para}
        </p>
      );
    });
  };

  return (
    <div
      className="flex flex-col h-screen overflow-hidden transition-all duration-700"
      style={{ backgroundColor: "#000" }}
    >
      {/* Subtle vignette in focus mode */}
      {isFocusMode && (
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.7)_100%)] z-[1]" />
      )}

      {/* Typewriter Mode — fixed center guide line */}
      {isTypewriterMode && (
        <div className="fixed inset-x-0 pointer-events-none z-40 flex flex-col items-center" style={{ top: "50vh" }}>
          <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="h-[2px] w-full" style={{ background: "linear-gradient(90deg, transparent 0%, #f59e0b 15%, #f59e0b 85%, transparent 100%)", opacity: 0.45 }} />
          </div>
          <span className="mt-1.5 text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full" style={{ color: "#f59e0b", opacity: 0.6, background: "rgba(245,158,11,0.08)" }}>
            ⌨ Typewriter
          </span>
        </div>
      )}

      {/* Editor Header */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-xl border-b border-border/30 transition-opacity duration-500 ${isFocusMode ? "opacity-20 hover:opacity-100 bg-black/40 border-transparent" : ""}`}
        style={{ backgroundColor: isFocusMode ? undefined : resolvedBgColor ? `${resolvedBgColor}cc` : "rgba(255,255,255,0.85)" }}
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-5 h-12 flex items-center justify-between relative z-10 gap-2">

          {/* ── Left: Back + stats ── */}
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/books/${bookId}`} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors group shrink-0">
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform rtl-flip" />
              <span className="hidden sm:block">{t("backToBook")}</span>
            </Link>
            <span className="text-[10px] text-muted-foreground/40 hidden sm:block whitespace-nowrap">
              {pages.length} {ar ? (pages.length === 1 ? "صفحة" : "صفحات") : (pages.length === 1 ? "pg" : "pgs")}
              {" · "}{totalWords} {ar ? "كلمة" : "w"}
            </span>
          </div>

          {/* ── Center: tool icons ── */}
          <div className="flex items-center gap-0.5 flex-1 justify-center">

            {/* Undo / Redo */}
            <Button
              variant="ghost" size="icon"
              className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              title={ar ? "تراجع (Ctrl+Z)" : "Undo (Ctrl+Z)"}
              onMouseDown={(e) => { e.preventDefault(); document.execCommand("undo"); }}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              title={ar ? "إعادة (Ctrl+Y)" : "Redo (Ctrl+Y)"}
              onMouseDown={(e) => { e.preventDefault(); document.execCommand("redo"); }}
            >
              <RotateCw className="w-4 h-4" />
            </Button>

            <div className="w-px h-5 bg-border/40 mx-1" />

            {/* Voice */}
            {isTranscribing ? (
              <div className="flex items-center gap-1 px-2 h-7 rounded-lg bg-primary/10 text-primary text-[10px] font-medium">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="hidden sm:block">{ar ? "جارٍ..." : "…"}</span>
              </div>
            ) : isRecording ? (
              <button
                onClick={stopRecording}
                className="flex items-center gap-1 px-2 h-7 rounded-lg bg-red-500 text-white text-[10px] font-medium hover:bg-red-600 transition-colors animate-pulse"
                title={ar ? "إيقاف التسجيل" : "Stop recording"}
                data-testid="button-stop-recording"
              >
                <Square className="w-3 h-3 fill-current" />
                <span className="font-mono">{formatTime(recordingTime)}</span>
              </button>
            ) : (
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors text-muted-foreground" onClick={startRecording} title={ar ? "تسجيل صوتي" : "Voice dictation"} data-testid="button-start-recording">
                <Mic className="w-4 h-4" />
              </Button>
            )}

            <Button variant="ghost" size="icon" className={`w-8 h-8 rounded-lg transition-colors hidden sm:flex ${showPagePanel ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"}`} onClick={() => setShowPagePanel(v => !v)} title={ar ? "استعراض الصفحات" : "Page Navigator"}>
              <LayoutGrid className="w-4 h-4" />
            </Button>

            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors hidden sm:flex" onClick={() => setShowStoryBible(true)} title={ar ? "الكتاب المقدس للقصة" : "Story Bible"}>
              <BookOpen className="w-4 h-4" />
            </Button>

            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors hidden md:flex" onClick={() => fileInputRef.current?.click()} title={ar ? "إدراج صورة" : "Insert Image"}>
              <ImageIcon className="w-4 h-4" />
            </Button>

            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors hidden md:flex" onClick={() => setShowCanvas(true)} title={ar ? "رسم حر" : "Draw sketch"}>
              <PenTool className="w-4 h-4" />
            </Button>

            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors hidden sm:flex" onClick={() => setShowCustomizer(true)} title={t("settings")}>
              <Palette className="w-4 h-4" />
            </Button>

            {/* Page Style */}
            <div className="relative hidden sm:block">
              <Button
                variant="ghost" size="icon"
                className={`w-8 h-8 rounded-lg transition-colors ${showPageStylePicker || (prefs.pageStyle && prefs.pageStyle !== "blank") ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}
                onClick={() => setShowPageStylePicker(v => !v)}
                title="Page Style"
              >
                <Layers className="w-4 h-4" />
              </Button>
              {showPageStylePicker && (
                <PageStylePicker
                  currentStyle={prefs.pageStyle || "blank"}
                  isDark={isDark}
                  onSelect={(styleId) => { const newPrefs = { ...prefs, pageStyle: styleId }; setPrefs(newPrefs); handleSavePrefs(newPrefs); }}
                  onClose={() => setShowPageStylePicker(false)}
                />
              )}
            </div>

            <div className="w-px h-5 bg-border/40 mx-1 hidden sm:block" />

            <AmbientSoundscape />

            <Button variant="ghost" size="icon" className={`w-8 h-8 rounded-lg transition-colors hidden sm:flex ${showRefPanel ? "text-sky-500 bg-sky-500/10" : "text-muted-foreground hover:bg-sky-500/10 hover:text-sky-500"}`} onClick={() => { setShowRefPanel(v => !v); if (!refChapterId && otherChapters.length > 0) setRefChapterId(otherChapters[0].id); }} title={ar ? "عرض مرجعي" : "Reference Mode"}>
              <PanelRight className="w-4 h-4" />
            </Button>

            <Button variant="ghost" size="icon" className={`w-8 h-8 rounded-lg transition-colors ${isPrintView ? "text-foreground bg-foreground/10" : "text-muted-foreground hover:bg-foreground/10 hover:text-foreground"}`} onClick={() => { setIsPrintView(v => !v); setCurrentSpread(0); }} title={ar ? "معاينة الطباعة" : "Print View"}>
              <Printer className="w-4 h-4" />
            </Button>

            <Button variant="ghost" size="icon" className={`w-8 h-8 rounded-lg transition-colors ${isTypewriterMode ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500"}`} onClick={toggleTypewriterMode} title={ar ? "وضع الآلة الكاتبة" : "Typewriter Mode"}>
              <AlignCenter className="w-4 h-4" />
            </Button>

            <Button variant="ghost" size="icon" className={`w-8 h-8 rounded-lg transition-colors ${isFocusMode ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"}`} onClick={() => setIsFocusMode(!isFocusMode)} title={ar ? "وضع التركيز" : "Focus Mode"}>
              {isFocusMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl" dir={isRTL ? "rtl" : "ltr"}>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl">{t("deleteChapter")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("deleteChapterConfirm")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-lg">{t("cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg">{t("delete")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="w-px h-5 bg-border/40 mx-1" />

            <Button variant="ghost" size="icon" className={`w-8 h-8 rounded-lg transition-colors relative ${showVersionHistory ? "text-violet-500 bg-violet-500/10" : "text-muted-foreground hover:bg-violet-500/10 hover:text-violet-500"}`} onClick={() => setShowVersionHistory(v => !v)} title={ar ? "سجل الإصدارات" : "Version History"}>
              <History className="w-4 h-4" />
              {versions.length > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-violet-500" />}
            </Button>
          </div>

          {/* ── Right: AI + Save ── */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              className="h-8 px-3 rounded-lg text-xs font-semibold gap-1.5 hidden sm:flex items-center transition-all hover:opacity-90 hover:-translate-y-px active:translate-y-0"
              style={{ background: "linear-gradient(135deg, #d4a017 0%, #f5c518 50%, #e8a020 100%)", color: "#5a3a00", boxShadow: "0 2px 8px rgba(212,160,23,0.45)" }}
              onClick={() => setShowAI(true)}
              data-testid="button-ai-assistant"
            >
              <Wand2 className="w-3.5 h-3.5" />
              {t("aiAssistant")}
            </button>

            <button
              className={`h-8 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                justSaved
                  ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 cursor-default"
                  : updateChapter.isPending
                    ? "bg-primary/80 text-white cursor-wait"
                    : "bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-px"
              }`}
              onClick={updateChapter.isPending || justSaved ? undefined : handleSave}
              disabled={updateChapter.isPending}
              data-testid="button-save"
            >
              {updateChapter.isPending
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{t("saving")}</>
                : justSaved
                  ? <><CheckCircle2 className="w-3.5 h-3.5" />{ar ? "محفوظ" : "Saved"}</>
                  : <><Save className="w-3.5 h-3.5" />{t("save")}</>
              }
            </button>
          </div>

        </div>
      </header>

      {/* Body: editor + reference panel side by side */}
      <div className="flex flex-1 overflow-hidden relative z-10">

      {/* ── Pages Thumbnail Sidebar ── */}
      {showPagePanel && !isPrintView && (
        <div
          className="flex-shrink-0 overflow-y-auto flex flex-col items-center gap-2 py-3 px-2 border-r"
          style={{
            width: '92px',
            background: 'rgba(0,0,0,0.7)',
            borderColor: 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span className="text-[9px] font-semibold tracking-widest uppercase mb-1 opacity-30" style={{ color: '#fff' }}>
            {ar ? "الصفحات" : "Pages"}
          </span>
          {pages.map((pageContent, index) => {
            const pageText = getPageText(pageContent);
            const isActive = activePageIndex === index;
            const pageBg = isFocusMode ? '#18181b' : (effectivePrefs.bgColor || '#ffffff');
            const pageColor = isFocusMode ? '#a1a1aa' : (effectivePrefs.textColor || '#18181b');
            return (
              <button
                key={index}
                onClick={() => {
                  setActivePageIndex(index);
                  pageElsRef.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="w-full flex-shrink-0 rounded-sm overflow-hidden transition-all duration-150 relative"
                style={{
                  height: '100px',
                  background: pageBg,
                  outline: isActive ? '2px solid rgba(99,102,241,0.8)' : '1px solid rgba(255,255,255,0.08)',
                  outlineOffset: isActive ? '1px' : '0px',
                  opacity: isActive ? 1 : 0.55,
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {/* Mini text preview */}
                <div
                  className="absolute inset-0 p-1.5 overflow-hidden text-left"
                  style={{
                    fontSize: '4px',
                    lineHeight: '6px',
                    color: pageColor,
                    fontFamily: FONT_STYLE_MAP[prefs.fontFamily || '']?.fontFamily || 'serif',
                    userSelect: 'none',
                  }}
                >
                  {pageText.slice(0, 200)}
                </div>
                {/* Page number badge */}
                <div
                  className="absolute bottom-0 inset-x-0 flex items-center justify-center py-0.5"
                  style={{ background: isActive ? 'rgba(99,102,241,0.6)' : 'rgba(0,0,0,0.35)' }}
                >
                  <span className="text-[8px] font-semibold" style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                    {index + 1}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Editor Canvas — book-desk background */}
      <main
        className="flex-1 overflow-y-auto relative py-10 md:py-14 transition-colors duration-700"
        style={{
          background: "transparent",
          paddingBottom: isTypewriterMode ? "50vh" : undefined,
        }}
      >
        {/* Chapter Title — above all pages */}
        <div className="max-w-[595px] mx-auto px-4 mb-8">
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
            placeholder={ar ? "عنوان الفصل..." : "Chapter Title"}
            className={`w-full bg-transparent text-4xl md:text-5xl font-bold outline-none placeholder:text-muted-foreground/20 focus:ring-0 pb-3 border-b border-border/20 transition-colors duration-300 ${fontClass}`}
            style={{ ...fontStyle, color: '#f4f4f5', direction: textDir }}
            dir={textDir}
            onKeyDown={(e) => {
              if (e.key.length === 1 || e.key === "Backspace" || e.key === "Enter" || e.key === " ") {
                playTypewriterSound(isFocusMode);
                if (isTypewriterMode) scrollToCursorCenter(e.currentTarget as HTMLTextAreaElement);
              }
            }}
          />
        </div>

        {/* Pages — each rendered as a fixed-size book page card */}
        <div className="flex flex-col items-center gap-10 px-4" onClick={() => setSelectedDrawingIdx(null)}>
          {pages.map((pageContent, index) => {
            const pageText = getPageText(pageContent);
            const pageWords = countWords(pageText);

            return (
              <div key={index} className="relative group w-full max-w-[595px]" ref={el => { pageElsRef.current[index] = el; }}>

                {/* Book Page Card */}
                <div
                  className="relative rounded-sm overflow-hidden"
                  style={{
                    width: "100%",
                    backgroundColor: isFocusMode
                      ? "rgba(18,18,22,0.96)"
                      : resolvedBgColor || (isDark ? "#1c1c1e" : "#fefefe"),
                    backgroundImage: isFocusMode ? undefined : (bgPatternCSS as any).backgroundImage,
                    backgroundSize: isFocusMode ? undefined : (bgPatternCSS as any).backgroundSize,
                    backgroundAttachment: "local",
                    boxShadow: activePageIndex === index
                      ? "0 4px 6px -1px rgba(0,0,0,0.08), 0 20px 60px -10px rgba(0,0,0,0.18), 0 0 0 1.5px hsl(var(--primary)/30%)"
                      : "0 2px 4px -1px rgba(0,0,0,0.06), 0 12px 40px -8px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
                    transition: "box-shadow 0.2s ease",
                  }}
                  onClick={() => setActivePageIndex(index)}
                >
                  {/* Page top strip — chapter label + delete button */}
                  <div className="flex items-center justify-between px-[76px] pt-6 pb-2 select-none" dir="ltr">
                    <span className="text-[9px] tracking-[0.18em] uppercase opacity-20 font-semibold" style={{ color: effectivePrefs.textColor || undefined }}>
                      {ar ? `فصل · صفحة ${index + 1}` : `Chapter · Page ${index + 1}`}
                    </span>
                    <div className="flex items-center gap-2">
                      {activePageIndex === index && isRecording && (
                        <span className="text-red-400 text-[10px] font-medium animate-pulse">● REC</span>
                      )}
                      {pages.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeletingPage(index); }}
                          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          title={ar ? "حذف الصفحة" : "Delete page"}
                          data-testid={`button-delete-page-${index}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Thin decorative line under header */}
                  <div className="mx-[76px] h-px opacity-8" style={{ background: effectivePrefs.textColor || "currentColor" }} />

                  {/* Page Content Area */}
                  <div
                    className="px-[76px] py-10 cursor-text"
                    onClick={(e) => {
                      const ta = (e.currentTarget as HTMLElement).querySelector<HTMLTextAreaElement>('[data-page-textarea]');
                      if (ta && e.target === e.currentTarget) {
                        ta.focus();
                        ta.setSelectionRange(ta.value.length, ta.value.length);
                      }
                    }}
                  >
                    {typeof pageContent === 'string' || pageContent.type === 'text' ? (() => {
                        // Per-block font: use the font frozen in this block if available,
                        // otherwise fall back to the SAVED (applied) global font — never
                        // the live-preview font, so existing text never shifts while browsing fonts.
                        const blockFontId = (typeof pageContent !== 'string' && pageContent.fontFamily)
                          ? pageContent.fontFamily
                          : (prefs.fontFamily || 'eb-garamond');
                        const blockFontStyle = FONT_STYLE_MAP[blockFontId] || fontStyle;
                        const blockFontClass = FONT_MAP[blockFontId] || fontClass;
                        return (
                      <textarea
                        value={typeof pageContent === 'string' ? pageContent : pageContent.content}
                        onChange={(e) => {
                          // Immediately resize to show all content (prevents hidden text)
                          const ta = e.currentTarget;
                          ta.style.height = '1px';
                          ta.style.height = `${Math.max(PAGE_CONTENT_HEIGHT, ta.scrollHeight)}px`;
                          handlePageChange(index, e.target.value);
                        }}
                        onFocus={() => setActivePageIndex(index)}
                        placeholder={index === 0
                          ? (ar ? "ابدأ بكتابة فصلك هنا..." : "Start writing your chapter here...")
                          : (ar ? "تابع قصتك..." : "Continue your story...")}
                        className={`w-full bg-transparent outline-none resize-none ${effectivePrefs.fontSize || "text-lg"} placeholder:opacity-20 focus:ring-0 transition-colors duration-700 ${blockFontClass}`}
                        style={{
                          ...blockFontStyle,
                          color: isFocusMode ? '#e4e4e7' : effectivePrefs.textColor || undefined,
                          direction: textDir,
                          minHeight: `${PAGE_CONTENT_HEIGHT}px`,
                          height: `${PAGE_CONTENT_HEIGHT}px`,
                          overflow: "hidden",
                          lineHeight: LINE_HEIGHT_MAP[effectivePrefs.lineHeight || "normal"] || "1.85",
                          letterSpacing: LETTER_SPACING_MAP[effectivePrefs.letterSpacing || "normal"] || "0em",
                        } as React.CSSProperties}
                        dir={textDir}
                        data-page-textarea
                        data-testid={`textarea-page-${index}`}
                        onKeyDown={(e) => {
                          // Tab → accept inline suggestion
                          if (e.key === "Tab" && inlineSuggestion && suggestionPageIdx === index) {
                            e.preventDefault();
                            const current = getPageText(pageContent);
                            const accepted = current.trimEnd() + " " + inlineSuggestion;
                            handlePageChange(index, accepted);
                            setInlineSuggestion("");
                            setSuggestionPageIdx(-1);
                            return;
                          }
                          // Escape → dismiss suggestion
                          if (e.key === "Escape" && inlineSuggestion) {
                            e.preventDefault();
                            setInlineSuggestion("");
                            setSuggestionPageIdx(-1);
                            return;
                          }
                          if (e.key.length === 1 || e.key === "Backspace" || e.key === "Enter" || e.key === " ") {
                            // Any typing dismisses current suggestion and SDT findings
                            if (inlineSuggestion) {
                              setInlineSuggestion("");
                              setSuggestionPageIdx(-1);
                            }
                            if (sdtFindings.length > 0) {
                              setSdtFindings([]);
                              setSdtPageIdx(-1);
                            }
                            playTypewriterSound(isFocusMode);
                            if (isTypewriterMode) scrollToCursorCenter(e.currentTarget as HTMLTextAreaElement);
                          }
                        }}
                      />
                        );
                      })()
                    : (
                      (() => {
                        const drawBlock = typeof pageContent !== 'string' && pageContent.type === 'drawing' ? pageContent : null;
                        if (!drawBlock) return null;
                        const sizeMap: Record<DrawingSize, number> = { small: 42, medium: 64, large: 86, full: 100 };
                        const rawPct = drawBlock.widthPct ?? sizeMap[drawBlock.size || 'full'];
                        const wPct = `${rawPct}%`;
                        const align = drawBlock.align || 'center';
                        const justifyMap: Record<DrawingAlign, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };
                        const isSelected = selectedDrawingIdx === index;
                        return (
                          <div
                            className="w-full select-none"
                            style={{ paddingTop: '24px', paddingBottom: '24px', display: 'flex', justifyContent: justifyMap[align] }}
                            onClick={(e) => { e.stopPropagation(); setSelectedDrawingIdx(index); setActivePageIndex(index); }}
                            onMouseLeave={() => {}}
                          >
                            <div className="relative" style={{ width: wPct, minWidth: '80px' }}>
                              {/* Floating toolbar — appears above when selected */}
                              {isSelected && (
                                <div
                                  className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-1 rounded-xl shadow-xl z-10 whitespace-nowrap"
                                  style={{ background: '#1a1a1d', border: '1px solid rgba(255,255,255,0.12)' }}
                                  onMouseDown={e => e.stopPropagation()}
                                >
                                  {/* Alignment */}
                                  {([
                                    { a: 'left'   as DrawingAlign, icon: <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor"><rect x="0" y="0" width="12" height="2" rx="1"/><rect x="0" y="4" width="8" height="2" rx="1"/><rect x="0" y="8" width="10" height="2" rx="1"/></svg> },
                                    { a: 'center' as DrawingAlign, icon: <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor"><rect x="0" y="0" width="12" height="2" rx="1"/><rect x="2" y="4" width="8" height="2" rx="1"/><rect x="1" y="8" width="10" height="2" rx="1"/></svg> },
                                    { a: 'right'  as DrawingAlign, icon: <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor"><rect x="0" y="0" width="12" height="2" rx="1"/><rect x="4" y="4" width="8" height="2" rx="1"/><rect x="2" y="8" width="10" height="2" rx="1"/></svg> },
                                  ]).map(({ a, icon }) => (
                                    <button key={a} onClick={() => updateDrawingBlock(index, { align: a })}
                                      className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
                                      style={{ background: align === a ? 'rgba(255,255,255,0.18)' : 'transparent', color: align === a ? '#fff' : 'rgba(255,255,255,0.45)' }}
                                    >
                                      {icon}
                                    </button>
                                  ))}
                                  <div className="w-px h-4 mx-0.5" style={{ background: 'rgba(255,255,255,0.12)' }} />
                                  {/* Size presets */}
                                  {([
                                    { label: 'S', pct: 42 },
                                    { label: 'M', pct: 64 },
                                    { label: 'L', pct: 86 },
                                    { label: '↔', pct: 100 },
                                  ]).map(opt => (
                                    <button key={opt.label} onClick={() => updateDrawingBlock(index, { widthPct: opt.pct })}
                                      className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold transition-colors"
                                      style={{ background: Math.abs(rawPct - opt.pct) < 5 ? 'rgba(255,255,255,0.18)' : 'transparent', color: Math.abs(rawPct - opt.pct) < 5 ? '#fff' : 'rgba(255,255,255,0.45)' }}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                  <div className="w-px h-4 mx-0.5" style={{ background: 'rgba(255,255,255,0.12)' }} />
                                  {/* Width % indicator */}
                                  <span className="text-[9px] tabular-nums px-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{rawPct}%</span>
                                  <div className="w-px h-4 mx-0.5" style={{ background: 'rgba(255,255,255,0.12)' }} />
                                  {/* Delete */}
                                  <button
                                    onClick={() => { setPages(prev => { const n = [...prev]; n.splice(index, 1); return n.length ? n : [""]; }); setIsDirty(true); setSelectedDrawingIdx(null); }}
                                    className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
                                    style={{ color: 'rgba(239,68,68,0.6)' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(239,68,68,1)')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(239,68,68,0.6)')}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                              {/* The image */}
                              <img
                                src={drawBlock.content}
                                alt={`Page ${index + 1} drawing`}
                                draggable={false}
                                style={{
                                  width: '100%',
                                  display: 'block',
                                  borderRadius: '6px',
                                  boxShadow: isSelected
                                    ? '0 0 0 2px #3b82f6, 0 4px 24px rgba(0,0,0,0.18)'
                                    : '0 2px 12px rgba(0,0,0,0.10)',
                                  transition: 'box-shadow 0.15s',
                                  cursor: 'pointer',
                                }}
                              />
                              {/* Resize handle — bottom-right corner */}
                              {isSelected && (
                                <div
                                  className="absolute bottom-0 right-0 w-5 h-5 flex items-end justify-end cursor-ew-resize z-10"
                                  style={{ transform: 'translate(50%, 50%)' }}
                                  onMouseDown={e => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setResizingDrawing({ idx: index, startX: e.clientX, startPct: rawPct });
                                  }}
                                >
                                  <div className="w-3 h-3 rounded-full shadow-md" style={{ background: '#3b82f6', border: '2px solid #fff' }} />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    )}

                  {/* ── Ghost Text suggestion chip ── */}
                  {activePageIndex === index && (inlineSuggestion || suggestionLoading) && (
                    <div
                      className="flex items-start gap-2 px-2 pb-2 animate-in fade-in duration-200"
                      style={{ direction: textDir }}
                    >
                      {suggestionLoading && !inlineSuggestion ? (
                        <div className="flex items-center gap-1.5 opacity-30 py-1">
                          <div className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      ) : inlineSuggestion ? (
                        <div
                          className="w-full rounded-xl px-3 py-2.5 flex items-start gap-2.5"
                          style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)' }}
                        >
                          <span style={{ fontSize: '13px', color: 'rgba(99,102,241,0.5)', flexShrink: 0, marginTop: '1px' }}>✦</span>
                          <span
                            className="flex-1 text-[13px] leading-relaxed italic select-none"
                            style={{
                              ...(FONT_STYLE_MAP[prefs.fontFamily || ''] || {}),
                              color: isFocusMode ? 'rgba(200,200,220,0.5)' : 'rgba(120,120,160,0.7)',
                            }}
                          >
                            {inlineSuggestion}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                            <kbd className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: 'rgba(99,102,241,0.15)', color: 'rgba(99,102,241,0.8)', border: '1px solid rgba(99,102,241,0.25)' }}>
                              Tab
                            </kbd>
                            <span className="text-[10px]" style={{ color: 'rgba(99,102,241,0.4)' }}>
                              {ar ? "قبول" : "accept"}
                            </span>
                            <button
                              onClick={() => { setInlineSuggestion(""); setSuggestionPageIdx(-1); }}
                              className="transition-opacity hover:opacity-80"
                              style={{ color: 'rgba(99,102,241,0.35)', fontSize: '11px', marginLeft: '2px' }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* ── Show Don't Tell panel ── */}
                  {activePageIndex === index && sdtPageIdx === index && sdtFindings.length > 0 && (() => {
                    const finding = sdtFindings[sdtIndex];
                    if (!finding) return null;
                    const applySDT = () => {
                      const current = getPageText(pageContent);
                      if (current.includes(finding.original)) {
                        const updated = current.replace(finding.original, finding.suggestion);
                        handlePageChange(index, updated);
                      }
                      if (sdtFindings.length > 1) {
                        setSdtIndex(i => (i + 1) % sdtFindings.length);
                      } else {
                        setSdtFindings([]);
                        setSdtPageIdx(-1);
                      }
                    };
                    const dismissSDT = () => {
                      if (sdtFindings.length > 1) {
                        setSdtIndex(i => (i + 1) % sdtFindings.length);
                      } else {
                        setSdtFindings([]);
                        setSdtPageIdx(-1);
                      }
                    };
                    return (
                      <div
                        className="mx-2 mb-2 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300"
                        style={{ border: '1px solid rgba(251,191,36,0.25)', background: 'rgba(251,191,36,0.05)' }}
                      >
                        <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
                          <span style={{ fontSize: '13px' }}>✍️</span>
                          <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: 'rgba(251,191,36,0.7)' }}>
                            {ar ? "أظهر لا تخبر" : "Show, Don't Tell"}
                          </span>
                          {sdtFindings.length > 1 && (
                            <span className="text-[9px] ml-auto" style={{ color: 'rgba(251,191,36,0.4)' }}>
                              {sdtIndex + 1}/{sdtFindings.length}
                            </span>
                          )}
                          <button onClick={() => { setSdtFindings([]); setSdtPageIdx(-1); }} className="hover:opacity-80 transition-opacity ml-auto" style={{ color: 'rgba(251,191,36,0.35)', fontSize: '11px' }}>✕</button>
                        </div>
                        <div className="px-3 pb-1">
                          <div className="flex items-start gap-1.5 mb-1.5">
                            <span className="text-[10px] mt-0.5 shrink-0" style={{ color: 'rgba(239,68,68,0.6)' }}>→</span>
                            <span className="text-[12px] line-through" style={{ color: 'rgba(239,68,68,0.55)', ...(FONT_STYLE_MAP[prefs.fontFamily || ''] || {}) }}>
                              {finding.original}
                            </span>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <span className="text-[10px] mt-0.5 shrink-0" style={{ color: 'rgba(74,222,128,0.6)' }}>✓</span>
                            <span className="text-[12px] italic" style={{ color: 'rgba(74,222,128,0.8)', ...(FONT_STYLE_MAP[prefs.fontFamily || ''] || {}) }}>
                              {finding.suggestion}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 px-3 pb-3 pt-2">
                          <button
                            onClick={applySDT}
                            className="flex-1 rounded-lg py-1.5 text-[11px] font-medium transition-all hover:opacity-90"
                            style={{ background: 'rgba(74,222,128,0.15)', color: 'rgba(74,222,128,0.9)', border: '1px solid rgba(74,222,128,0.2)' }}
                          >
                            {ar ? "تطبيق" : "Apply"}
                          </button>
                          <button
                            onClick={dismissSDT}
                            className="px-4 rounded-lg py-1.5 text-[11px] transition-all hover:opacity-80"
                            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}
                          >
                            {ar ? "تخطّ" : "Skip"}
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* SDT loading indicator */}
                  {activePageIndex === index && sdtLoading && sdtFindings.length === 0 && !inlineSuggestion && !suggestionLoading && (
                    <div className="flex items-center gap-1.5 px-3 pb-2 opacity-20" style={{ direction: textDir }}>
                      <span style={{ fontSize: '11px' }}>✍️</span>
                      <div className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                  </div>

                  {/* Page bottom — decorative rule + centered page number */}
                  <div className="mx-[76px] h-px opacity-8 mt-2" style={{ background: effectivePrefs.textColor || "currentColor" }} />
                  <div className="relative flex items-center justify-center px-[76px] pb-6 pt-3 select-none">
                    {/* Word count — left edge */}
                    <span className="absolute left-[76px] text-[9px] opacity-15 tabular-nums" style={{ color: effectivePrefs.textColor || undefined }}>
                      {pageWords} {ar ? "كلمة" : "words"}
                    </span>
                    {/* Centered page number — book style */}
                    <span
                      className="text-[11px] font-medium tracking-widest opacity-30"
                      style={{ color: effectivePrefs.textColor || undefined, letterSpacing: "0.2em" }}
                    >
                      — {index + 1} —
                    </span>
                  </div>
                </div>

                {/* Page shadow/curl effect */}
                <div className="absolute -bottom-1 left-2 right-2 h-3 rounded-b-sm opacity-[0.07] blur-sm"
                  style={{ background: "black" }} />
              </div>
            );
          })}

          {/* Add Page Button */}
          <div className="flex flex-col items-center gap-3 pb-24 mt-2 w-full max-w-[595px]">
            <Button
              variant="ghost"
              onClick={handleAddPage}
              className="w-full rounded-sm border border-dashed border-border/30 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all py-5 text-sm font-medium gap-2"
              data-testid="button-add-page"
            >
              <PlusCircle className="w-4 h-4" />
              {ar ? "إضافة صفحة جديدة" : "Add new page"}
            </Button>
          </div>
        </div>

        {/* Hidden measurement div — mirrors textarea styling for height measurement */}
        <div
          ref={measureRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            visibility: "hidden",
            pointerEvents: "none",
            top: "-9999px",
            left: "-9999px",
            width: `${PAGE_CONTENT_WIDTH}px`,
            fontSize: effectivePrefs.fontSize === "text-sm" ? "14px" : effectivePrefs.fontSize === "text-base" ? "16px" : effectivePrefs.fontSize === "text-xl" ? "20px" : effectivePrefs.fontSize === "text-2xl" ? "24px" : "18px",
            lineHeight: LINE_HEIGHT_MAP[effectivePrefs.lineHeight || "normal"] || "1.85",
            letterSpacing: LETTER_SPACING_MAP[effectivePrefs.letterSpacing || "normal"] || "0em",
            fontFamily: (FONT_STYLE_MAP[effectivePrefs.fontFamily || ''] || fontStyle).fontFamily || undefined,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            padding: 0,
            margin: 0,
            border: 0,
          }}
        />
      </main>

      {/* Delete page confirm dialog */}
      <AlertDialog open={deletingPage !== null} onOpenChange={(open) => !open && setDeletingPage(null)}>
        <AlertDialogContent className="rounded-2xl" dir={isRTL ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{ar ? "حذف الصفحة؟" : "Delete this page?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {ar
                ? `سيتم حذف محتوى الصفحة ${(deletingPage ?? 0) + 1} نهائياً.`
                : `Page ${(deletingPage ?? 0) + 1} content will be permanently removed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPage !== null && handleDeletePage(deletingPage)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg"
            >
              {ar ? "حذف الصفحة" : "Delete page"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Reference Panel (fixed-height flex sidebar) ── */}
      <div
        className="flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden"
        style={{
          width: showRefPanel ? '380px' : '0',
          minWidth: showRefPanel ? '380px' : '0',
          background: 'hsl(var(--background))',
          borderLeft: showRefPanel ? '1px solid hsl(var(--border)/40%)' : 'none',
        }}
      >
        {/* Panel Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid hsl(var(--border)/30%)', background: 'hsl(var(--muted)/30%)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookMarked style={{ width: '15px', height: '15px', color: 'hsl(var(--sky-500, 14 165 233))' }} className="text-sky-500" />
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>
                {ar ? 'وضع المرجع' : 'Reference Mode'}
              </span>
              <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '100px', background: 'hsl(var(--sky-500/10%))', color: 'hsl(var(--sky-500, 14 165 233))' }} className="bg-sky-500/10 text-sky-500">
                {ar ? 'قراءة فقط' : 'Read-Only'}
              </span>
            </div>
            <button
              onClick={() => setShowRefPanel(false)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'hsl(var(--muted-foreground))' }}
              className="hover:bg-muted hover:text-foreground transition-colors"
            >
              <X style={{ width: '14px', height: '14px' }} />
            </button>
          </div>

          {/* Chapter Selector */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setRefDropdownOpen(v => !v)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', border: '1px solid hsl(var(--border)/50%)', background: 'hsl(var(--background))', cursor: 'pointer', fontSize: '13px', color: 'hsl(var(--foreground))' }}
              className="hover:border-sky-400/50 transition-colors"
            >
              <span style={{ fontWeight: 500 }}>
                {refChapter
                  ? refChapter.title || (ar ? `فصل ${refChapter.order}` : `Chapter ${refChapter.order}`)
                  : (ar ? 'اختر فصلاً...' : 'Select a chapter...')}
              </span>
              <ChevronDown style={{ width: '14px', height: '14px', color: 'hsl(var(--muted-foreground))', flexShrink: 0 }} />
            </button>
            {refDropdownOpen && (
              <div
                style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'hsl(var(--background))', border: '1px solid hsl(var(--border)/50%)', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 10, overflow: 'hidden' }}
              >
                {otherChapters.length === 0 ? (
                  <div style={{ padding: '12px 14px', fontSize: '13px', color: 'hsl(var(--muted-foreground))', textAlign: 'center' }}>
                    {ar ? 'لا توجد فصول أخرى' : 'No other chapters'}
                  </div>
                ) : (
                  otherChapters.map(ch => (
                    <button
                      key={ch.id}
                      onClick={() => { setRefChapterId(ch.id); setRefDropdownOpen(false); }}
                      style={{ width: '100%', padding: '9px 14px', textAlign: ar ? 'right' : 'left', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: refChapterId === ch.id ? 'hsl(var(--muted))' : 'transparent', cursor: 'pointer', fontSize: '13px', color: 'hsl(var(--foreground))', transition: 'background 0.1s' }}
                      className="hover:bg-muted"
                    >
                      <span style={{ fontSize: '10px', fontWeight: 700, width: '22px', height: '22px', borderRadius: '5px', background: 'hsl(var(--primary)/10%)', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {ch.order}
                      </span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: refChapterId === ch.id ? 600 : 400 }}>
                        {ch.title || (ar ? `فصل ${ch.order}` : `Chapter ${ch.order}`)}
                      </span>
                      {refChapterId === ch.id && (
                        <span style={{ marginLeft: 'auto', width: '7px', height: '7px', borderRadius: '50%', background: 'hsl(var(--primary))', flexShrink: 0 }} />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Panel Content — read-only chapter text */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }} onClick={() => refDropdownOpen && setRefDropdownOpen(false)}>
          {!refChapter ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px', color: 'hsl(var(--muted-foreground))' }}>
              <BookMarked style={{ width: '32px', height: '32px', opacity: 0.3 }} />
              <p style={{ fontSize: '13px', textAlign: 'center', opacity: 0.6 }}>
                {ar ? 'اختر فصلاً لعرضه هنا كمرجع' : 'Choose a chapter to view as reference'}
              </p>
            </div>
          ) : !refFullText ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '8px', color: 'hsl(var(--muted-foreground))' }}>
              <p style={{ fontSize: '13px', opacity: 0.5, fontStyle: 'italic' }}>
                {ar ? 'هذا الفصل فارغ' : 'This chapter is empty'}
              </p>
            </div>
          ) : (
            <>
              {/* Chapter title + stats */}
              <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid hsl(var(--border)/30%)' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'hsl(var(--foreground))', marginBottom: '4px', ...fontStyle }}>
                  {refChapter.title || (ar ? `فصل ${refChapter.order}` : `Chapter ${refChapter.order}`)}
                </h2>
                <span style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.05em' }}>
                  {refWordCount.toLocaleString()} {ar ? 'كلمة' : 'words'}
                  {' · '}
                  {refParsedPages.length} {ar ? (refParsedPages.length === 1 ? 'صفحة' : 'صفحات') : (refParsedPages.length === 1 ? 'page' : 'pages')}
                </span>
              </div>

              {/* Content */}
              <div
                style={{
                  fontSize: '14px',
                  lineHeight: '1.85',
                  color: 'hsl(var(--foreground)/85%)',
                  userSelect: 'text',
                  cursor: 'text',
                  ...fontStyle,
                  direction: textDir,
                }}
                dir={textDir}
              >
                {refFullText.split(/\n\n+/).map((para, i) => (
                  <p key={i} style={{ marginBottom: '1em', textIndent: i > 0 ? '1.4em' : '0' }}>
                    {para.trim()}
                  </p>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Panel Footer */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid hsl(var(--border)/20%)', background: 'hsl(var(--muted)/20%)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '10px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.08em', opacity: 0.7 }}>
            {ar ? '🔒 وضع القراءة فقط — لا يمكن التعديل' : '🔒 Read-only — no edits possible'}
          </span>
        </div>
      </div>

      </div>{/* end body flex row */}

      {showAI && (
        <AIAssistant
          bookId={bookId}
          currentContent={pages.map(p => getPageText(p)).filter(Boolean).join("\n\n---\n\n")}
          onApply={(newContent) => { setPages([newContent]); setIsDirty(true); }}
          onClose={() => setShowAI(false)}
        />
      )}

      <StoryBible
        bookId={bookId}
        isOpen={showStoryBible}
        onClose={() => setShowStoryBible(false)}
      />

      {/* ── Version History Panel ─────────────────────────────────────────── */}
      {showVersionHistory && (
        <div className="fixed inset-y-0 right-0 z-[80] flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowVersionHistory(false)}
          />
          {/* Panel */}
          <div className="relative ml-auto w-80 h-full bg-background border-l border-border/40 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="h-14 border-b border-border/20 px-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-violet-500" />
                <span className="font-semibold text-sm">{ar ? "سجل الإصدارات" : "Version History"}</span>
                {versions.length > 0 && (
                  <span className="text-[10px] bg-violet-500/10 text-violet-500 rounded-full px-1.5 py-0.5 font-medium">{versions.length}</span>
                )}
              </div>
              <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8" onClick={() => setShowVersionHistory(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Info bar */}
            <div className="px-4 py-2.5 bg-violet-500/5 border-b border-violet-500/10 flex-shrink-0">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {ar
                  ? "يُحفظ إصدار جديد تلقائياً في كل مرة تضغط حفظ. يمكنك الرجوع لأي إصدار سابق."
                  : "A new version is auto-saved every time you save. You can restore any previous version."}
              </p>
            </div>

            {/* Versions list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {versions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center gap-3">
                  <Clock className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground/60">
                    {ar ? "لا توجد إصدارات بعد. احفظ الفصل لبدء سجل الإصدارات." : "No versions yet. Save the chapter to start tracking history."}
                  </p>
                </div>
              ) : (
                versions.map((snap, i) => (
                  <div
                    key={snap.id}
                    className="group relative p-3 rounded-xl border border-border/30 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {i === 0 && (
                            <span className="text-[9px] bg-violet-500 text-white rounded-full px-1.5 py-0.5 font-semibold uppercase tracking-wide">
                              {ar ? "الأحدث" : "Latest"}
                            </span>
                          )}
                          <span className="text-xs font-medium text-foreground truncate">
                            {snap.label || (ar ? `إصدار ${versions.length - i}` : `Version ${versions.length - i}`)}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(snap.createdAt!).toLocaleDateString(ar ? "ar" : "en", {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                          })}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">
                          {snap.content.length} {ar ? "حرف" : "chars"}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title={ar ? "حذف هذا الإصدار" : "Delete this version"}
                          onClick={() => deleteVersion.mutate(snap.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-violet-500 hover:bg-violet-500/10"
                          title={ar ? "الرجوع لهذا الإصدار" : "Restore this version"}
                          disabled={restoringSnapId === snap.id || restoreVersion.isPending}
                          onClick={async () => {
                            setRestoringSnapId(snap.id);
                            try {
                              await restoreVersion.mutateAsync(snap.id);
                              toast({ title: ar ? "تم استعادة الإصدار!" : "Version restored!" });
                              setShowVersionHistory(false);
                            } finally {
                              setRestoringSnapId(null);
                            }
                          }}
                        >
                          {restoringSnapId === snap.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer — manual save version */}
            <div className="p-3 border-t border-border/20 flex-shrink-0">
              <Button
                variant="outline"
                className="w-full rounded-xl text-xs gap-2 border-violet-500/30 text-violet-600 hover:bg-violet-500/10 hover:border-violet-500"
                onClick={() => {
                  const label = prompt(ar ? "اسم هذا الإصدار (اختياري):" : "Label for this version (optional):", "");
                  const content = serializePages(pages);
                  saveVersion.mutate({ content, label: label || undefined });
                }}
              >
                <History className="w-3.5 h-3.5" />
                {ar ? "حفظ إصدار يدوياً" : "Save Version Now"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showCustomizer && (
        <BookCustomizer
          preferences={prefs}
          onSave={handleSavePrefs}
          onPreview={(p) => setPreviewPrefs(p)}
          onClose={() => { setShowCustomizer(false); setPreviewPrefs(null); }}
        />
      )}

      {showCanvas && (
        <div className="fixed inset-0 z-[100] flex flex-col animate-in fade-in duration-200" style={{ background: '#0e0e10' }}>

          {/* ── Top Bar ── */}
          <div className="shrink-0 h-12 flex items-center justify-between px-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
            <div className="flex items-center gap-2.5">
              <PenTool className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
              <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {ar ? "لوحة الرسم" : "Sketch Canvas"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => canvasRef.current?.undo()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
              >
                <RotateCcw className="w-3 h-3" />
                {ar ? "تراجع" : "Undo"}
              </button>
              <button
                onClick={() => canvasRef.current?.clearCanvas()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ color: 'rgba(239,68,68,0.65)', background: 'rgba(239,68,68,0.08)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(239,68,68,1)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(239,68,68,0.65)')}
              >
                <Trash2 className="w-3 h-3" />
                {ar ? "مسح الكل" : "Clear"}
              </button>
              <div className="w-px h-5 mx-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <button
                onClick={() => { setShowCanvas(false); setIsEraser(false); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Main: sidebar + canvas ── */}
          <div className="flex flex-1 min-h-0">

            {/* Left Sidebar — Tools */}
            <div className="shrink-0 w-48 flex flex-col border-r overflow-y-auto" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.015)' }}>

              {/* ── Tools (Pen / Eraser) ── */}
              <div className="p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="text-[9px] uppercase tracking-[0.18em] mb-2 font-semibold" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  {ar ? "الأداة" : "Tool"}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setIsEraser(false)}
                    className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-medium transition-all"
                    style={{
                      background: !isEraser ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)',
                      color: !isEraser ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.38)',
                      border: `1px solid ${!isEraser ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <PenTool className="w-4 h-4" />
                    {ar ? "قلم" : "Pen"}
                  </button>
                  <button
                    onClick={() => setIsEraser(true)}
                    className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-medium transition-all"
                    style={{
                      background: isEraser ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)',
                      color: isEraser ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.38)',
                      border: `1px solid ${isEraser ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <span className="text-base leading-none">⊘</span>
                    {ar ? "ممحاة" : "Eraser"}
                  </button>
                </div>
              </div>

              {/* ── Colors ── */}
              <div className="p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="text-[9px] uppercase tracking-[0.18em] mb-2 font-semibold" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  {ar ? "اللون" : "Color"}
                </p>
                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {["#000000","#ffffff","#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899","#6b7280"].map(c => (
                    <button
                      key={c}
                      onClick={() => { setCanvasColor(c); setIsEraser(false); }}
                      className="w-7 h-7 rounded-full transition-all hover:scale-110"
                      style={{
                        background: c,
                        outline: canvasColor === c && !isEraser ? '2px solid rgba(255,255,255,0.9)' : '2px solid transparent',
                        outlineOffset: '2px',
                        boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px rgba(0,0,0,0.2)' : undefined,
                        transform: canvasColor === c && !isEraser ? 'scale(1.15)' : undefined,
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-7 h-7 rounded-full flex-shrink-0"
                    style={{
                      background: canvasColor,
                      outline: !isEraser ? '2px solid rgba(255,255,255,0.5)' : '2px solid transparent',
                      outlineOffset: '2px',
                      boxShadow: canvasColor === '#ffffff' ? 'inset 0 0 0 1px rgba(0,0,0,0.2)' : undefined,
                    }}
                  />
                  <input
                    type="color"
                    value={canvasColor}
                    onChange={e => { setCanvasColor(e.target.value); setIsEraser(false); }}
                    className="flex-1 h-7 rounded-lg cursor-pointer border-0 bg-transparent"
                    title={ar ? "لون مخصص" : "Custom color"}
                  />
                </div>
              </div>

              {/* ── Brush Size ── */}
              <div className="p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="text-[9px] uppercase tracking-[0.18em] mb-2 font-semibold flex items-center justify-between" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  <span>{ar ? "الحجم" : "Size"}</span>
                  <span style={{ color: 'rgba(255,255,255,0.55)' }}>{canvasStroke}px</span>
                </p>
                {/* Quick size presets */}
                <div className="grid grid-cols-4 gap-1 mb-2.5">
                  {[2, 5, 10, 20].map(sz => (
                    <button
                      key={sz}
                      onClick={() => setCanvasStroke(sz)}
                      className="flex items-center justify-center h-7 rounded-lg text-[10px] font-semibold transition-all"
                      style={{
                        background: canvasStroke === sz ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)',
                        color: canvasStroke === sz ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                        border: `1px solid ${canvasStroke === sz ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
                <input
                  type="range" min="1" max="40"
                  value={canvasStroke}
                  onChange={e => setCanvasStroke(parseInt(e.target.value))}
                  className="w-full accent-white"
                />
                {/* Live brush preview */}
                <div className="mt-2 flex items-center justify-center" style={{ height: '32px' }}>
                  <div
                    className="rounded-full transition-all"
                    style={{
                      width: `${Math.min(isEraser ? canvasStroke * 2.5 : canvasStroke, 32)}px`,
                      height: `${Math.min(isEraser ? canvasStroke * 2.5 : canvasStroke, 32)}px`,
                      background: isEraser ? 'rgba(255,255,255,0.1)' : canvasColor,
                      border: isEraser ? '2px dashed rgba(255,255,255,0.35)' : 'none',
                      boxShadow: !isEraser && canvasColor !== '#000000' ? `0 0 8px ${canvasColor}55` : undefined,
                    }}
                  />
                </div>
              </div>

              {/* ── Insert Size ── */}
              <div className="p-3">
                <p className="text-[9px] uppercase tracking-[0.18em] mb-2 font-semibold" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  {ar ? "حجم الإدراج" : "Insert Size"}
                </p>
                <div className="flex flex-col gap-1.5">
                  {([
                    { id: 'small',  label: ar ? 'صغير'   : 'Small',  hint: '42%',  bar: 42  },
                    { id: 'medium', label: ar ? 'متوسط'  : 'Medium', hint: '64%',  bar: 64  },
                    { id: 'large',  label: ar ? 'كبير'   : 'Large',  hint: '86%',  bar: 86  },
                    { id: 'full',   label: ar ? 'كامل'   : 'Full',   hint: '100%', bar: 100 },
                  ] as { id: DrawingSize, label: string, hint: string, bar: number }[]).map(opt => {
                    const isActive = drawingSize === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setDrawingSize(opt.id)}
                        className="w-full rounded-xl overflow-hidden transition-all text-left"
                        style={{
                          background: isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isActive ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.06)'}`,
                          padding: '7px 10px',
                        }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-semibold" style={{ color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)' }}>
                            {opt.label}
                          </span>
                          <span className="text-[9px]" style={{ color: isActive ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.25)' }}>
                            {opt.hint}
                          </span>
                        </div>
                        {/* Width bar visualizer */}
                        <div className="w-full rounded-full overflow-hidden" style={{ height: '3px', background: 'rgba(255,255,255,0.06)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${opt.bar}%`,
                              background: isActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.18)',
                            }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 relative min-w-0" style={{ background: '#ffffff', cursor: isEraser ? 'cell' : 'crosshair' }}>
              <ReactSketchCanvas
                ref={canvasRef}
                strokeWidth={isEraser ? Math.max(canvasStroke * 2.5, 12) : canvasStroke}
                strokeColor={canvasColor}
                className="w-full h-full border-none"
                canvasColor="white"
              />
            </div>
          </div>

          {/* ── Bottom Bar — action buttons only ── */}
          <div className="shrink-0 flex items-center justify-end gap-3 px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.025)' }}>
            <button
              onClick={() => { setShowCanvas(false); setIsEraser(false); }}
              className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
            >
              {ar ? "إلغاء" : "Cancel"}
            </button>
            <button
              onClick={handleSaveDrawing}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(255,255,255,0.94)', color: '#0e0e10' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#ffffff')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.94)')}
            >
              <CheckCircle2 className="w-4 h-4" />
              {ar ? "إدراج في الكتاب" : "Insert into Book"}
            </button>
          </div>
        </div>
      )}

      {/* ── Print View Overlay ── */}
      {isPrintView && (() => {
        const totalWords = printPages.join(" ").split(/\s+/).filter(Boolean).length;
        const readMins = Math.max(1, Math.round(totalWords / 200));
        const progressPct = maxSpread > 0 ? (currentSpread / maxSpread) * 100 : 100;
        const pageFont = fontStyle.fontFamily || "Georgia, 'Times New Roman', serif";
        const pageColor = prefs.textColor || '#111111';
        const pageBg = resolvedBgColor || '#FFFEF8';

        return (
          <div className="fixed inset-0 z-[200] flex flex-col select-none" style={{ background: '#0d0d0f' }}>

            {/* ── Top Bar ── */}
            <div style={{ height: '56px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', flexShrink: 0 }}>
              {/* Left: book info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <BookOpen style={{ width: '15px', height: '15px', color: 'rgba(255,255,255,0.22)', flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontFamily: pageFont, fontSize: '13px', color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', lineHeight: 1.2 }}>
                    {book?.title || (ar ? 'كتاب بلا عنوان' : 'Untitled Book')}
                  </span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.22)', marginTop: '1px' }}>
                    {title} {book?.authorName ? `· ${book.authorName}` : ''}
                  </span>
                </div>
              </div>

              {/* Center: reading stats */}
              <div style={{ display: 'flex', align: 'center', gap: '24px' }}>
                <span style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.20)', fontFamily: 'system-ui' }}>
                  {totalWords.toLocaleString()} {ar ? 'كلمة' : 'words'}
                  {'  ·  '}
                  ~{readMins} {ar ? 'د قراءة' : 'min read'}
                </span>
              </div>

              {/* Right: actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={() => window.print()}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', fontSize: '11px', letterSpacing: '0.08em', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = 'rgba(255,255,255,0.80)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
                >
                  <Printer style={{ width: '12px', height: '12px' }} />
                  {ar ? 'طباعة' : 'Print'}
                </button>
                <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.07)' }} />
                <button
                  onClick={() => setIsPrintView(false)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '6px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.30)', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.80)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.30)'; }}
                >
                  <X style={{ width: '16px', height: '16px' }} />
                </button>
              </div>
            </div>

            {/* ── Reading Progress Bar ── */}
            <div style={{ height: '2px', background: 'rgba(255,255,255,0.04)', flexShrink: 0 }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))', width: `${progressPct}%`, transition: 'width 0.4s ease' }} />
            </div>

            {/* ── Scrollable Book Area ── */}
            <div ref={printScrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '3rem 1.5rem' }}>

              {printPages.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: 'rgba(255,255,255,0.20)', fontFamily: pageFont, fontStyle: 'italic' }}>
                  <BookOpen style={{ width: '40px', height: '40px', opacity: 0.2 }} />
                  <p style={{ fontSize: '16px' }}>{ar ? 'لا يوجد محتوى بعد. ابدأ الكتابة!' : 'No content yet. Start writing!'}</p>
                </div>
              ) : (
                <div style={{ width: '100%', maxWidth: '1060px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px' }}>

                  {/* ── Two-Page Spread ── */}
                  <div style={{
                    width: '100%',
                    display: 'flex',
                    minHeight: '680px',
                    boxShadow: '0 40px 100px rgba(0,0,0,0.80), 0 12px 32px rgba(0,0,0,0.50)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}>

                    {/* Left Page */}
                    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', background: pageBg, padding: '3.8rem 3rem 4.2rem 3.8rem', boxShadow: 'inset -14px 0 28px rgba(0,0,0,0.08)' }}>
                      {/* Running header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(0,0,0,0.10)', paddingBottom: '11px', marginBottom: '3rem' }}>
                        <span style={{ fontSize: '8px', letterSpacing: '0.32em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.20)', fontFamily: 'system-ui' }}>
                          {book?.title || ''}
                        </span>
                        <span style={{ fontSize: '8px', color: 'rgba(0,0,0,0.15)', fontFamily: 'system-ui' }}>❧</span>
                      </div>

                      {/* Content */}
                      <div style={{ fontFamily: pageFont, fontSize: '16px', color: pageColor, flex: 1, overflow: 'hidden', lineHeight: '1.75' }}>
                        {printPages[currentSpread * 2] !== undefined
                          ? renderPageContent(printPages[currentSpread * 2], currentSpread === 0)
                          : null}
                      </div>

                      {/* Footer: page number */}
                      <div style={{ marginTop: '2rem', borderTop: '0.5px solid rgba(0,0,0,0.08)', paddingTop: '11px', display: 'flex', justifyContent: 'center' }}>
                        <span style={{ fontSize: '10px', color: 'rgba(0,0,0,0.22)', fontFamily: pageFont, letterSpacing: '0.15em' }}>
                          — {currentSpread * 2 + 1} —
                        </span>
                      </div>
                    </div>

                    {/* Binding */}
                    <div style={{
                      width: '6px',
                      flexShrink: 0,
                      background: 'linear-gradient(to right, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.10) 40%, rgba(0,0,0,0.04) 70%, rgba(0,0,0,0.12) 100%)',
                      boxShadow: 'inset 2px 0 6px rgba(0,0,0,0.15), inset -2px 0 6px rgba(0,0,0,0.08)',
                    }} />

                    {/* Right Page */}
                    {printPages[currentSpread * 2 + 1] !== undefined ? (
                      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', background: pageBg, padding: '3.8rem 3.8rem 4.2rem 3rem', boxShadow: 'inset 14px 0 28px rgba(0,0,0,0.04)' }}>
                        {/* Running header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(0,0,0,0.10)', paddingBottom: '11px', marginBottom: '3rem' }}>
                          <span style={{ fontSize: '8px', color: 'rgba(0,0,0,0.15)', fontFamily: 'system-ui' }}>❧</span>
                          <span style={{ fontSize: '8px', letterSpacing: '0.32em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.20)', fontFamily: 'system-ui' }}>
                            {title || (ar ? 'فصل' : 'Chapter')}
                          </span>
                        </div>

                        {/* Content */}
                        <div style={{ fontFamily: pageFont, fontSize: '16px', color: pageColor, flex: 1, overflow: 'hidden', lineHeight: '1.75' }}>
                          {renderPageContent(printPages[currentSpread * 2 + 1], false)}
                        </div>

                        {/* Footer */}
                        <div style={{ marginTop: '2rem', borderTop: '0.5px solid rgba(0,0,0,0.08)', paddingTop: '11px', display: 'flex', justifyContent: 'center' }}>
                          <span style={{ fontSize: '10px', color: 'rgba(0,0,0,0.22)', fontFamily: pageFont, letterSpacing: '0.15em' }}>
                            — {currentSpread * 2 + 2} —
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ flex: 1, background: pageBg, boxShadow: 'inset 14px 0 28px rgba(0,0,0,0.03)', opacity: 0.6 }} />
                    )}
                  </div>

                  {/* ── Navigation ── */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button
                      onClick={() => setCurrentSpread(s => Math.max(0, s - 1))}
                      disabled={currentSpread === 0}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 22px', borderRadius: '100px', border: `1px solid ${currentSpread === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.14)'}`, background: 'transparent', color: currentSpread === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.55)', fontSize: '12px', cursor: currentSpread === 0 ? 'not-allowed' : 'pointer', transition: 'all 0.2s', letterSpacing: '0.04em' }}
                    >
                      <ChevronLeft style={{ width: '14px', height: '14px' }} />
                      {ar ? 'السابق' : 'Previous'}
                    </button>

                    {/* Spread dots */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {Array.from({ length: maxSpread + 1 }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentSpread(i)}
                          style={{ width: i === currentSpread ? '20px' : '6px', height: '6px', borderRadius: '100px', background: i === currentSpread ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.18)', border: 'none', cursor: 'pointer', transition: 'all 0.25s ease', padding: 0 }}
                        />
                      ))}
                    </div>

                    <button
                      onClick={() => setCurrentSpread(s => Math.min(maxSpread, s + 1))}
                      disabled={currentSpread >= maxSpread}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 22px', borderRadius: '100px', border: `1px solid ${currentSpread >= maxSpread ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.14)'}`, background: 'transparent', color: currentSpread >= maxSpread ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.55)', fontSize: '12px', cursor: currentSpread >= maxSpread ? 'not-allowed' : 'pointer', transition: 'all 0.2s', letterSpacing: '0.04em' }}
                    >
                      {ar ? 'التالي' : 'Next'}
                      <ChevronRight style={{ width: '14px', height: '14px' }} />
                    </button>
                  </div>

                  {/* Keyboard hint */}
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'system-ui' }}>
                    {ar ? '← → للتنقل  ·  Esc للإغلاق' : '← → to navigate  ·  Esc to close'}
                  </p>

                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
