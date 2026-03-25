import { useState, useEffect, useRef } from "react";
import { EtherealShadow } from "@/components/ui/etheral-shadow";
import { useRoute, Link, useLocation } from "wouter";
import { useChapters, useUpdateChapter, useDeleteChapter } from "@/hooks/use-chapters";
import { useBook, useUpdateBook } from "@/hooks/use-books";
import { useChapterVersions, useSaveVersion, useRestoreVersion, useDeleteVersion } from "@/hooks/use-chapter-versions";
import { AIAssistant } from "@/components/ai-assistant";
import { BookCustomizer } from "@/components/book-customizer";
import { StoryBible } from "@/components/story-bible";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2, Trash2, Wand2, Palette, PlusCircle, X, FileText, Mic, Square, Eye, EyeOff, BookOpen, Image as ImageIcon, PenTool, CheckCircle2, Layers, Printer, ChevronLeft, ChevronRight, AlignCenter, History, RotateCcw, Clock, PanelRight, BookMarked, ChevronDown } from "lucide-react";
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
  "arabic-sans": "",
  "arabic-serif": "",
};

const FONT_STYLE_MAP: Record<string, React.CSSProperties> = {
  "arabic-sans": { fontFamily: "'Cairo', sans-serif" },
  "arabic-serif": { fontFamily: "'Amiri', serif" },
};

export type PageBlock =
  | string
  | { type: 'text' | 'image' | 'drawing', content: string };

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

// ── Fixed Page Dimensions (A5 proportional) ──────────────────────────────────
// Page card is 560px wide with 52px horizontal padding on each side.
// Content area width = 560 - 104 = 456px.
// Page card height is A5 proportional: 560 × (297/210) ≈ 792px
// Vertical padding: 56px top + 56px bottom → content height ≈ 680px
const PAGE_CONTENT_HEIGHT = 676; // px — textarea height (fixed)
const PAGE_CONTENT_WIDTH  = 456; // px — matches content area inside page card

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

  // Voice dictation state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const printScrollRef = useRef<HTMLDivElement>(null);

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

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!chapter) {
    return <div className="text-center py-20">{ar ? "الفصل غير موجود." : "Chapter not found."}</div>;
  }

  const handlePageChange = (index: number, value: string) => {
    const measureEl = measureRef.current;

    if (!measureEl) {
      // Fallback with no measurement — just update
      setPages(prev => {
        const next = [...prev];
        const cur = next[index];
        next[index] = typeof cur === "object" && cur !== null && cur.type === "text"
          ? { ...cur, content: value }
          : value;
        return next;
      });
      setIsDirty(true);
      return;
    }

    // Measure the full text height
    measureEl.textContent = value;
    const textHeight = measureEl.offsetHeight;

    if (textHeight <= PAGE_CONTENT_HEIGHT) {
      // Fits on this page — normal update
      setPages(prev => {
        const next = [...prev];
        const cur = next[index];
        next[index] = typeof cur === "object" && cur !== null && cur.type === "text"
          ? { ...cur, content: value }
          : value;
        return next;
      });
      setIsDirty(true);
      return;
    }

    // Overflow — split into page-sized chunks and distribute
    const chunks = splitIntoPages(value, measureEl, PAGE_CONTENT_HEIGHT);

    setPages(prev => {
      const next = [...prev];

      // Replace current page with first chunk
      const cur = next[index];
      next[index] = typeof cur === "object" && cur !== null && cur.type === "text"
        ? { ...cur, content: chunks[0] }
        : chunks[0];

      // Distribute remaining chunks into subsequent pages
      for (let i = 1; i < chunks.length; i++) {
        const targetIndex = index + i;
        if (targetIndex < next.length) {
          const existing = getPageText(next[targetIndex]);
          // Prepend overflow; if existing page also overflows it will be caught on next change
          next[targetIndex] = existing.trim()
            ? chunks[i] + "\n" + existing
            : chunks[i];
        } else {
          next.push(chunks[i]);
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
    setPrefs(newPrefs);
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
        if (typeof currentBlock === 'string' && !currentBlock.trim() && pages.length === 1) {
          next[activePageIndex] = { type: 'drawing', content: base64 };
        } else {
          next.splice(activePageIndex + 1, 0, { type: 'drawing', content: base64 });
          next.splice(activePageIndex + 2, 0, "");
          setTimeout(() => setActivePageIndex(activePageIndex + 2), 50);
        }
        return next;
      });
      setIsDirty(true);
      setShowCanvas(false);
      // Reset canvas for next time
      canvasRef.current.clearCanvas();
    } catch (e) {
      console.error(e);
      toast({ title: ar ? "فشل حفظ الرسم" : "Failed to save drawing", variant: "destructive" });
    }
  };

  // ────────────────────────────────────────────────────────────────────────────

  const fontClass = FONT_MAP[prefs.fontFamily || "serif"] || "";
  const fontStyle = FONT_STYLE_MAP[prefs.fontFamily || ""] || {};
  const textDir = (prefs.fontFamily?.startsWith("arabic") || ar) ? "rtl" : "ltr";
  const isDark = resolvedTheme === "dark";

  // Page style background pattern (from saved preference)
  const activePageStyleDef = PAGE_STYLES.find(s => s.id === (prefs.pageStyle || "blank"));
  const bgPatternCSS = activePageStyleDef ? activePageStyleDef.background(isDark) : {};

  // Manuscript uses its own background color unless user has set a custom one
  const resolvedBgColor = prefs.bgColor || (bgPatternCSS as any).backgroundColor;

  const editorOuterStyle: React.CSSProperties = {
    backgroundColor: resolvedBgColor || "hsl(var(--background))",
    backgroundImage: (bgPatternCSS as any).backgroundImage,
    backgroundSize: (bgPatternCSS as any).backgroundSize,
    backgroundAttachment: "local",
  };

  const pageStyle: React.CSSProperties = {
    color: prefs.textColor || undefined,
    ...fontStyle,
  };
  const totalWords = pages.join(" ").split(/\s+/).filter(Boolean).length;

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
      className="min-h-screen transition-all duration-700 relative"
      style={{ backgroundColor: "#000" }}
    >
      {/* Animated Etheral Shadow — always visible background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <EtherealShadow
          color="rgba(30, 30, 30, 1)"
          animation={{ scale: 100, speed: 90 }}
          noise={{ opacity: 0.6, scale: 1.2 }}
          sizing="fill"
          style={{ width: "100%", height: "100%" }}
        />
      </div>

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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative z-10">
          <Link href={`/books/${bookId}`} className="flex items-center text-sm font-semibold text-muted-foreground hover:text-primary transition-colors group">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform rtl-flip" />
            {t("backToBook")}
          </Link>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground/60 mr-1 hidden sm:block">
              {pages.length} {ar ? (pages.length === 1 ? "صفحة" : "صفحات") : (pages.length === 1 ? "page" : "pages")}
              {" · "}
              {totalWords} {ar ? "كلمة" : "words"}
            </span>

            {/* Voice dictation button */}
            {isTranscribing ? (
              <div className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-primary/10 text-primary text-xs font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:block">{ar ? "جارٍ التحويل..." : "Transcribing..."}</span>
              </div>
            ) : isRecording ? (
              <button
                onClick={stopRecording}
                className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors animate-pulse"
                title={ar ? "إيقاف التسجيل" : "Stop recording"}
                data-testid="button-stop-recording"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span className="font-mono">{formatTime(recordingTime)}</span>
              </button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors text-muted-foreground"
                onClick={startRecording}
                title={ar ? "تسجيل صوتي" : "Dictate with voice"}
                data-testid="button-start-recording"
              >
                <Mic className="w-4 h-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl hover:bg-primary/10 hover:text-primary transition-colors hidden sm:flex"
              onClick={() => setShowStoryBible(true)}
              title={ar ? "الكتاب المقدس للقصة" : "Story Bible"}
            >
              <BookOpen className="w-5 h-5" />
            </Button>

            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl hover:bg-primary/10 hover:text-primary transition-colors hidden md:flex"
              onClick={() => fileInputRef.current?.click()}
              title={ar ? "إدراج صورة" : "Insert Image"}
            >
              <ImageIcon className="w-5 h-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl hover:bg-primary/10 hover:text-primary transition-colors hidden md:flex"
              onClick={() => setShowCanvas(true)}
              title={ar ? "رسم حر" : "Hand draw sketch"}
            >
              <PenTool className="w-5 h-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl hover:bg-primary/10 hover:text-primary transition-colors hidden sm:flex"
              onClick={() => setShowCustomizer(true)}
              title={t("settings")}
            >
              <Palette className="w-5 h-5" />
            </Button>

            {/* Page Style Picker */}
            <div className="relative hidden sm:block">
              <Button
                variant="ghost"
                size="icon"
                className={`rounded-xl transition-colors ${showPageStylePicker || (prefs.pageStyle && prefs.pageStyle !== "blank") ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}
                onClick={() => setShowPageStylePicker(v => !v)}
                title="Page Style"
              >
                <Layers className="w-5 h-5" />
              </Button>
              {showPageStylePicker && (
                <PageStylePicker
                  currentStyle={prefs.pageStyle || "blank"}
                  isDark={isDark}
                  onSelect={(styleId) => {
                    const newPrefs = { ...prefs, pageStyle: styleId };
                    setPrefs(newPrefs);
                    handleSavePrefs(newPrefs);
                  }}
                  onClose={() => setShowPageStylePicker(false)}
                />
              )}
            </div>

            <div className="w-px h-6 bg-border/30 mx-1 hidden sm:block" />

            <AmbientSoundscape />

            <Button
              variant="ghost"
              size="icon"
              className={`rounded-xl transition-colors hidden sm:flex ${showRefPanel ? "text-sky-500 bg-sky-500/10" : "text-muted-foreground hover:bg-sky-500/10 hover:text-sky-500"}`}
              onClick={() => {
                setShowRefPanel(v => !v);
                if (!refChapterId && otherChapters.length > 0) setRefChapterId(otherChapters[0].id);
              }}
              title={ar ? "عرض مرجعي — فتح فصل آخر للقراءة بجانب كتابتك" : "Reference Mode — view another chapter alongside your writing"}
            >
              <PanelRight className="w-5 h-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={`rounded-xl transition-colors ${isPrintView ? "text-foreground bg-foreground/10" : "text-muted-foreground hover:bg-foreground/10 hover:text-foreground"}`}
              onClick={() => { setIsPrintView(v => !v); setCurrentSpread(0); }}
              title={ar ? "معاينة الطباعة" : "Print View"}
            >
              <Printer className="w-5 h-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={`rounded-xl transition-colors ${isTypewriterMode ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500"}`}
              onClick={toggleTypewriterMode}
              title={ar ? "وضع الآلة الكاتبة — يُبقي المؤشر في مركز الشاشة" : "Typewriter Mode — keeps cursor centered"}
            >
              <AlignCenter className="w-5 h-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={`rounded-xl transition-colors ${isFocusMode ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}
              onClick={() => setIsFocusMode(!isFocusMode)}
              title={ar ? "وضع التركيز" : "Focus Mode"}
            >
              {isFocusMode ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors">
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
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg">
                    {t("delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="w-px h-6 bg-border/30 mx-1" />

            <Button
              variant="ghost"
              size="icon"
              className={`rounded-xl transition-colors relative ${showVersionHistory ? "text-violet-500 bg-violet-500/10" : "text-muted-foreground hover:bg-violet-500/10 hover:text-violet-500"}`}
              onClick={() => setShowVersionHistory(v => !v)}
              title={ar ? "سجل الإصدارات" : "Version History"}
            >
              <History className="w-5 h-5" />
              {versions.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-violet-500" />
              )}
            </Button>

            <div className="w-px h-6 bg-border/30 mx-1" />

            <Button
              variant="outline"
              className="rounded-xl border-2 border-secondary/30 hover:border-secondary hover:bg-secondary/10 transition-all"
              onClick={() => setShowAI(true)}
              data-testid="button-ai-assistant"
            >
              <Wand2 className="w-4 h-4 mr-2 text-secondary" />
              {t("aiAssistant")}
            </Button>

            <button
              style={justSaved
                ? { background: "#10b981", color: "#fff", border: "none", borderRadius: "12px", fontWeight: 600, padding: "8px 18px", display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", cursor: "default", boxShadow: "0 4px 14px rgba(16,185,129,0.35)", transition: "all 0.2s" }
                : { background: "hsl(var(--primary))", color: "#fff", border: "none", borderRadius: "12px", fontWeight: 600, padding: "8px 18px", display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 14px hsl(var(--primary) / 0.35)", transition: "all 0.2s" }
              }
              onClick={updateChapter.isPending || justSaved ? undefined : handleSave}
              disabled={updateChapter.isPending}
              data-testid="button-save"
              onMouseEnter={e => { if (!justSaved && !updateChapter.isPending) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
            >
              {updateChapter.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" />{t("saving")}</>
                : justSaved
                  ? <><CheckCircle2 className="w-4 h-4" />{ar ? "محفوظ" : "Saved"}</>
                  : <><Save className="w-4 h-4" />{t("save")}</>
              }
            </button>
          </div>
        </div>
      </header>

      {/* Editor Canvas — book-desk background */}
      <main
        className="relative z-10 py-10 md:py-14 transition-all duration-700 min-h-screen"
        style={{
          background: "transparent",
          paddingBottom: isTypewriterMode ? "50vh" : undefined,
          paddingRight: showRefPanel ? '410px' : undefined,
          transition: 'padding-right 0.3s ease',
        }}
      >
        {/* Chapter Title — above all pages */}
        <div className="max-w-[560px] mx-auto px-4 mb-8">
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
        <div className="flex flex-col items-center gap-10 px-4">
          {pages.map((pageContent, index) => {
            const pageText = getPageText(pageContent);
            const pageWords = countWords(pageText);

            return (
              <div key={index} className="relative group w-full max-w-[560px]">

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
                  {/* Page top strip — number + recording indicator */}
                  <div className="flex items-center justify-between px-[52px] pt-5 pb-2 select-none" dir="ltr">
                    <span className="text-[10px] tracking-widest uppercase opacity-25 font-medium" style={{ color: prefs.textColor || undefined }}>
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
                  <div className="mx-[52px] h-px opacity-10" style={{ background: prefs.textColor || "currentColor" }} />

                  {/* Page Content Area */}
                  <div className="px-[52px] py-9">
                    {typeof pageContent === 'string' || pageContent.type === 'text' ? (
                      <textarea
                        value={typeof pageContent === 'string' ? pageContent : pageContent.content}
                        onChange={(e) => handlePageChange(index, e.target.value)}
                        onFocus={() => setActivePageIndex(index)}
                        placeholder={index === 0
                          ? (ar ? "ابدأ بكتابة فصلك هنا..." : "Start writing your chapter here...")
                          : (ar ? "تابع قصتك..." : "Continue your story...")}
                        className={`w-full bg-transparent outline-none resize-none ${prefs.fontSize || "text-lg"} placeholder:opacity-20 focus:ring-0 leading-[1.9] transition-colors duration-700 ${fontClass}`}
                        style={{
                          ...fontStyle,
                          color: isFocusMode ? '#e4e4e7' : prefs.textColor || undefined,
                          direction: textDir,
                          height: `${PAGE_CONTENT_HEIGHT}px`,
                          overflow: "hidden",
                        } as React.CSSProperties}
                        dir={textDir}
                        data-page-textarea
                        data-testid={`textarea-page-${index}`}
                        onKeyDown={(e) => {
                          if (e.key.length === 1 || e.key === "Backspace" || e.key === "Enter" || e.key === " ") {
                            playTypewriterSound(isFocusMode);
                            if (isTypewriterMode) scrollToCursorCenter(e.currentTarget as HTMLTextAreaElement);
                          }
                        }}
                      />
                    ) : (
                      <div
                        className="relative w-full overflow-hidden rounded-lg"
                        style={{ height: `${PAGE_CONTENT_HEIGHT}px` }}
                        onClick={() => setActivePageIndex(index)}
                      >
                        <img
                          src={pageContent.content}
                          alt={`Page ${index + 1} image`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                  </div>

                  {/* Page bottom — word count + page number */}
                  <div className="mx-[52px] h-px opacity-10 mb-3" style={{ background: prefs.textColor || "currentColor" }} />
                  <div className="flex items-center justify-between px-[52px] pb-5 select-none" dir="ltr">
                    <span className="text-[10px] opacity-20 tabular-nums" style={{ color: prefs.textColor || undefined }}>
                      {pageWords} {ar ? "كلمة" : "words"}
                    </span>
                    <span className="text-[10px] opacity-25 font-medium" style={{ color: prefs.textColor || undefined }}>
                      {index + 1}
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
          <div className="flex flex-col items-center gap-3 pb-24 mt-2 w-full max-w-[560px]">
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
            fontSize: prefs.fontSize === "text-sm" ? "14px" : prefs.fontSize === "text-base" ? "16px" : prefs.fontSize === "text-xl" ? "20px" : prefs.fontSize === "text-2xl" ? "24px" : "18px",
            lineHeight: "1.9",
            fontFamily: fontStyle.fontFamily || undefined,
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

      {/* ── Reference Panel (read-only side panel) ── */}
      <div
        className="fixed top-[65px] bottom-0 z-[90] flex flex-col transition-all duration-300 ease-in-out"
        style={{
          right: showRefPanel ? 0 : '-420px',
          width: '400px',
          background: 'hsl(var(--background))',
          borderLeft: '1px solid hsl(var(--border)/40%)',
          boxShadow: showRefPanel ? '-8px 0 32px rgba(0,0,0,0.12)' : 'none',
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

      {/* Backdrop dimmer when ref panel open */}
      {showRefPanel && (
        <div
          className="fixed inset-0 z-[89] pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.0)' }}
          onClick={() => setShowRefPanel(false)}
        />
      )}

      {showAI && (
        <AIAssistant
          bookId={bookId}
          currentContent={pages.join("\n\n---\n\n")}
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
          onClose={() => setShowCustomizer(false)}
        />
      )}

      {/* Hand Draw Canvas Modal */}
      {showCanvas && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md p-4 sm:p-8 animate-in fade-in duration-300">
          <div className="w-full max-w-5xl h-full max-h-[85vh] bg-card border border-border/40 shadow-2xl rounded-3xl flex flex-col overflow-hidden relative">

            {/* Modal Header */}
            <div className="h-16 border-b border-border/20 px-6 flex items-center justify-between bg-muted/20">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <PenTool className="w-5 h-5 text-primary" />
                {ar ? "المسودة الحرة" : "Sketch Canvas"}
              </h3>
              <button
                onClick={() => setShowCanvas(false)}
                className="p-2 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Canvas Toolbar */}
            <div className="p-4 flex flex-wrap items-center gap-4 bg-background/50 border-b border-border/10 justify-center">
              <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-xl">
                <button onClick={() => setCanvasColor("#000000")} className={`w-8 h-8 rounded-full bg-black border-2 transition-transform hover:scale-110 ${canvasColor === "#000000" ? "border-primary scale-110" : "border-transparent"}`} />
                <button onClick={() => setCanvasColor("#ef4444")} className={`w-8 h-8 rounded-full bg-red-500 border-2 transition-transform hover:scale-110 ${canvasColor === "#ef4444" ? "border-primary scale-110" : "border-transparent"}`} />
                <button onClick={() => setCanvasColor("#3b82f6")} className={`w-8 h-8 rounded-full bg-blue-500 border-2 transition-transform hover:scale-110 ${canvasColor === "#3b82f6" ? "border-primary scale-110" : "border-transparent"}`} />
                <button onClick={() => setCanvasColor("#22c55e")} className={`w-8 h-8 rounded-full bg-green-500 border-2 transition-transform hover:scale-110 ${canvasColor === "#22c55e" ? "border-primary scale-110" : "border-transparent"}`} />
                <input
                  type="color"
                  value={canvasColor}
                  onChange={e => setCanvasColor(e.target.value)}
                  className="w-8 h-8 rounded-full overflow-hidden cursor-pointer"
                />
              </div>

              <div className="w-px h-8 bg-border/20 mx-2" />

              <div className="flex items-center gap-3 bg-muted/30 p-1.5 px-4 rounded-xl">
                <span className="text-xs font-medium text-muted-foreground">{ar ? "حجم الفرشاة:" : "Brush Size:"} {canvasStroke}px</span>
                <input
                  type="range"
                  min="1" max="20"
                  value={canvasStroke}
                  onChange={e => setCanvasStroke(parseInt(e.target.value))}
                  className="w-32 accent-primary"
                />
              </div>

              <div className="w-px h-8 bg-border/20 mx-2" />

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => canvasRef.current?.undo()} className="rounded-lg">
                  {ar ? "تراجع" : "Undo"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => canvasRef.current?.clearCanvas()} className="rounded-lg text-muted-foreground hover:text-destructive">
                  {ar ? "مسح" : "Clear"}
                </Button>
              </div>
            </div>

            {/* React Sketch Canvas */}
            <div className="flex-1 w-full bg-white cursor-crosshair relative dark:bg-[#080808]">
              <ReactSketchCanvas
                ref={canvasRef}
                strokeWidth={canvasStroke}
                strokeColor={canvasColor}
                className="w-full h-full border-none shadow-inner"
                canvasColor="transparent"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border/20 flex justify-end gap-3 bg-muted/10">
              <Button variant="ghost" onClick={() => setShowCanvas(false)} className="rounded-xl">
                {ar ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={handleSaveDrawing} className="rounded-xl bg-primary text-primary-foreground gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {ar ? "حفظ وإدراج" : "Save & Insert"}
              </Button>
            </div>
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
