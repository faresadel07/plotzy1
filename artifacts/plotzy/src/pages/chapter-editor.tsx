import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { sanitizeHtml } from "@/lib/sanitize";
import { loadEditorFonts } from "@/lib/load-editor-fonts";
import { useChapters, useUpdateChapter } from "@/hooks/use-chapters";
import { useBook, useUpdateBook } from "@/hooks/use-books";
import { useChapterVersions, useSaveVersion, useRestoreVersion, useDeleteVersion } from "@/hooks/use-chapter-versions";
import { AIAssistant } from "@/components/ai-assistant";
import { BookCustomizer } from "@/components/book-customizer";
import { StoryBible } from "@/components/story-bible";
import { WritingToolbar, PAGE_THEMES } from "@/components/writing-toolbar";
import { RichWritingToolbar } from "@/components/RichWritingToolbar";
import { RichChapterEditor } from "@/components/RichChapterEditor";
import { FloatingImageOverlay, type FloatingImage } from "@/components/FloatingImageOverlay";
import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2, Trash2, Wand2, Palette, PlusCircle, X, FileText, Mic, Square, Eye, EyeOff, BookOpen, Image as ImageIcon, CheckCircle2, Layers, Printer, ChevronLeft, ChevronRight, AlignCenter, History, RotateCcw, RotateCw, Clock, PanelRight, BookMarked, ChevronDown, LayoutGrid, Pencil, Search } from "lucide-react";
import { AmbientSoundscape } from "@/components/AmbientSoundscape";
import { PrintPreview } from "@/components/chapter-editor/PrintPreview";
import { PageSetupModal } from "@/components/chapter-editor/PageSetupModal";
import { playTypewriterSound } from "@/hooks/use-audio";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { useTheme } from "next-themes";
import { type BookPreferences } from "@/shared/schema";
import { PageStylePicker, PAGE_STYLES } from "@/components/page-style-picker";
import { queryClient } from "@/lib/queryClient";
import { saveDraft, loadDraft, clearDraft, type DraftEntry } from "@/lib/offline-drafts";
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
  // Serif
  "eb-garamond":       { fontFamily: "'EB Garamond', serif" },
  "cormorant":         { fontFamily: "'Cormorant Garamond', serif" },
  "playfair":          { fontFamily: "'Playfair Display', serif" },
  "lora":              { fontFamily: "'Lora', serif" },
  "merriweather":      { fontFamily: "'Merriweather', serif" },
  "libre-baskerville": { fontFamily: "'Libre Baskerville', serif" },
  "crimson":           { fontFamily: "'Crimson Text', serif" },
  "source-serif":      { fontFamily: "'Source Serif 4', serif" },
  "georgia":           { fontFamily: "Georgia, serif" },
  "times":             { fontFamily: "'Times New Roman', serif" },
  // Sans-serif
  "inter":             { fontFamily: "'Inter', sans-serif" },
  "roboto":            { fontFamily: "'Roboto', sans-serif" },
  "open-sans":         { fontFamily: "'Open Sans', sans-serif" },
  "montserrat":        { fontFamily: "'Montserrat', sans-serif" },
  "poppins":           { fontFamily: "'Poppins', sans-serif" },
  "nunito":            { fontFamily: "'Nunito', sans-serif" },
  "oswald":            { fontFamily: "'Oswald', sans-serif" },
  "lexend":            { fontFamily: "'Lexend', sans-serif" },
  "raleway":           { fontFamily: "'Raleway', sans-serif" },
  "dm-sans":           { fontFamily: "'DM Sans', sans-serif" },
  "plus-jakarta":      { fontFamily: "'Plus Jakarta Sans', sans-serif" },
  "space-grotesk":     { fontFamily: "'Space Grotesk', sans-serif" },
  // Display
  "lobster":           { fontFamily: "'Lobster', cursive" },
  "pacifico":          { fontFamily: "'Pacifico', cursive" },
  "comfortaa":         { fontFamily: "'Comfortaa', cursive" },
  "special-elite":     { fontFamily: "'Special Elite', cursive" },
  // Handwriting
  "caveat":            { fontFamily: "'Caveat', cursive" },
  "architects-daughter": { fontFamily: "'Architects Daughter', cursive" },
  // Monospace
  "courier-prime":     { fontFamily: "'Courier Prime', monospace" },
  "courier-new":       { fontFamily: "'Courier New', monospace" },
  "roboto-mono":       { fontFamily: "'Roboto Mono', monospace" },
  "ibm-plex-mono":     { fontFamily: "'IBM Plex Mono', monospace" },
  "space-mono":        { fontFamily: "'Space Mono', monospace" },
  // Arabic
  "arabic-sans":       { fontFamily: "'Cairo', sans-serif" },
  "arabic-serif":      { fontFamily: "'Amiri', serif" },
  "arabic-naskh":      { fontFamily: "'Noto Naskh Arabic', serif" },
};

const LINE_HEIGHT_MAP: Record<string, string> = {
  "tight":    "1.30",  // compact, like dense reference books
  "normal":   "1.45",  // standard published novel (12pt/14pt leading)
  "relaxed":  "1.65",  // comfortable reading
  "spacious": "2.00",  // double-spaced manuscript
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
  | { type: 'image', content: string, widthPct?: number, align?: DrawingAlign }
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

// ── Paper Size Definitions ────────────────────────────────────────────────────
// All sizes in CSS pixels at 96 dpi (1 inch = 96 px; 1 cm = 37.795 px)
const PAPER_SIZES: Record<string, { width: number; height: number; widthCm: number; heightCm: number; label: string; labelAr: string; icon: string }> = {
  "a5":     { width: 559,  height: 794,  widthCm: 14.8, heightCm: 21.0, label: "Classic Novel",       labelAr: "رواية كلاسيكية",  icon: "📖" },
  "pocket": { width: 416,  height: 680,  widthCm: 11.0, heightCm: 18.0, label: "Pocket Book",         labelAr: "كتاب جيب",        icon: "✋" },
  "trade":  { width: 576,  height: 864,  widthCm: 15.2, heightCm: 22.9, label: "Professional Trade",  labelAr: "تجاري احترافي",   icon: "📚" },
  "a4":     { width: 794,  height: 1123, widthCm: 21.0, heightCm: 29.7, label: "Standard A4",         labelAr: "A4 قياسي",        icon: "📄" },
};

const DEFAULT_MARGIN = 60; // px — 0.625 inch at 96 dpi (tighter margins = more text per page)

function getPageDimensions(prefs: { paperSize?: string; marginTop?: number; marginBottom?: number; marginLeft?: number; marginRight?: number }) {
  const paper = PAPER_SIZES[prefs.paperSize || "trade"];
  const ml = prefs.marginLeft  ?? DEFAULT_MARGIN;
  const mr = prefs.marginRight ?? DEFAULT_MARGIN;
  const mt = prefs.marginTop   ?? DEFAULT_MARGIN;
  const mb = prefs.marginBottom ?? DEFAULT_MARGIN;
  return {
    pageWidth:    paper.width,
    pageHeight:   paper.height,
    contentWidth: Math.max(180, paper.width  - ml - mr),
    contentHeight: Math.max(200, paper.height - mt - mb),
    marginLeft:   ml,
    marginRight:  mr,
    marginTop:    mt,
    marginBottom: mb,
  };
}

// Legacy fallbacks (used in measurement div until effectivePrefs are loaded)
const PAGE_CONTENT_HEIGHT = 744; // px — Trade 6×9 with 60px margins (864-120)
const PAGE_CONTENT_WIDTH  = 456; // px — 576 - 120

/**
 * Calculate the ideal words per page.
 * contentH = TipTap's total height (fixedHeight). TipTap subtracts 48px top/bottom padding internally.
 * contentW = the text area width (pageWidth − left/right margins = TipTap text area).
 */
function calcWordsPerPage(contentH: number, contentW: number, fontSize: number): number {
  const tiptapPaddingV = 96;  // 48px top + 48px bottom (TipTap CSS padding)
  const lineHeightPx   = fontSize * 1.45;
  // textH: usable vertical space inside TipTap after its own top/bottom padding
  const textH          = Math.max(100, contentH - tiptapPaddingV);
  // textW: contentW already equals the TipTap text area width (page width − page margins)
  const textW          = Math.max(100, contentW);
  const linesPerPage   = Math.floor(textH / lineHeightPx);
  const charsPerLine   = textW / (fontSize * 0.52); // 0.52 ≈ avg char-width ratio for EB Garamond
  const wordsPerLine   = charsPerLine / 5.5;         // ~5.5 chars per word average
  return Math.max(80, Math.floor(linesPerPage * wordsPerLine * 0.90));
}

function getPageText(block: PageBlock): string {
  if (typeof block === "string") return block;
  return block.type === "text" ? block.content : "";
}

function pagesToHtml(pages: PageBlock[]): string {
  // Combine all pages' text
  const combined = pages.map(p => getPageText(p)).filter(t => t.trim()).join('\n\n');
  if (!combined.trim()) return '<p></p>';
  // If already HTML (new format), return as-is
  if (combined.trimStart().startsWith('<')) return combined;
  // Convert plain text paragraphs to HTML
  return combined
    .split(/\n\n+/)
    .map(para => `<p>${para.replace(/\n/g, '<br/>')}</p>`)
    .join('\n');
}

function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/**
 * Split an HTML string into page-sized chunks (~250 words each).
 * Preserves paragraph integrity — never splits inside a tag.
 */
function splitHtmlIntoPages(html: string, wordsPerPage = 250): string[] {
  if (!html || html.replace(/<[^>]*>/g, '').trim() === '') return ['<p></p>'];
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');
  const blocks = Array.from(doc.body.children);
  if (blocks.length === 0) return [html || '<p></p>'];

  const pages: string[] = [];
  let cur: string[] = [];
  let curWords = 0;

  for (const block of blocks) {
    const words = (block.textContent || '').trim().split(/\s+/).filter(Boolean).length;
    if (curWords + words > wordsPerPage && cur.length > 0) {
      pages.push(cur.join(''));
      cur = [block.outerHTML];
      curWords = words;
    } else {
      cur.push(block.outerHTML);
      curWords += words;
    }
  }
  if (cur.length > 0) pages.push(cur.join(''));
  return pages.length > 0 ? pages : ['<p></p>'];
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

  // Load editor fonts lazily (40+ fonts, only when editor opens)
  useEffect(() => { loadEditorFonts(); }, []);

  // Mount sentinel + drag-tail cleanup. The auto-save pipeline kicks off
  // background fetches and a "justSaved" timer that can otherwise fire
  // against an unmounted component when the user navigates fast.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (justSavedTimerRef.current) clearTimeout(justSavedTimerRef.current);
      if (progressAbortRef.current) progressAbortRef.current.abort();
    };
  }, []);

  // Track last accessed for sorting on home page
  useEffect(() => { if (bookId) try { localStorage.setItem(`plotzy_book_accessed_${bookId}`, String(Date.now())); } catch {} }, [bookId]);
  const { resolvedTheme } = useTheme();
  const ar = lang === "ar";

  const { data: chapters, isLoading } = useChapters(bookId);
  const { data: book } = useBook(bookId);
  const updateChapter = useUpdateChapter();
  const updateBook = useUpdateBook();
  const { data: versions = [] } = useChapterVersions(chapterId || null);
  const saveVersion = useSaveVersion(chapterId || null);
  const restoreVersion = useRestoreVersion(chapterId || null);
  const deleteVersion = useDeleteVersion(chapterId || null);

  const chapter = chapters?.find(c => c.id === chapterId);

  const [title, setTitle] = useState("");
  const [pages, setPages] = useState<PageBlock[]>([""]);
  const [richHtml, setRichHtml] = useState<string>('<p></p>');
  const [richPages, setRichPages] = useState<string[]>(['<p></p>']);
  const tiptapEditorRef = useRef<Editor | null>(null);
  const [tiptapReady, setTiptapReady] = useState(false);
  // Tracks the currently focused page editor so the toolbar always reflects the active page
  const [activeToolbarEditor, setActiveToolbarEditor] = useState<Editor | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveInFlightRef = useRef(false);
  // Guards against post-unmount state updates from the auto-save pipeline.
  // performSave kicks off a side-fetch to /progress and a "justSaved" toast
  // timer; both can fire after the user has already navigated away.
  const isMountedRef = useRef(true);
  const justSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressAbortRef = useRef<AbortController | null>(null);
  // Offline-draft recovery state — set when a local IndexedDB copy
  // diverges from the server copy on mount, so we can offer the user
  // the option to restore unsaved work.
  const [recoverableDraft, setRecoverableDraft] = useState<DraftEntry | null>(null);
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Once the user has responded to the recovery banner for this chapter
  // (restore OR discard), don't surface it again for the same mount.
  const draftPromptResolvedRef = useRef(false);
  const [showAI, setShowAI] = useState(false);
  const [showEditorSearch, setShowEditorSearch] = useState(false);
  const [editorSearchQuery, setEditorSearchQuery] = useState("");
  const [editorSearchCount, setEditorSearchCount] = useState(0);
  const [showStoryBible, setShowStoryBible] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showPageStylePicker, setShowPageStylePicker] = useState(false);
  const [prefs, setPrefs] = useState<BookPreferences>({});
  const [previewPrefs, setPreviewPrefs] = useState<BookPreferences | null>(null);
  // effectivePrefs — uses live preview while customizer is open, real prefs otherwise
  const effectivePrefs = previewPrefs ?? prefs;

  // ── Dynamic page dimensions (computed early so useLayoutEffect can use them) ──
  const dynDimsForHook = getPageDimensions(effectivePrefs);

  const [deletingPage, setDeletingPage] = useState<number | null>(null);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isPrintView, setIsPrintView] = useState(false);
  const [isTypewriterMode, setIsTypewriterMode] = useState(() =>
    localStorage.getItem("plotzy-typewriter-mode") === "true"
  );

  // ── Typewriter mode: keep caret centred in every editor ────────────────
  // Works across TipTap (contenteditable), <textarea>, and any other focusable
  // editable surface by listening to the document-level selectionchange event
  // and computing the caret's viewport position from window.getSelection().
  // One rAF-throttled write per change keeps scrolling smooth.
  useEffect(() => {
    if (!isTypewriterMode) return;

    let rafId: number | null = null;
    let lastY = -1;

    const centreCaret = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;

        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;

        const anchor = sel.anchorNode;
        if (!anchor) return;
        const parent = anchor.nodeType === Node.TEXT_NODE
          ? (anchor.parentElement as Element | null)
          : (anchor as Element);
        if (!parent) return;

        // Only react when the caret is inside an editable region. We don't
        // want the document to scroll just because the user clicked on
        // regular text somewhere.
        const editable = parent.closest('[contenteditable="true"], textarea, input[type="text"]');
        if (!editable) return;

        const range = sel.getRangeAt(0).cloneRange();
        range.collapse(true);
        let rect = range.getBoundingClientRect();
        if (!rect || (rect.top === 0 && rect.height === 0)) {
          // Empty line — fall back to the surrounding element's rect.
          rect = parent.getBoundingClientRect();
        }
        if (rect.top === 0 && rect.height === 0) return;

        const lineHeight = parseFloat(getComputedStyle(parent).lineHeight) || 28;
        const targetY = window.scrollY + rect.top - window.innerHeight / 2 + lineHeight / 2;
        const clamped = Math.max(0, targetY);
        if (Math.abs(clamped - lastY) < 4) return; // avoid fighting with smooth scroll
        lastY = clamped;
        window.scrollTo({ top: clamped, behavior: "smooth" });
      });
    };

    document.addEventListener("selectionchange", centreCaret);
    document.addEventListener("keyup", centreCaret);
    document.addEventListener("click", centreCaret);

    // Immediate centre on enable so the user sees the effect right away.
    centreCaret();

    return () => {
      document.removeEventListener("selectionchange", centreCaret);
      document.removeEventListener("keyup", centreCaret);
      document.removeEventListener("click", centreCaret);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [isTypewriterMode]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [restoringSnapId, setRestoringSnapId] = useState<number | null>(null);
  const [showRefPanel, setShowRefPanel] = useState(false);
  const [refChapterId, setRefChapterId] = useState<number | null>(null);
  const [refDropdownOpen, setRefDropdownOpen] = useState(false);

  // ── New: Page Setup modal + Zoom ─────────────────────────────────────────
  const [showPageSetup, setShowPageSetup] = useState(false);
  const [zoom, setZoom] = useState<number>(100);
  const mainRef = useRef<HTMLElement>(null);
  const autoZoomApplied = useRef(false);

  // Reset auto-zoom when chapter changes
  useEffect(() => {
    autoZoomApplied.current = false;
  }, [chapterId]);

  // Sync zoom from prefs when book loads
  useEffect(() => {
    if (prefs.zoom !== undefined) {
      setZoom(prefs.zoom);
      autoZoomApplied.current = true;
    }
  }, [prefs.zoom]);

  // Auto-fit zoom: show the full page height on first load when no saved zoom.
  // Uses effectivePrefs.paperSize as dep (pageDims is derived from it, but declared later).
  const paperSizeForZoom = effectivePrefs.paperSize || "trade";
  useEffect(() => {
    if (autoZoomApplied.current) return;
    const frame = requestAnimationFrame(() => {
      if (!mainRef.current) return;
      const containerH = mainRef.current.clientHeight;
      const containerW = mainRef.current.clientWidth;
      if (containerH < 100) return;
      // Calculate page dimensions inline (same as getPageDimensions)
      const PAPER_H: Record<string, number> = { a5: 794, pocket: 680, trade: 864, a4: 1123 };
      const PAPER_W: Record<string, number> = { a5: 559, pocket: 416, trade: 576, a4: 794 };
      const pageH = PAPER_H[paperSizeForZoom] ?? 864;
      const pageW = PAPER_W[paperSizeForZoom] ?? 576;
      const titleAreaH = 120;
      const pagePaddingV = 80;
      const availableH = containerH - titleAreaH - pagePaddingV;
      const fitByHeight = Math.floor((availableH / pageH) * 100);
      // On mobile, also fit by width (minus some padding)
      const availableW = containerW - 32;
      const fitByWidth = Math.floor((availableW / pageW) * 100);
      // Use the smaller of the two to ensure page fits entirely
      const fitPct = Math.min(fitByHeight, fitByWidth);
      const optimal = Math.max(40, Math.min(95, fitPct));
      setZoom(optimal);
      autoZoomApplied.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [paperSizeForZoom]);

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
          ? (ar ? "⌨️ تم تفعيل تمركز المؤشر" : "⌨️ Center Typing enabled")
          : (ar ? "تم إيقاف تمركز المؤشر" : "Center Typing off"),
        description: next
          ? (ar ? "المؤشر يبقى في منتصف الشاشة والنص هو اللي بيتحرك — زي الآلة الكاتبة." : "Your cursor stays in the middle; the text scrolls beneath it as you write.")
          : undefined,
      });
      return next;
    });
  };

  // Kept for plain <textarea> editors (comments / titles). The main rich
  // editor (TipTap / contenteditable) is handled by the global effect below,
  // which reacts to every caret move regardless of editor implementation.
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

  // Per-page editor refs for cursor management after auto-split
  const pageEditorRefs = useRef<(Editor | null)[]>([]);
  // Which page index should receive focus once its editor mounts (after a split)
  const nextPageFocusRef = useRef<number>(-1);
  // Pages that were freshly created by a user split and need overflow check on mount
  const newSplitPagesRef = useRef<Set<number>>(new Set());
  // Track the last focused editor so image inserts go to the right page
  const lastFocusedPageIdxRef = useRef<number>(0);
  // Debounce timer for the reverse-merge (pull-back) logic
  const mergeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rich Media State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [drawingSize, setDrawingSize] = useState<DrawingSize>('large');
  const [selectedDrawingIdx, setSelectedDrawingIdx] = useState<number | null>(null);
  const [resizingDrawing, setResizingDrawing] = useState<{ idx: number, startX: number, startPct: number } | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState<number | null>(null);
  const [resizingImage, setResizingImage] = useState<{ idx: number, startX: number, startPct: number } | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [floatingImages, setFloatingImages] = useState<Record<number, FloatingImage[]>>({});

  // Voice dictation state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  // Transcribed text held in a review modal so the user can fix mistakes
  // before deciding whether to insert into the current page or just copy.
  // Null when the modal is closed.
  const [transcribedDraft, setTranscribedDraft] = useState<string | null>(null);
  const [transcribedCopied, setTranscribedCopied] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

      // ── Detect v2 format (includes floatingImages) ──────────────────────
      let rawContent = chapter.content;
      let loadedFloatingImages: Record<number, FloatingImage[]> = {};
      try {
        const obj = JSON.parse(rawContent);
        if (obj && obj.v === 2 && typeof obj.pages === 'string') {
          loadedFloatingImages = obj.floatingImages || {};
          rawContent = JSON.stringify([{ type: 'text', content: obj.pages }]);
        }
      } catch {
        // fall through — use original rawContent
      }
      setFloatingImages(loadedFloatingImages);

      const parsed = parsePages(rawContent);
      setPages(parsed);
      const html = pagesToHtml(parsed);
      setRichHtml(html);
      const fontSize = effectivePrefs.fontSize === "text-sm" ? 14 : effectivePrefs.fontSize === "text-base" ? 16 : effectivePrefs.fontSize === "text-xl" ? 20 : effectivePrefs.fontSize === "text-2xl" ? 24 : 16;
      const wpp = calcWordsPerPage(dynDimsForHook.contentHeight, dynDimsForHook.contentWidth, fontSize);
      setRichPages(splitHtmlIntoPages(html, wpp));

      // After loading the server copy, check IndexedDB for a local draft
      // that was never flushed (e.g. the user lost network mid-save or
      // closed the tab before save completed). If the draft differs from
      // what the server has, offer to restore it.
      if (!draftPromptResolvedRef.current) {
        loadDraft(chapter.id).then(draft => {
          if (!draft) return;
          if (draftPromptResolvedRef.current) return;
          if (draft.content === chapter.content && draft.title === chapter.title) {
            // Draft matches what's on the server — no-op and clean up.
            clearDraft(chapter.id).catch(() => {});
            return;
          }
          setRecoverableDraft(draft);
        }).catch(() => {
          // IndexedDB may be unavailable (private mode, quota exceeded).
          // Failure to load a draft is never blocking — the editor still works.
        });
      }
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
          const maxH = dynDimsForHook.contentHeight;
          if (measureEl.offsetHeight > maxH) {
            const chunks = splitIntoPages(text, measureEl, maxH);
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

  /* ── Ctrl+F search in editor ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowEditorSearch(true);
      }
      if (e.key === "Escape" && showEditorSearch) {
        setShowEditorSearch(false);
        setEditorSearchQuery("");
        setEditorSearchCount(0);
        if ((CSS as any).highlights) (CSS as any).highlights.clear();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showEditorSearch]);

  /* ── Search highlights using CSS Custom Highlight API ── */
  useEffect(() => {
    // Clear previous highlights
    if ((CSS as any).highlights) (CSS as any).highlights.clear();

    if (!editorSearchQuery || editorSearchQuery.length < 2 || !showEditorSearch) { setEditorSearchCount(0); return; }

    const editorEl = document.querySelector(".ProseMirror");
    if (!editorEl) return;

    const query = editorSearchQuery.toLowerCase();
    const isWordChar = (c: string) => /\w/.test(c);
    const ranges: Range[] = [];

    // Walk all text nodes in editor
    const walker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT);
    let textNode;
    while ((textNode = walker.nextNode())) {
      const text = textNode.textContent || "";
      const lower = text.toLowerCase();
      let idx = lower.indexOf(query);
      while (idx !== -1) {
        const cb = idx > 0 ? lower[idx - 1] : " ";
        const ca = idx + query.length < lower.length ? lower[idx + query.length] : " ";
        if (!isWordChar(cb) && !isWordChar(ca)) {
          const range = new Range();
          range.setStart(textNode, idx);
          range.setEnd(textNode, idx + query.length);
          ranges.push(range);
        }
        idx = lower.indexOf(query, idx + 1);
      }
    }

    setEditorSearchCount(ranges.length);

    // Apply CSS Custom Highlight
    if (ranges.length > 0 && (CSS as any).highlights) {
      const highlight = new (window as any).Highlight(...ranges);
      (CSS as any).highlights.set("editor-search", highlight);
    }

    // Scroll to first match
    if (ranges.length > 0) {
      const rect = ranges[0].getBoundingClientRect();
      if (rect.top < 0 || rect.top > window.innerHeight) {
        ranges[0].startContainer.parentElement?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [editorSearchQuery, showEditorSearch, richPages]);

  useEffect(() => {
    if (book?.bookPreferences) setPrefs(book.bookPreferences as BookPreferences);
  }, [book]);

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

  useEffect(() => {
    if (!resizingImage) return;
    const { idx, startX, startPct } = resizingImage;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      const newPct = Math.max(20, Math.min(100, startPct + (dx / 508) * 100));
      setPages(prev => {
        const next = [...prev];
        const block = next[idx];
        if (typeof block !== 'string' && block.type === 'image') {
          next[idx] = { ...block, widthPct: Math.round(newPct) };
        }
        return next;
      });
      setIsDirty(true);
    };
    const onUp = () => setResizingImage(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [resizingImage]);

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

    // Create the AbortController synchronously, BEFORE the timeout
    // schedules. The previous code created it inside the setTimeout
    // callback — if the component unmounted before the timer fired,
    // there was nothing to abort, the fetch went out, and on response
    // setSdtLoading/setSdtFindings ran on an unmounted component.
    const ac = new AbortController();
    if (sdtAbortRef.current) sdtAbortRef.current.abort();
    sdtAbortRef.current = ac;
    let cancelled = false;

    sdtDebounceRef.current = setTimeout(async () => {
      if (cancelled) return;
      setSdtLoading(true);
      try {
        const res = await fetch("/api/show-dont-tell", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: currentText, language: lang }),
          credentials: "include",
          signal: ac.signal,
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        const findings: SDTFinding[] = data.findings || [];
        if (findings.length > 0) {
          setSdtFindings(findings);
          setSdtIndex(0);
          setSdtPageIdx(activePageIndex);
        }
      } catch {
        // aborted or network error — ignore
      } finally {
        if (!cancelled) setSdtLoading(false);
      }
    }, 4000);

    return () => {
      cancelled = true;
      if (sdtDebounceRef.current) clearTimeout(sdtDebounceRef.current);
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages[activePageIndex], activePageIndex]);

  // ── Lock all page textareas to the fixed page height ──────────────────────
  // Overflow is handled by the pagination system (handlePageChange), not by
  // letting the textarea grow. Keeping a fixed height preserves the page metaphor.
  useLayoutEffect(() => {
    const h = dynDimsForHook.contentHeight;
    document.querySelectorAll<HTMLTextAreaElement>('[data-page-textarea]').forEach(ta => {
      ta.style.height = `${h}px`;
    });
  }, [pages, effectivePrefs.fontSize, effectivePrefs.lineHeight, effectivePrefs.letterSpacing, dynDimsForHook.contentHeight]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!chapter) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
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

    const currentPageContentH = dynDimsForHook.contentHeight;
    if (textHeight <= currentPageContentH) {
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
      const chunks = splitIntoPages(allText, measureEl, currentPageContentH);

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

  // ── Core save logic (shared between manual save and auto-save) ───────────
  const performSave = useCallback(async (options: { silent?: boolean } = {}) => {
    if (autoSaveInFlightRef.current) return;
    autoSaveInFlightRef.current = true;
    if (!options.silent) setAutoSaving(false);
    else setAutoSaving(true);
    try {
      // Join all rich pages into a single HTML string
      const htmlContent = richPages.join('') || richHtml;
      // v2 format: includes floating images
      const currentContent = JSON.stringify({
        v: 2,
        pages: htmlContent,
        floatingImages: floatingImages,
      });

      // Calculate word count difference for daily tracking
      const previousContent = chapter?.content || "";
      const previousPages = parsePages(previousContent);
      const previousText = previousPages.map(p => typeof p === 'string' ? p : p.type === 'text' ? p.content : '').join(" ").trim();
      const previousWords = previousText ? previousText.split(/\s+/).length : 0;

      const newText = richPages.join('').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const newWords = newText ? newText.split(/\s+/).filter(Boolean).length : 0;

      const wordsAdded = newWords - previousWords;

      await updateChapter.mutateAsync({ id: chapterId, bookId, title, content: currentContent });

      // Save a version snapshot only on manual saves (not every auto-save)
      if (!options.silent) {
        const now = new Date();
        const label = `${now.toLocaleDateString(ar ? "ar" : "en", { month: "short", day: "numeric" })} ${now.toLocaleTimeString(ar ? "ar" : "en", { hour: "2-digit", minute: "2-digit" })}`;
        saveVersion.mutate({ content: currentContent, label });
      }

      // Track progress if there's a net change in words. Abort any prior
      // in-flight progress request so a fast Save → Save chain can't race,
      // and abort on unmount to stop the post-fetch invalidate from firing
      // against a torn-down query client subscription.
      if (wordsAdded !== 0) {
        if (progressAbortRef.current) progressAbortRef.current.abort();
        const ac = new AbortController();
        progressAbortRef.current = ac;
        fetch(`/api/books/${bookId}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wordsAdded }),
          signal: ac.signal,
        }).then(() => {
          if (!isMountedRef.current) return;
          queryClient.invalidateQueries({ queryKey: [`/api/books/${bookId}/progress`] });
        }).catch(err => {
          if (err?.name !== "AbortError") console.error("Failed to track progress:", err);
        });
      }

      if (!isMountedRef.current) return;
      setIsDirty(false);
      // Server now has the canonical copy — drop the local draft so a
      // future mount doesn't falsely prompt for recovery.
      if (chapterId) {
        clearDraft(chapterId).catch(() => {});
      }
      if (!options.silent) {
        setJustSaved(true);
        if (justSavedTimerRef.current) clearTimeout(justSavedTimerRef.current);
        justSavedTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) setJustSaved(false);
        }, 2000);
        toast({ title: ar ? "تم الحفظ!" : "Saved successfully" });
      }
    } catch {
      if (!options.silent) {
        toast({ title: ar ? "فشل الحفظ" : "Failed to save", variant: "destructive" });
      }
    } finally {
      autoSaveInFlightRef.current = false;
      setAutoSaving(false);
    }
  }, [richPages, richHtml, floatingImages, chapter, chapterId, bookId, title, ar, updateChapter, saveVersion, toast]);

  // ── Offline draft persistence ─────────────────────────────────────────
  // While the chapter is dirty (unsaved local changes), write the current
  // state to IndexedDB every second so a network failure, tab crash, or
  // accidental close doesn't lose work. Cleared on successful save.
  useEffect(() => {
    if (!chapterId || !bookId || !isDirty) return;
    // Debounce so rapid typing doesn't thrash the DB.
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(() => {
      // Build the same v2 JSON shape we persist server-side so a restore
      // round-trips without any lossy transform.
      const htmlContent = richPages.join('\n<!-- PAGE_BREAK -->\n');
      const content = JSON.stringify({ v: 2, pages: htmlContent, floatingImages });
      saveDraft({
        chapterId,
        bookId,
        title,
        content,
        savedAt: Date.now(),
      }).catch(() => {
        // IndexedDB may be unavailable — never block editing on a failed
        // local-save. The server save path still provides durability.
      });
    }, 1000);
    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    };
  }, [isDirty, chapterId, bookId, title, richPages, floatingImages]);

  // Restore a locally-saved draft into editor state, then dismiss the banner.
  const handleRestoreDraft = useCallback(() => {
    if (!recoverableDraft) return;
    draftPromptResolvedRef.current = true;

    setTitle(recoverableDraft.title);
    // Parse the draft's v2 content back into the UI's split page model.
    let rawContent = recoverableDraft.content;
    let loadedFloatingImages: Record<number, FloatingImage[]> = {};
    try {
      const obj = JSON.parse(rawContent);
      if (obj && obj.v === 2 && typeof obj.pages === 'string') {
        loadedFloatingImages = obj.floatingImages || {};
        rawContent = JSON.stringify([{ type: 'text', content: obj.pages }]);
      }
    } catch {}
    setFloatingImages(loadedFloatingImages);
    const parsed = parsePages(rawContent);
    setPages(parsed);
    const html = pagesToHtml(parsed);
    setRichHtml(html);
    const fontSize = effectivePrefs.fontSize === "text-sm" ? 14 : effectivePrefs.fontSize === "text-base" ? 16 : effectivePrefs.fontSize === "text-xl" ? 20 : effectivePrefs.fontSize === "text-2xl" ? 24 : 16;
    const wpp = calcWordsPerPage(dynDimsForHook.contentHeight, dynDimsForHook.contentWidth, fontSize);
    setRichPages(splitHtmlIntoPages(html, wpp));
    // Mark as dirty so the user is nudged to save, and so the init
    // effect doesn't immediately overwrite what we just restored with
    // the stale server copy.
    setIsDirty(true);
    setRecoverableDraft(null);
    toast({ title: ar ? "تم استرجاع المسودة" : "Draft restored — don't forget to save" });
  }, [recoverableDraft, effectivePrefs.fontSize, dynDimsForHook, ar, toast]);

  // Discard the local draft and keep the server version.
  const handleDiscardDraft = useCallback(() => {
    if (!recoverableDraft) return;
    draftPromptResolvedRef.current = true;
    clearDraft(recoverableDraft.chapterId).catch(() => {});
    setRecoverableDraft(null);
  }, [recoverableDraft]);

  // Manual save — creates version snapshot + shows toast
  const handleSave = async () => {
    // Cancel any pending auto-save since user is saving manually
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    await performSave({ silent: false });
  };

  // Auto-save disabled — users save manually with Ctrl+S or Save button

  // Warn on browser close/refresh if there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);


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

  const handleZoomChange = (z: number) => {
    const clamped = Math.max(50, Math.min(200, z));
    setZoom(clamped);
    const np = { ...prefs, zoom: clamped };
    setPrefs(np);
    handleSavePrefs(np);
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
            // Open the review modal instead of writing straight into the page.
            // The user reviews/edits the transcription, then chooses whether
            // to insert it at the active page or just copy it to the
            // clipboard.
            setTranscribedDraft(text.trim());
            setTranscribedCopied(false);
          } else {
            toast({ title: ar ? "لم يتم التقاط أي كلام" : "No speech detected" });
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

  // Append the (possibly user-edited) transcription to the active page. Mirrors
  // the original auto-insert behaviour, but only fires when the user confirms
  // it from the review modal.
  const insertTranscriptionAtActivePage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPages(prev => {
      const next = [...prev];
      const idx = activePageIndex < next.length ? activePageIndex : next.length - 1;
      const currentBlock = next[idx];
      if (typeof currentBlock === "string") {
        next[idx] = currentBlock ? currentBlock + " " + trimmed : trimmed;
      } else if (typeof currentBlock === "object" && currentBlock.type === "text") {
        next[idx] = {
          ...currentBlock,
          content: currentBlock.content ? currentBlock.content + " " + trimmed : trimmed,
        };
      } else {
        // Active block is an image / drawing — drop the dictation in a new
        // text block right after it so we don't overwrite media content.
        next.splice(idx + 1, 0, trimmed);
        setActivePageIndex(idx + 1);
      }
      return next;
    });
    setIsDirty(true);
  };

  // ── Rich Media Handling ───────────────────────────────────────────────────

  const insertFloatingImage = (src: string, naturalW: number, naturalH: number, pageIdx: number) => {
    const maxW = dynPageW * 0.5;
    const w = Math.min(maxW, naturalW > 0 ? naturalW : maxW);
    const aspectRatio = naturalH > 0 ? naturalW / naturalH : 4 / 3;
    const h = w / aspectRatio;
    const x = Math.round((dynPageW - w) / 2);
    const y = Math.round((dynPageH - h) / 2);
    const newImg: FloatingImage = {
      id: `fi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      src,
      x,
      y,
      width: Math.round(w),
      height: Math.round(h),
      locked: false,
      aspectRatio,
    };
    setFloatingImages(prev => ({
      ...prev,
      [pageIdx]: [...(prev[pageIdx] || []), newImg],
    }));
    setIsDirty(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    const reader = new FileReader();
    reader.onloadend = () => {
      if (!reader.result) return;
      const src = reader.result as string;
      const pageIdx = lastFocusedPageIdxRef.current ?? activePageIndex;
      const img = new Image();
      img.onload = () => insertFloatingImage(src, img.naturalWidth, img.naturalHeight, pageIdx);
      img.onerror = () => insertFloatingImage(src, 0, 0, pageIdx);
      img.src = src;
    };
    reader.readAsDataURL(file);
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

  const updateImageBlock = (idx: number, updates: Partial<{ widthPct: number; align: DrawingAlign }>) => {
    setPages(prev => {
      const next = [...prev];
      const block = next[idx];
      if (typeof block !== 'string' && block.type === 'image') {
        next[idx] = { ...block, ...updates };
      }
      return next;
    });
    setIsDirty(true);
  };

  const insertImageFromFile = (file: File, targetPageIndex?: number) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (!reader.result) return;
      const src = reader.result as string;
      const pageIdx = targetPageIndex ?? lastFocusedPageIdxRef.current ?? activePageIndex;
      const imgEl = new Image();
      imgEl.onload = () => insertFloatingImage(src, imgEl.naturalWidth, imgEl.naturalHeight, pageIdx);
      imgEl.onerror = () => insertFloatingImage(src, 0, 0, pageIdx);
      imgEl.src = src;
    };
    reader.readAsDataURL(file);
  };

  // ────────────────────────────────────────────────────────────────────────────

  const fontClass = FONT_MAP[effectivePrefs.fontFamily || "serif"] || "";
  const fontStyle = FONT_STYLE_MAP[effectivePrefs.fontFamily || ""] || {};
  const isArabicFont = effectivePrefs.fontFamily?.startsWith("arabic");
  const textDir = (isArabicFont || ar) ? "rtl" : "ltr";
  const isDark = resolvedTheme === "dark";

  // ── Dynamic page dimensions ────────────────────────────────────────────────
  const pageDims = getPageDimensions(effectivePrefs);
  const dynPageW = pageDims.pageWidth;
  const dynPageH = pageDims.pageHeight;
  const dynContentH = pageDims.contentHeight;
  const dynContentW = pageDims.contentWidth;
  const dynMarginL = pageDims.marginLeft;
  const dynMarginR = pageDims.marginRight;
  const dynMarginT = pageDims.marginTop;
  const dynMarginB = pageDims.marginBottom;
  const clampedZoom = zoom / 100;

  // ── Page theme color resolution ───────────────────────────────────────────
  // pageTheme overrides bgColor/textColor unless user explicitly set bgColor
  const pageThemeDef = PAGE_THEMES.find(t => t.id === (effectivePrefs.pageTheme || "white"));

  // Page style background pattern (from saved preference)
  const activePageStyleDef = PAGE_STYLES.find(s => s.id === (effectivePrefs.pageStyle || "blank"));
  const bgPatternCSS = activePageStyleDef ? activePageStyleDef.background(isDark) : {};

  // Manuscript uses its own background color unless user has set a custom one
  // pageTheme takes precedence when set
  const resolvedBgColor = effectivePrefs.bgColor
    || pageThemeDef?.bg
    || (bgPatternCSS as any).backgroundColor;
  const resolvedTextColor = effectivePrefs.textColor
    || pageThemeDef?.text
    || undefined;

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
  const totalWords = richPages.join('').replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;

  /* ── Reference Panel ── */
  const otherChapters = chapters?.filter(c => c.id !== chapterId) ?? [];
  const refChapter = otherChapters.find(c => c.id === refChapterId) ?? null;
  const refParsedPages = refChapter ? parsePages(refChapter.content) : [];
  const refFullText = refParsedPages
    .map(p => (typeof p === 'string' ? p : p.type === 'text' ? p.content : ''))
    .filter(p => p.trim())
    .join('\n\n');
  const refWordCount = refFullText.split(/\s+/).filter(Boolean).length;

  const renderPageContent = (html: string, isFirstPage: boolean) => {
    if (!html || !html.trim()) {
      return <p style={{ color: 'rgba(17,17,17,0.25)', fontStyle: 'italic' }}>Empty page…</p>;
    }
    return (
      <div
        className={isFirstPage ? 'pv-page-first' : 'pv-page'}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
        style={{ fontFamily: fontStyle.fontFamily || "Georgia, 'Times New Roman', serif" }}
      />
    );
  };

  return (
    <div
      className="flex flex-col h-screen overflow-hidden transition-all duration-700"
      style={{ backgroundColor: "#000" }}
    >
      {/* ── Draft-recovery banner — shown only when a local IndexedDB
          copy diverges from the server copy on mount (e.g. the user
          lost network mid-save or closed the tab before save). ── */}
      {recoverableDraft && (
        <div
          role="alert"
          style={{
            position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)",
            zIndex: 60, maxWidth: "min(560px, 92vw)", padding: "10px 14px",
            display: "flex", alignItems: "center", gap: 12,
            background: "#1c1c24", color: "#f4f4f5",
            border: "1px solid rgba(234, 179, 8, 0.35)", borderRadius: 10,
            boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
            fontSize: 13,
          }}
        >
          <div style={{ flex: 1, lineHeight: 1.4 }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>
              {ar ? "وجدنا نسخة محلية لم تُحفظ" : "Unsaved changes from earlier"}
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
              {ar
                ? `محفوظة في متصفحك · ${new Date(recoverableDraft.savedAt).toLocaleString("ar")}`
                : `Saved locally · ${new Date(recoverableDraft.savedAt).toLocaleString()}`}
            </div>
          </div>
          <button
            onClick={handleRestoreDraft}
            style={{
              padding: "6px 12px", borderRadius: 6, border: "none",
              background: "#fff", color: "#111", cursor: "pointer",
              fontSize: 12, fontWeight: 600,
            }}
          >
            {ar ? "استرجاع" : "Restore"}
          </button>
          <button
            onClick={handleDiscardDraft}
            style={{
              padding: "6px 10px", borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent", color: "rgba(255,255,255,0.7)",
              cursor: "pointer", fontSize: 12,
            }}
          >
            {ar ? "تجاهل" : "Discard"}
          </button>
        </div>
      )}

      {/* Subtle vignette in focus mode */}
      {isFocusMode && (
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.7)_100%)] z-[1]" />
      )}

      {/* Typewriter Mode — subtle centre reference line. Neutral white so it
          blends with the editor chrome instead of fighting with the text. */}
      {isTypewriterMode && (
        <div className="fixed inset-x-0 pointer-events-none z-40" style={{ top: "50vh" }}>
          <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className="h-px w-full"
              style={{
                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 20%, rgba(255,255,255,0.15) 80%, transparent 100%)",
              }}
            />
          </div>
        </div>
      )}

      {/* Editor Header */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-xl border-b border-border/30 transition-opacity duration-500 ${isFocusMode ? "opacity-20 hover:opacity-100 bg-black/40 border-transparent" : ""}`}
        style={{ backgroundColor: isFocusMode ? undefined : "#2a2a2a" }}
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-5 h-12 flex items-center justify-between relative z-10 gap-2">

          {/* ── Left: Back + stats ── */}
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/books/${bookId}`} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors group shrink-0">
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform rtl-flip" />
              <span className="hidden sm:block">{t("backToBook")}</span>
            </Link>
            <span className="text-[10px] text-muted-foreground/40 hidden sm:block whitespace-nowrap">
              {totalWords} {ar ? "كلمة" : "w"} · {richPages.length} {ar ? "ص" : "pg"}
            </span>
          </div>

          {/* ── Center: tool icons ── */}
          <div className="flex items-center gap-0.5 flex-1 justify-center overflow-x-auto" style={{ scrollbarWidth: "none" }}>

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
                aria-label={ar ? "إيقاف التسجيل" : "Stop recording"}
                data-testid="button-stop-recording"
              >
                <Square className="w-3 h-3 fill-current" />
                <span className="font-mono">{formatTime(recordingTime)}</span>
              </button>
            ) : (
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors text-muted-foreground" onClick={startRecording} title={ar ? "تسجيل صوتي" : "Voice dictation"} aria-label={ar ? "تسجيل صوتي" : "Voice dictation"} data-testid="button-start-recording">
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

            <Button variant="ghost" size="icon" className={`w-8 h-8 rounded-lg transition-colors ${isTypewriterMode ? "text-foreground bg-white/10" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"}`} onClick={toggleTypewriterMode} title={ar ? "تمركز المؤشر — النص يتحرك، المؤشر يبقى في منتصف الشاشة" : "Center Typing — keep the cursor in the middle of the screen as you type"}>
              <AlignCenter className="w-4 h-4" />
            </Button>

            <Button variant="ghost" size="icon" className={`w-8 h-8 rounded-lg transition-colors ${isFocusMode ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"}`} onClick={() => setIsFocusMode(!isFocusMode)} title={ar ? "وضع التركيز" : "Focus Mode"}>
              {isFocusMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>

            <div className="w-px h-5 bg-border/40 mx-1" />

            <Button variant="ghost" size="icon" className={`w-8 h-8 rounded-lg transition-colors relative ${showVersionHistory ? "text-foreground bg-white/10" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"}`} onClick={() => setShowVersionHistory(v => !v)} title={ar ? "سجل الإصدارات" : "Version History"}>
              <History className="w-4 h-4" />
              {versions.length > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white" />}
            </Button>
          </div>

          {/* ── Right: Search + AI + Save ── */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Search toggle */}
            <button
              className="h-8 px-2.5 rounded-lg text-xs flex items-center gap-1 transition-all"
              style={{ background: showEditorSearch ? "rgba(250,204,21,0.15)" : "transparent", color: showEditorSearch ? "#fbbf24" : "rgba(255,255,255,0.4)", border: showEditorSearch ? "1px solid rgba(250,204,21,0.3)" : "1px solid transparent" }}
              onClick={() => {
                if (showEditorSearch) {
                  setShowEditorSearch(false); setEditorSearchQuery(""); setEditorSearchCount(0);
                  if ((CSS as any).highlights) (CSS as any).highlights.clear();
                } else { setShowEditorSearch(true); }
              }}
              title="Search (Ctrl+F)"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <button
              className="h-8 px-3 rounded-lg text-xs font-semibold gap-1.5 hidden sm:flex items-center transition-all hover:opacity-90 hover:-translate-y-px active:translate-y-0"
              style={{ background: "linear-gradient(135deg, #d4a017 0%, #f5c518 50%, #e8a020 100%)", color: "#5a3a00", boxShadow: "0 2px 8px rgba(212,160,23,0.45)" }}
              onClick={() => setShowAI(true)}
              data-testid="button-ai-assistant"
            >
              <Wand2 className="w-3.5 h-3.5" />
              {t("aiAssistant")}
            </button>

            {autoSaving && (
              <span className="h-8 px-2 rounded-lg text-[10px] font-medium flex items-center gap-1 text-muted-foreground opacity-70">
                <Loader2 className="w-3 h-3 animate-spin" />
                {ar ? "حفظ تلقائي..." : "Auto-saving..."}
              </span>
            )}
            <button
              className={`h-8 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                justSaved
                  ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 cursor-default"
                  : updateChapter.isPending
                    ? "cursor-wait"
                    : "hover:-translate-y-px"
              }`}
              style={{ background: justSaved ? undefined : "#fff", color: justSaved ? "#fff" : "#000" }}
              onClick={updateChapter.isPending || justSaved ? undefined : handleSave}
              disabled={updateChapter.isPending}
              data-testid="button-save"
            >
              {updateChapter.isPending
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{t("saving")}</>
                : justSaved
                  ? <><CheckCircle2 className="w-3.5 h-3.5" />{ar ? "محفوظ" : "Saved"}</>
                  : isDirty
                    ? <><Save className="w-3.5 h-3.5" />{ar ? "حفظ" : "Save"}</>
                    : <><CheckCircle2 className="w-3.5 h-3.5 opacity-60" />{ar ? "محفوظ" : "Saved"}</>
              }
            </button>
          </div>

        </div>
      </header>

      {/* ── Rich Writing Toolbar (Google Docs style) ── */}
      {!isPrintView && (
        <RichWritingToolbar
          editor={activeToolbarEditor || (tiptapReady ? tiptapEditorRef.current : null)}
          zoom={zoom}
          onZoomChange={handleZoomChange}
          onPrint={() => setIsPrintView(true)}
          isFocusMode={isFocusMode}
          isDark={isDark}
          paperSize={effectivePrefs.paperSize || "trade"}
          onPaperSizeChange={(id) => {
            const np = { ...prefs, paperSize: id };
            setPrefs(np);
            handleSavePrefs(np);
          }}
        />
      )}

      {/* CSS for search highlights */}
      <style>{`::highlight(editor-search) { background: rgba(250, 204, 21, 0.4); color: inherit; }`}</style>

      {/* ── Editor Search Bar ── */}
      {showEditorSearch && (
        <div className="flex items-center gap-2 px-4 py-2 shrink-0 z-30" style={{ background: "rgba(0,0,0,0.9)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
          <input
            autoFocus value={editorSearchQuery}
            onChange={e => setEditorSearchQuery(e.target.value)}
            placeholder={ar ? "ابحث في النص..." : "Search in text..."}
            className="flex-1 bg-transparent border-none outline-none text-sm"
            style={{ color: "#fff" }}
            onKeyDown={e => {
              if (e.key === "Escape") { setShowEditorSearch(false); setEditorSearchQuery(""); }
              if (e.key === "Enter" && editorSearchQuery.length >= 2) {
                // Use browser native find to jump to and highlight
                (window as any).find(editorSearchQuery, false, false, true);
              }
            }}
          />
          {editorSearchCount > 0 && (
            <>
              <span className="text-xs shrink-0" style={{ color: "rgba(250,204,21,0.8)" }}>{editorSearchCount} {ar ? "نتيجة" : "found"}</span>
              <button onClick={() => (window as any).find(editorSearchQuery, false, false, true)}
                className="text-xs px-2 py-0.5 rounded" style={{ color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.06)" }}>
                {ar ? "التالي" : "Next"} ↓
              </button>
            </>
          )}
          {editorSearchQuery && editorSearchCount === 0 && (
            <span className="text-xs shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>{ar ? "لا نتائج" : "No results"}</span>
          )}
          <button onClick={() => { setShowEditorSearch(false); setEditorSearchQuery(""); setEditorSearchCount(0); if ((CSS as any).highlights) (CSS as any).highlights.clear(); }}
            style={{ color: "rgba(255,255,255,0.3)" }}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

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
        ref={mainRef}
        className="flex-1 overflow-y-auto relative transition-colors duration-700"
        style={{
          background: "transparent",
          paddingTop: effectivePrefs.showRuler ? 0 : 40,
          paddingBottom: isTypewriterMode ? "50vh" : 40,
        }}
      >
        {/* ── Visual Ruler ── */}
        {effectivePrefs.showRuler && !isPrintView && (
          <div
            className="sticky top-0 z-30 flex items-center"
            style={{
              height: 24,
              background: isDark ? "rgba(30,30,35,0.97)" : "rgba(248,248,250,0.97)",
              borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
              backdropFilter: "blur(8px)",
            }}
          >
            <div
              className="mx-auto relative"
              style={{ width: dynPageW * clampedZoom, userSelect: "none" }}
            >
              {/* Ruler body */}
              <div className="relative w-full h-full" style={{ fontSize: 8, color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)", lineHeight: 1 }}>
                {Array.from({ length: Math.floor(dynPageW / 10) + 1 }, (_, i) => {
                  const xPct = (i * 10 / dynPageW) * 100;
                  const isMajor = i % 5 === 0;
                  const inLeftMargin = i * 10 < dynMarginL;
                  const inRightMargin = i * 10 > dynPageW - dynMarginR;
                  return (
                    <div key={i} className="absolute top-0 flex flex-col items-center" style={{ left: `${xPct}%` }}>
                      <div style={{
                        width: 1, height: isMajor ? 12 : 6,
                        background: inLeftMargin || inRightMargin
                          ? "rgba(99,102,241,0.35)"
                          : (isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.18)"),
                        marginTop: isMajor ? 0 : 6,
                      }} />
                      {isMajor && <span style={{ marginTop: 1, fontSize: 7, lineHeight: 1, whiteSpace: "nowrap" }}>{i * 10}</span>}
                    </div>
                  );
                })}
                {/* Left margin indicator */}
                <div className="absolute top-0 bottom-0" style={{
                  left: `${(dynMarginL / dynPageW) * 100}%`,
                  width: 1, background: "rgba(99,102,241,0.55)",
                }} />
                {/* Right margin indicator */}
                <div className="absolute top-0 bottom-0" style={{
                  left: `${((dynPageW - dynMarginR) / dynPageW) * 100}%`,
                  width: 1, background: "rgba(99,102,241,0.55)",
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Zoom wrapper */}
        <div
          style={{
            transform: `scale(${clampedZoom})`,
            transformOrigin: "top center",
            transition: "transform 0.2s ease",
          }}
        >

        {/* Chapter Title — above all pages */}
        <div className="mx-auto px-4 mb-8" style={{ maxWidth: dynPageW }}>
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

        {/* ── TipTap Rich Editor — multi-page layout ── */}
        <div
          className="flex flex-col items-center gap-6 px-4 pb-24"
          onClick={() => { setSelectedDrawingIdx(null); setSelectedImageIdx(null); }}
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setIsDraggingOver(true); }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingOver(false); }}
          onDrop={e => {
            e.preventDefault();
            setIsDraggingOver(false);
            const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'));
            if (file) insertImageFromFile(file);
          }}
          style={isDraggingOver ? { outline: '2px dashed #7c6af7', outlineOffset: '-4px', borderRadius: 8 } : undefined}
        >

          {/* ── Page dimension badge ── */}
          {(() => {
            const ps = PAPER_SIZES[effectivePrefs.paperSize || "trade"];
            if (!ps) return null;
            return (
              <div
                className="flex items-center gap-2 select-none"
                style={{ alignSelf: "center" }}
              >
                <div
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                    color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)"}`,
                    letterSpacing: "0.03em",
                  }}
                >
                  <span>{ar ? ps.labelAr : ps.label}</span>
                  <span style={{ opacity: 0.5 }}>·</span>
                  <span>{ps.widthCm} × {ps.heightCm} cm</span>
                </div>
              </div>
            );
          })()}

          {richPages.map((pageHtml, index) => {
            const pageCardBg = isFocusMode
              ? "rgba(18,18,22,0.96)"
              : resolvedBgColor || (isDark ? "#1e1e22" : "#faf9f6");
            // Layered shadow — simulates paper resting on a desk
            const pageBoxShadow = activePageIndex === index
              ? `0 1px 1px rgba(0,0,0,0.14), 0 2px 2px rgba(0,0,0,0.12), 0 4px 4px rgba(0,0,0,0.10), 0 8px 8px rgba(0,0,0,0.08), 0 16px 32px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.08), 0 0 0 2px hsl(var(--primary)/25%)`
              : `0 1px 1px rgba(0,0,0,0.10), 0 2px 2px rgba(0,0,0,0.08), 0 4px 4px rgba(0,0,0,0.07), 0 8px 8px rgba(0,0,0,0.05), 0 16px 32px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,${isDark ? "0.20" : "0.07"})`;
            return (
              <div
                key={`${chapterId}-page-${index}`}
                className="relative w-full group"
                style={{ maxWidth: dynPageW }}
                ref={el => { pageElsRef.current[index] = el; }}
                onClick={() => setActivePageIndex(index)}
              >
                <div
                  className="relative overflow-hidden"
                  style={{
                    width: "100%",
                    height: dynPageH,
                    backgroundColor: pageCardBg,
                    // Layered backgrounds: paper gradient + pattern + grain noise
                    backgroundImage: isFocusMode
                      ? undefined
                      : [
                          // Paper-light gradient (top to bottom)
                          !isDark && !resolvedBgColor
                            ? "linear-gradient(180deg, #fdfcf8 0%, #faf9f4 50%, #f7f5ee 100%)"
                            : null,
                          // User-chosen pattern
                          (bgPatternCSS as any).backgroundImage || null,
                          // Subtle grain/noise for paper texture feel
                          !isDark && !resolvedBgColor
                            ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.028'/%3E%3C/svg%3E")`
                            : null,
                        ].filter(Boolean).join(", "),
                    backgroundSize: isFocusMode
                      ? undefined
                      : [
                          !isDark && !resolvedBgColor ? "100% 100%" : null,
                          (bgPatternCSS as any).backgroundSize || null,
                          !isDark && !resolvedBgColor ? "200px 200px" : null,
                        ].filter(Boolean).join(", "),
                    backgroundAttachment: "local",
                    boxShadow: pageBoxShadow,
                    transition: "box-shadow 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Page header */}
                  <div
                    className="flex items-end justify-between select-none"
                    style={{ paddingLeft: dynMarginL, paddingRight: dynMarginR, paddingTop: Math.max(16, dynMarginT * 0.4), paddingBottom: 8 }}
                    dir="ltr"
                  >
                    <span className="text-[9px] tracking-[0.18em] uppercase opacity-20 font-semibold" style={{ color: resolvedTextColor || effectivePrefs.textColor || undefined }}>
                      {effectivePrefs.headerText || (ar ? `فصل · صفحة ${index + 1}` : `Chapter · Page ${index + 1}`)}
                    </span>
                    {richPages.length > 1 && (
                      <button
                        onMouseDown={e => e.preventDefault()}
                        onClick={(e) => { e.stopPropagation(); setRichPages(prev => prev.filter((_, i) => i !== index)); setIsDirty(true); }}
                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        title={ar ? "حذف الصفحة" : "Delete page"}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div style={{ marginLeft: dynMarginL, marginRight: dynMarginR, height: 1, opacity: 0.12, background: resolvedTextColor || effectivePrefs.textColor || "currentColor" }} />

                  {/* TipTap editor for this page */}
                  <RichChapterEditor
                    key={`${chapterId}-tiptap-${index}`}
                    initialContent={pageHtml}
                    onUpdate={(html) => {
                      // Simple state update — overflow is handled by onSplitNeeded below
                      setRichPages(prev => {
                        const next = [...prev];
                        next[index] = html;
                        return next;
                      });
                      setIsDirty(true);
                    }}
                    onSplitNeeded={(fitsHtml, overflowHtml) => {
                      const nextIdx = index + 1;
                      nextPageFocusRef.current = nextIdx;
                      // Mark this page as freshly created so it gets overflow check on mount
                      newSplitPagesRef.current.add(nextIdx);
                      setRichPages(prev => {
                        const next = [...prev];
                        next[index] = fitsHtml;
                        if (next[nextIdx] !== undefined) {
                          // Prepend overflow before existing next-page content
                          const existing = next[nextIdx];
                          const existingIsEmpty = existing.replace(/<[^>]*>/g, '').trim() === '';
                          next[nextIdx] = existingIsEmpty ? overflowHtml : overflowHtml + existing;
                        } else {
                          next.push(overflowHtml);
                        }
                        return next;
                      });
                      setIsDirty(true);
                      // Try to focus next page immediately (it may already be mounted)
                      requestAnimationFrame(() => {
                        const nextEditor = pageEditorRefs.current[nextIdx];
                        if (nextEditor && !nextEditor.isDestroyed) {
                          nextEditor.commands.focus('start');
                          nextPageFocusRef.current = -1;
                        }
                        // else: will be handled in onEditorReady
                      });
                    }}
                    onHeightChange={(scrollH) => {
                      // Debounced reverse-merge: if this page has a lot of free space
                      // and the next page exists, try to pull one block back
                      if (mergeDebounceRef.current) clearTimeout(mergeDebounceRef.current);
                      mergeDebounceRef.current = setTimeout(() => {
                        // freeSpace = how many px scrollHeight can grow before real
                        // overflow.  scrollH already includes top+bottom padding,
                        // so comparing directly to dynContentH is correct.
                        const freeSpace = dynContentH - scrollH;
                        // Only attempt merge if there's meaningful free space
                        if (freeSpace < 60) return;
                        setRichPages(prev => {
                          const nextPageHtml = prev[index + 1];
                          if (!nextPageHtml) return prev;
                          // Parse next page to extract its first block
                          const parser = new DOMParser();
                          const doc = parser.parseFromString(`<body>${nextPageHtml}</body>`, 'text/html');
                          const firstBlock = doc.body.children[0] as HTMLElement | undefined;
                          if (!firstBlock) return prev;
                          // Estimate if the first block fits using word count as a proxy
                          const firstBlockWords = (firstBlock.textContent || '').split(/\s+/).filter(Boolean).length;
                          const currentWords = (prev[index].replace(/<[^>]*>/g, ' ').match(/\S+/g) || []).length;
                          const currentFontSize =
                            effectivePrefs.fontSize === "text-sm" ? 14 :
                            effectivePrefs.fontSize === "text-base" ? 16 :
                            effectivePrefs.fontSize === "text-xl" ? 20 :
                            effectivePrefs.fontSize === "text-2xl" ? 24 : 16;
                          const wpp = calcWordsPerPage(dynContentH, dynContentW, currentFontSize);
                          // Use a conservative threshold (85% of wpp) to avoid pulling too much
                          if (currentWords + firstBlockWords > wpp * 0.85) return prev;
                          const next = [...prev];
                          next[index] = prev[index] + firstBlock.outerHTML;
                          const remaining = Array.from(doc.body.children)
                            .slice(1)
                            .map(c => c.outerHTML)
                            .join('');
                          if (!remaining || remaining.replace(/<[^>]*>/g, '').trim() === '') {
                            next.splice(index + 1, 1);
                          } else {
                            next[index + 1] = remaining;
                          }
                          return next;
                        });
                      }, 400);
                    }}
                    onEditorReady={(editor) => {
                      pageEditorRefs.current[index] = editor;
                      tiptapEditorRef.current = editor;
                      // Clear the new-split mark now that the page has mounted
                      newSplitPagesRef.current.delete(index);
                      if (index === 0) {
                        setTiptapReady(true);
                        setActiveToolbarEditor(editor);
                      }
                      // If this page was queued to receive focus after a split
                      if (nextPageFocusRef.current === index) {
                        nextPageFocusRef.current = -1;
                        requestAnimationFrame(() => {
                          if (!editor.isDestroyed) editor.commands.focus('start');
                        });
                      }
                    }}
                    onFocus={(editor) => {
                      tiptapEditorRef.current = editor;
                      setActiveToolbarEditor(editor);
                      lastFocusedPageIdxRef.current = index;
                    }}
                    fontFamily={effectivePrefs.fontFamily || 'eb-garamond'}
                    fontSize={
                      effectivePrefs.fontSize === "text-sm" ? 14 :
                      effectivePrefs.fontSize === "text-base" ? 16 :
                      effectivePrefs.fontSize === "text-xl" ? 20 :
                      effectivePrefs.fontSize === "text-2xl" ? 24 : 16
                    }
                    lineHeight={LINE_HEIGHT_MAP[effectivePrefs.lineHeight || "normal"] || "1.45"}
                    textColor={isFocusMode ? '#e4e4e7' : resolvedTextColor || undefined}
                    bgColor="transparent"
                    textAlign={(effectivePrefs.textAlign as string) || "left"}
                    direction={textDir}
                    placeholder={index === 0
                      ? (ar ? "ابدأ بكتابة فصلك هنا..." : "Start writing your chapter here...")
                      : (ar ? "تابع قصتك..." : "Continue your story...")}
                    fixedHeight={dynContentH}
                    zoom={100}
                    checkOverflowOnMount={newSplitPagesRef.current.has(index)}
                  />

                  {/* Page footer */}
                  <div style={{ marginLeft: dynMarginL, marginRight: dynMarginR, height: 1, opacity: 0.1, background: resolvedTextColor || effectivePrefs.textColor || "currentColor", marginTop: 8 }} />
                  <div className="flex items-center justify-center select-none" style={{ paddingTop: 10, paddingBottom: Math.max(16, dynMarginB * 0.45) }}>
                    {(effectivePrefs.showPageNumbers !== false) && (
                      <span className="text-[10px] opacity-30" style={{ color: resolvedTextColor || effectivePrefs.textColor || undefined }}>
                        {`— ${index + 1} —`}
                      </span>
                    )}
                  </div>

                  {/* Floating image overlay — absolutely positioned over the whole page */}
                  <FloatingImageOverlay
                    images={floatingImages[index] || []}
                    pageWidth={dynPageW}
                    pageHeight={dynPageH}
                    zoom={zoom}
                    ar={ar}
                    onUpdate={(updated) => {
                      setFloatingImages(prev => ({ ...prev, [index]: updated }));
                      setIsDirty(true);
                    }}
                  />
                </div>
                <div className="absolute -bottom-1 left-2 right-2 h-3 rounded-b-sm opacity-[0.07] blur-sm" style={{ background: "black" }} />
              </div>
            );
          })}

          {/* ─────────────────────────────────────────────────── */}
          {/* LEGACY pages.map() — hidden, kept for SDT/sidebar ref */}
          {false && pages.map((pageContent, index) => {
            const pageText = getPageText(pageContent);
            const pageWords = countWords(pageText);

            return (
              <div key={index} className="relative group" style={{ width: dynPageW }} ref={el => { pageElsRef.current[index] = el; }}>

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
                  {/* Page top margin area — header text + chapter label */}
                  <div
                    className="flex items-end justify-between select-none"
                    style={{ paddingLeft: dynMarginL, paddingRight: dynMarginR, paddingTop: Math.max(16, dynMarginT * 0.4), paddingBottom: 8 }}
                    dir="ltr"
                  >
                    <div className="flex-1 min-w-0">
                      {effectivePrefs.headerText ? (
                        <span className="text-[10px] font-medium opacity-40 truncate block" style={{ color: resolvedTextColor || effectivePrefs.textColor || undefined }}>
                          {effectivePrefs.headerText}
                        </span>
                      ) : (
                        <span className="text-[9px] tracking-[0.18em] uppercase opacity-20 font-semibold" style={{ color: resolvedTextColor || effectivePrefs.textColor || undefined }}>
                          {ar ? `فصل · صفحة ${index + 1}` : `Chapter · Page ${index + 1}`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
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
                  <div style={{ marginLeft: dynMarginL, marginRight: dynMarginR, height: 1, opacity: 0.12, background: resolvedTextColor || effectivePrefs.textColor || "currentColor" }} />

                  {/* Page Content Area */}
                  <div
                    style={{ paddingLeft: dynMarginL, paddingRight: dynMarginR, paddingTop: Math.max(16, dynMarginT * 0.5), paddingBottom: Math.max(16, dynMarginB * 0.5), cursor: "text" }}
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
                          ta.style.height = `${Math.max(dynContentH, ta.scrollHeight)}px`;
                          handlePageChange(index, e.target.value);
                        }}
                        onFocus={() => setActivePageIndex(index)}
                        placeholder={index === 0
                          ? (ar ? "ابدأ بكتابة فصلك هنا..." : "Start writing your chapter here...")
                          : (ar ? "تابع قصتك..." : "Continue your story...")}
                        className={`w-full bg-transparent outline-none resize-none ${effectivePrefs.fontSize || "text-lg"} placeholder:opacity-20 focus:ring-0 transition-colors duration-700 ${blockFontClass}`}
                        style={{
                          ...blockFontStyle,
                          color: isFocusMode ? '#e4e4e7' : resolvedTextColor || undefined,
                          backgroundColor: effectivePrefs.highlightColor && effectivePrefs.highlightColor !== "#fef08a"
                            ? `${effectivePrefs.highlightColor}18` : "transparent",
                          direction: textDir,
                          minHeight: `${dynContentH}px`,
                          height: `${dynContentH}px`,
                          overflow: "hidden",
                          lineHeight: LINE_HEIGHT_MAP[effectivePrefs.lineHeight || "normal"] || "1.45",
                          letterSpacing: LETTER_SPACING_MAP[effectivePrefs.letterSpacing || "normal"] || "0em",
                          fontWeight: effectivePrefs.isBold ? 700 : undefined,
                          fontStyle: effectivePrefs.isItalic ? "italic" : undefined,
                          textDecoration: effectivePrefs.isUnderline ? "underline" : undefined,
                          textAlign: (effectivePrefs.textAlign as React.CSSProperties["textAlign"]) || undefined,
                          width: dynContentW,
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
                        if (typeof pageContent === 'string') return null;

                        // ── Image block ─────────────────────────────────
                        if (pageContent.type === 'image') {
                          const imgBlock = pageContent;
                          const rawPct = imgBlock.widthPct ?? 100;
                          const align = imgBlock.align || 'center';
                          const justifyMap: Record<DrawingAlign, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };
                          const isSelected = selectedImageIdx === index;
                          return (
                            <div
                              className="w-full select-none"
                              style={{ paddingTop: '16px', paddingBottom: '16px', display: 'flex', justifyContent: justifyMap[align] }}
                              onClick={(e) => { e.stopPropagation(); setSelectedImageIdx(index); setSelectedDrawingIdx(null); setActivePageIndex(index); }}
                            >
                              <div className="relative" style={{ width: `${rawPct}%`, minWidth: '80px' }}>
                                {/* Floating toolbar */}
                                {isSelected && (
                                  <div
                                    className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-1 rounded-xl shadow-xl z-10 whitespace-nowrap"
                                    style={{ background: '#1a1a1d', border: '1px solid rgba(255,255,255,0.12)' }}
                                    onMouseDown={e => e.stopPropagation()}
                                  >
                                    {([
                                      { a: 'left' as DrawingAlign, icon: <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor"><rect x="0" y="0" width="12" height="2" rx="1"/><rect x="0" y="4" width="8" height="2" rx="1"/><rect x="0" y="8" width="10" height="2" rx="1"/></svg> },
                                      { a: 'center' as DrawingAlign, icon: <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor"><rect x="0" y="0" width="12" height="2" rx="1"/><rect x="2" y="4" width="8" height="2" rx="1"/><rect x="1" y="8" width="10" height="2" rx="1"/></svg> },
                                      { a: 'right' as DrawingAlign, icon: <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor"><rect x="0" y="0" width="12" height="2" rx="1"/><rect x="4" y="4" width="8" height="2" rx="1"/><rect x="2" y="8" width="10" height="2" rx="1"/></svg> },
                                    ]).map(({ a, icon }) => (
                                      <button key={a} onClick={() => updateImageBlock(index, { align: a })}
                                        className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
                                        style={{ background: align === a ? 'rgba(255,255,255,0.18)' : 'transparent', color: align === a ? '#fff' : 'rgba(255,255,255,0.45)' }}
                                      >{icon}</button>
                                    ))}
                                    <div className="w-px h-4 mx-0.5" style={{ background: 'rgba(255,255,255,0.12)' }} />
                                    {([{ label: 'S', pct: 42 }, { label: 'M', pct: 64 }, { label: 'L', pct: 86 }, { label: '↔', pct: 100 }]).map(opt => (
                                      <button key={opt.label} onClick={() => updateImageBlock(index, { widthPct: opt.pct })}
                                        className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold transition-colors"
                                        style={{ background: Math.abs(rawPct - opt.pct) < 5 ? 'rgba(255,255,255,0.18)' : 'transparent', color: Math.abs(rawPct - opt.pct) < 5 ? '#fff' : 'rgba(255,255,255,0.45)' }}
                                      >{opt.label}</button>
                                    ))}
                                    <div className="w-px h-4 mx-0.5" style={{ background: 'rgba(255,255,255,0.12)' }} />
                                    <span className="text-[9px] tabular-nums px-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{rawPct}%</span>
                                    <div className="w-px h-4 mx-0.5" style={{ background: 'rgba(255,255,255,0.12)' }} />
                                    <button
                                      onClick={() => { setPages(prev => { const n = [...prev]; n.splice(index, 1); return n.length ? n : [""]; }); setIsDirty(true); setSelectedImageIdx(null); }}
                                      className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
                                      style={{ color: 'rgba(239,68,68,0.6)' }}
                                      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(239,68,68,1)')}
                                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(239,68,68,0.6)')}
                                    ><Trash2 className="w-3 h-3" /></button>
                                  </div>
                                )}
                                <img
                                  src={imgBlock.content}
                                  alt={`Image ${index + 1}`}
                                  draggable={false}
                                  style={{
                                    width: '100%',
                                    display: 'block',
                                    borderRadius: '6px',
                                    boxShadow: isSelected ? '0 0 0 2px #7c6af7, 0 4px 24px rgba(0,0,0,0.18)' : '0 2px 12px rgba(0,0,0,0.10)',
                                    transition: 'box-shadow 0.15s',
                                    cursor: 'pointer',
                                  }}
                                />
                                {/* Resize handle */}
                                {isSelected && (
                                  <div
                                    className="absolute bottom-0 right-0 w-5 h-5 flex items-end justify-end cursor-ew-resize z-10"
                                    style={{ transform: 'translate(50%, 50%)' }}
                                    onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setResizingImage({ idx: index, startX: e.clientX, startPct: rawPct }); }}
                                  >
                                    <div className="w-3 h-3 rounded-full shadow-md" style={{ background: '#7c6af7', border: '2px solid #fff' }} />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // ── Drawing block ────────────────────────────────
                        const drawBlock = pageContent.type === 'drawing' ? pageContent : null;
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
                            onClick={(e) => { e.stopPropagation(); setSelectedDrawingIdx(index); setSelectedImageIdx(null); setActivePageIndex(index); }}
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

                  {/* Page bottom — decorative rule + footer */}
                  <div style={{ marginLeft: dynMarginL, marginRight: dynMarginR, height: 1, opacity: 0.1, background: resolvedTextColor || effectivePrefs.textColor || "currentColor", marginTop: 8 }} />
                  {(() => {
                    const pgPos = effectivePrefs.pageNumPosition || "center";
                    const isOuter = pgPos === "outer";
                    // outer: odd pages (1,3,5…) → left; even → right
                    const resolvedPos = isOuter ? ((index % 2 === 0) ? "left" : "right") : pgPos;
                    const justifyClass = resolvedPos === "left" ? "justify-start" : resolvedPos === "right" ? "justify-end" : "justify-center";
                    const pgFmt = effectivePrefs.pageNumFormat || "dashes";
                    const pgN = index + 1;
                    const pgLabel =
                      pgFmt === "plain"    ? `${pgN}` :
                      pgFmt === "dots"     ? `· ${pgN} ·` :
                      pgFmt === "brackets" ? `[ ${pgN} ]` :
                      pgFmt === "word"     ? `Page ${pgN}` :
                      pgFmt === "slash"    ? `${pgN} / ${pages.length}` :
                      `— ${pgN} —`;
                    const pgOpacity = effectivePrefs.pageNumOpacity ?? (effectivePrefs.pageNumColor ? 0.75 : 0.3);
                    return (
                      <div
                        className={`relative flex items-center ${justifyClass} select-none`}
                        style={{ paddingLeft: dynMarginL, paddingRight: dynMarginR, paddingTop: 10, paddingBottom: Math.max(16, dynMarginB * 0.45) }}
                      >
                        {/* Footer text — opposite side from page number */}
                        <span
                          className="absolute text-[9px] opacity-25 truncate"
                          style={{
                            [isRTL ? "right" : "left"]: resolvedPos === "right" ? undefined : dynMarginL,
                            [isRTL ? "left" : "right"]: resolvedPos === "right" ? dynMarginR : undefined,
                            color: resolvedTextColor || effectivePrefs.textColor || undefined,
                          }}
                        >
                          {effectivePrefs.footerText ? effectivePrefs.footerText : `${pageWords} ${ar ? "كلمة" : "w"}`}
                        </span>
                        {/* Page number */}
                        {(effectivePrefs.showPageNumbers !== false) && (
                          <span className="group/pgnum relative inline-flex items-center gap-1">
                            <span
                              style={{
                                fontSize: effectivePrefs.pageNumSize ? `${effectivePrefs.pageNumSize}px` : "11px",
                                fontFamily: effectivePrefs.pageNumFont || "inherit",
                                color: effectivePrefs.pageNumColor || resolvedTextColor || effectivePrefs.textColor || undefined,
                                letterSpacing: "0.2em",
                                fontWeight: effectivePrefs.pageNumBold ? 700 : 400,
                                fontStyle: effectivePrefs.pageNumItalic ? "italic" : "normal",
                                fontVariant: effectivePrefs.pageNumSmallCaps ? "small-caps" : "normal",
                                opacity: pgOpacity,
                              }}
                            >
                              {pgLabel}
                            </span>
                            {/* Hover edit button */}
                            <button
                              onClick={e => { e.stopPropagation(); setShowPageSetup(true); }}
                              title={ar ? "تخصيص رقم الصفحة" : "Customize page number"}
                              className="opacity-0 group-hover/pgnum:opacity-100 transition-opacity"
                              style={{
                                width: 16, height: 16, borderRadius: 4,
                                background: "hsl(var(--primary))",
                                border: "none", cursor: "pointer",
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0, marginLeft: 2,
                              }}
                            >
                              <Pencil style={{ width: 8, height: 8, color: "#fff" }} />
                            </button>
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Page shadow/curl effect */}
                <div className="absolute -bottom-1 left-2 right-2 h-3 rounded-b-sm opacity-[0.07] blur-sm"
                  style={{ background: "black" }} />
              </div>
            );
          })}

          {/* Add Page Button */}
          <div className="flex flex-col items-center gap-3 mt-2 w-full" style={{ maxWidth: dynPageW }}>
            <Button
              variant="ghost"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { setRichPages(prev => [...prev, '<p></p>']); setIsDirty(true); }}
              className="w-full rounded-sm border border-dashed border-border/30 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all py-5 text-sm font-medium gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              {ar ? "إضافة صفحة جديدة" : "Add new page"}
            </Button>
          </div>
        </div>

        </div>{/* end zoom wrapper */}

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
            width: `${dynContentW}px`,
            fontSize: effectivePrefs.fontSize === "text-sm" ? "14px" : effectivePrefs.fontSize === "text-base" ? "16px" : effectivePrefs.fontSize === "text-xl" ? "20px" : effectivePrefs.fontSize === "text-2xl" ? "24px" : "16px",
            lineHeight: LINE_HEIGHT_MAP[effectivePrefs.lineHeight || "normal"] || "1.45",
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

      {/* Voice dictation review modal — user reviews/edits the transcription
          and chooses where it goes (insert into active page, copy to clipboard,
          or cancel). Replaces the older "auto-insert" flow that surprised the
          user when their cursor was on a different page. */}
      {transcribedDraft !== null && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setTranscribedDraft(null)}
          dir={isRTL ? "rtl" : "ltr"}
        >
          <div
            className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[80vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-base">
                  {ar ? "مراجعة التسجيل الصوتي" : "Review your transcription"}
                </h3>
              </div>
              <button
                onClick={() => setTranscribedDraft(null)}
                className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"
                aria-label={ar ? "إغلاق" : "Close"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 flex-1 overflow-auto">
              <p className="text-xs text-muted-foreground mb-3">
                {ar
                  ? "صحّح أي كلمات لم تُلتقط بشكل صحيح، ثم اختر ماذا تريد أن تفعل بالنص."
                  : "Fix any words that were misheard, then choose what to do with the text."}
              </p>
              <textarea
                value={transcribedDraft}
                onChange={e => { setTranscribedDraft(e.target.value); setTranscribedCopied(false); }}
                autoFocus
                rows={8}
                className="w-full p-3 rounded-lg bg-muted/50 border border-border text-sm leading-relaxed font-serif resize-y outline-none focus:border-primary"
                dir="auto"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-3 border-t border-border bg-muted/30">
              <button
                onClick={() => setTranscribedDraft(null)}
                className="px-3 h-9 rounded-lg text-sm text-muted-foreground hover:bg-muted"
              >
                {ar ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(transcribedDraft);
                    setTranscribedCopied(true);
                    setTimeout(() => setTranscribedCopied(false), 1800);
                  } catch {
                    toast({ title: ar ? "تعذر النسخ" : "Could not copy", variant: "destructive" });
                  }
                }}
                className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm bg-muted hover:bg-muted/70 border border-border"
              >
                {transcribedCopied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    {ar ? "تم النسخ" : "Copied"}
                  </>
                ) : (
                  ar ? "نسخ" : "Copy"
                )}
              </button>
              <button
                onClick={() => {
                  insertTranscriptionAtActivePage(transcribedDraft);
                  setTranscribedDraft(null);
                  toast({ title: ar ? "تمت الإضافة إلى الصفحة" : "Added to your page" });
                }}
                disabled={!transcribedDraft.trim()}
                className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {ar ? "إدراج في الصفحة" : "Insert in page"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  lineHeight: '1.45',
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

      {/* Page Setup Modal */}
      {showPageSetup && (
        <PageSetupModal
          prefs={prefs}
          setPrefs={setPrefs}
          handleSavePrefs={handleSavePrefs}
          isDark={isDark}
          ar={ar}
          onClose={() => setShowPageSetup(false)}
        />
      )}

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
                <History className="w-4 h-4 text-foreground" />
                <span className="font-semibold text-sm">{ar ? "سجل الإصدارات" : "Version History"}</span>
                {versions.length > 0 && (
                  <span className="text-[10px] bg-white/10 text-foreground rounded-full px-1.5 py-0.5 font-medium border border-white/10">{versions.length}</span>
                )}
              </div>
              <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8" onClick={() => setShowVersionHistory(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Info bar */}
            <div className="px-4 py-2.5 bg-white/[0.03] border-b border-white/5 flex-shrink-0">
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
                    className="group relative p-3 rounded-xl border border-border/30 hover:border-white/20 hover:bg-white/[0.03] transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {i === 0 && (
                            <span className="text-[9px] bg-white text-black rounded-full px-1.5 py-0.5 font-semibold uppercase tracking-wide">
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
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10"
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
                className="w-full rounded-xl text-xs gap-2 border-white/20 text-foreground hover:bg-white/10 hover:border-white/30"
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
          liveSample={getPageText(pages[activePageIndex] ?? "")}
        />
      )}

      {/* Print View Overlay */}
      {isPrintView && (
        <PrintPreview
          printPages={printPages}
          currentSpread={currentSpread}
          setCurrentSpread={setCurrentSpread}
          maxSpread={maxSpread}
          fontStyle={fontStyle}
          prefs={prefs}
          resolvedBgColor={resolvedBgColor}
          title={title}
          bookTitle={book?.title || ''}
          authorName={book?.authorName || ''}
          ar={ar}
          onClose={() => setIsPrintView(false)}
          renderPageContent={renderPageContent}
        />
      )}
    </div>
  );
}
