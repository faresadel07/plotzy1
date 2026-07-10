import { useState, useRef, useEffect, lazy, Suspense } from "react";

// Share modal lazy-loaded — includes QR generator and inline social
// glyphs, no reason to pay its ~15 KB gzip on every book-details load.
const ShareBookModal = lazy(() => import("@/components/ShareBookModal").then((m) => ({ default: m.ShareBookModal })));
import { createPortal } from "react-dom";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { AuthModal } from "@/components/auth-modal";
import { useBook, useUpdateBook, useGenerateCover, useGenerateBlurb } from "@/hooks/use-books";
import { useChapters, useCreateChapter, useUpdateChapter, useReorderChapters, useDeleteChapter } from "@/hooks/use-chapters";
import { ConfirmModal } from "@/components/confirm-modal";
import { usePublishBook } from "@/hooks/use-public-library";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { NiceSelect } from "@/components/ui/nice-select";
import AnalyticsDashboard from "@/components/analytics-dashboard";
import { ResearchBoard } from "@/components/research-board";
import { AIAnalysisTools } from "@/components/ai-analysis-tools";
import { BookPublishingTools } from "@/components/book-publishing-tools";
import LegacyImporter from "@/components/LegacyImporter";
import { StickyNote as StudioStickyNote } from "@/components/mobile/StickyNote";
import { PaperBall } from "@/components/mobile/PaperBall";
import { Mark } from "@/components/mobile/Marker";

// A small decorative strip for the studio tabs: one sticky with a short
// handwritten line plus a couple of crumpled drafts. It lives in normal
// flow (no overlap possible on any viewport), with the balls tucked
// into the strip's empty start side.
function StudioFlair({ ar, note }: { ar: boolean; note: string }) {
  return (
    <div aria-hidden style={{ display: "flex", justifyContent: "flex-end", position: "relative", margin: "2px 0 -4px" }}>
      <PaperBall size={30} rot={-20} style={{ position: "absolute", insetInlineStart: 4, top: 10 }} />
      <PaperBall size={20} rot={30} style={{ position: "absolute", insetInlineStart: 48, top: 32 }} />
      <StudioStickyNote ar={ar} size={74} rot={5} text={note} />
    </div>
  );
}
import {
  FileText, Image as ImageIcon, Loader2, Plus, Wand2, Calendar, Sparkles,
  BookOpen, Palette, PenLine, Zap, Download, FileDown, Upload, Globe,
  BarChart3, ScrollText, Check, Edit3, Target, ChevronDown, Quote, User, Eye, EyeOff,
  GripVertical, BookMarked, Users, Copy, Trash2, X as XIcon, Send,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { BookPages } from "@/shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { useIsPhone } from "@/hooks/use-is-phone";

const RTL_LANGS = ["ar", "he", "fa", "ur"];

// Extracts plain text from serialized chapter content (PageBlock[])
function extractChapterText(content: string): string {
  try {
    const blocks = JSON.parse(content);
    if (Array.isArray(blocks)) {
      return blocks.map((b: unknown) => {
        if (typeof b === "string") return b;
        if (b && typeof b === "object" && "content" in b && typeof (b as { content: unknown }).content === "string") return (b as { content: string }).content;
        return "";
      }).join(" ");
    }
  } catch {}
  return content;
}

function countChapterWords(content: string): number {
  const text = extractChapterText(content).trim();
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

// Book cover component — realistic book look, fully contained.
// Prop typed structurally (only the fields used) to decouple from the
// drifted @/shared/schema Book type vs. the wire-accurate api-schemas
// Book — caller can pass either.
function BookCoverWrap({ book }: { book: { title: string; coverImage?: string | null; spineColor?: string | null; authorName?: string | null } }) {
  const spineColor = book.spineColor || "#7c3aed";

  return (
    <div
      className="flex items-center justify-center py-6 md:py-8 book-details-cover-wrap"
      style={{ background: `linear-gradient(160deg, ${spineColor}18 0%, ${spineColor}08 100%)` }}
    >
      {/* Book wrapper — spine + front cover side by side, no overflow */}
      <div
        className="relative flex rounded-sm overflow-hidden book-details-cover"
        style={{
          boxShadow: "6px 8px 28px rgba(0,0,0,0.28), 2px 3px 10px rgba(0,0,0,0.14)",
          height: "230px",
        }}
      >
        {/* Spine */}
        <div
          className="flex-shrink-0 flex items-center justify-center"
          style={{
            width: "12px",
            background: `linear-gradient(180deg, ${spineColor}f0 0%, ${spineColor} 50%, ${spineColor}cc 100%)`,
            boxShadow: "inset -1px 0 4px rgba(0,0,0,0.22)",
          }}
        />

        {/* Front cover */}
        <div className="relative overflow-hidden" style={{ width: "163px" }}>
          {book.coverImage ? (
            <img
              src={book.coverImage}
              alt={`${book.title} cover`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex flex-col justify-between p-4 relative"
              style={{ background: `linear-gradient(150deg, ${spineColor}cc 0%, ${spineColor} 100%)` }}
            >
              {/* Subtle diagonal lines */}
              <div className="absolute inset-0 opacity-[0.07]" style={{
                backgroundImage: `repeating-linear-gradient(135deg, white 0px, white 1px, transparent 1px, transparent 10px)`,
              }} />
              {/* Title area */}
              <div className="relative z-10">
                <div className="w-6 h-0.5 bg-white/50 rounded mb-3" />
                <p className="text-white font-bold text-sm leading-snug line-clamp-4 drop-shadow-sm">{book.title}</p>
              </div>
              {/* Author */}
              {book.authorName && (
                <p className="relative z-10 text-white/60 text-[10px] font-medium truncate">{book.authorName}</p>
              )}
            </div>
          )}
          {/* Inner binding shadow */}
          <div className="absolute top-0 left-0 bottom-0 w-2 pointer-events-none"
            style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.15), transparent)" }}
          />
        </div>
      </div>
    </div>
  );
}

export default function BookDetails({ params: propParams }: { params?: { id: string } }) {
  const [, matchParams] = useRoute("/books/:id");
  const params = propParams || matchParams;
  const bookId = params?.id ? parseInt(params.id) : 0;
  const { t, lang, isRTL } = useLanguage();
  const isPhone = useIsPhone();

  const { data: book, isLoading: isLoadingBook, error: bookError } = useBook(bookId);
  const { data: chapters, isLoading: isLoadingChapters, error: chaptersError } = useChapters(bookId);
  const { user, refetch: refetchAuth } = useAuth();
  const publishBook = usePublishBook();
  const isOwner = !!(user && book && (book as any).userId === (user as any).id);

  const generateCover = useGenerateCover();
  const generateBlurb = useGenerateBlurb();
  const updateBook = useUpdateBook();
  const createChapter = useCreateChapter();
  const updateChapter = useUpdateChapter();
  const reorderChapters = useReorderChapters();
  const deleteChapter = useDeleteChapter();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  // Chapter delete confirmation: { id, title } when modal is open, null
  // otherwise. Stored as a single object so the title is captured at
  // open time even if the chapter list re-orders before confirm.
  const [confirmDeleteChapter, setConfirmDeleteChapter] = useState<{ id: number; title: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingChapterId, setEditingChapterId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const [isCoverDialogOpen, setIsCoverDialogOpen] = useState(false);
  const [coverPrompt, setCoverPrompt] = useState("");
  const [isChapterDialogOpen, setIsChapterDialogOpen] = useState(false);
  const [chapterTitle, setChapterTitle] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [activeTab, setActiveTab] = useState<"chapters" | "analytics" | "tools" | "pages" | "research">("chapters");
  // Pages (front/back matter)
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionDraft, setSectionDraft] = useState("");
  // Export template picker
  // Template picker was removed — PDF export hard-codes "classic".
  // Saved here only to avoid touching every callsite that referenced it.
  void 0;
  // Writing goal
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");
  // Finish & Publish confirmation dialog
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
  // Share modal opens after a successful publish and any time the
  // writer clicks the "Share" button next to the published-badge.
  const [isShareOpen, setIsShareOpen] = useState(false);
  // Collaboration
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Track last accessed for home page sorting (must be before early returns)
  useEffect(() => { if (bookId) try { localStorage.setItem(`plotzy_book_accessed_${bookId}`, String(Date.now())); } catch {} }, [bookId]);

  if (isLoadingBook || isLoadingChapters) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      </Layout>
    );
  }

  if (!book) {
    return (
      <Layout>
        <div className="text-center py-20 flex flex-col items-center">
          <p className="text-xl font-bold">{lang === "ar" ? "الكتاب غير موجود." : "Book not found."}</p>
          {bookError && <p className="text-red-500 mt-4 text-sm font-mono max-w-lg mx-auto bg-red-50 p-2 rounded">{String(bookError)}</p>}
          {(bookId === 0 || !params) && <p className="text-red-500 mt-2 text-sm font-mono">Routing Error: ID missing or invalid (Params: {JSON.stringify(params)})</p>}
        </div>
      </Layout>
    );
  }

  const bookRTL = RTL_LANGS.includes(book.language || "");

  const handleGenerateCover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coverPrompt.trim()) return;
    try {
      await generateCover.mutateAsync({ id: bookId, prompt: coverPrompt, side: "front" });
      setIsCoverDialogOpen(false);
      toast({ title: lang === "ar" ? "تم إنشاء الغلاف!" : "Cover generated successfully!" });
    } catch {
      toast({ title: lang === "ar" ? "فشل الإنشاء" : "Failed to generate cover", variant: "destructive" });
    }
  };

  const handleUploadCover = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({ title: lang === "ar" ? "الملف كبير جداً (الحد الأقصى 5 ميغابايت)" : "File too large (max 5MB)", variant: "destructive" });
      return;
    }

    setIsUploadingCover(true);
    try {
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await updateBook.mutateAsync({ id: bookId, coverImage: dataUri });
      toast({ title: lang === "ar" ? "تم رفع صورة الغلاف!" : "Cover image uploaded!" });
    } catch {
      toast({ title: lang === "ar" ? "فشل رفع الصورة" : "Upload failed", variant: "destructive" });
    } finally {
      setIsUploadingCover(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleGenerateBlurb = async () => {
    try {
      await generateBlurb.mutateAsync({ id: bookId, language: book.language || lang });
      toast({ title: t("blurbGenerated"), description: lang === "ar" ? "تم حفظ الوصف في ملخص الكتاب." : "Saved to book summary." });
    } catch {
      toast({ title: lang === "ar" ? "فشل التوليد" : "Failed to generate blurb", variant: "destructive" });
    }
  };

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterTitle.trim()) return;
    try {
      await createChapter.mutateAsync({ bookId, title: chapterTitle, content: "" });
      setIsChapterDialogOpen(false);
      setChapterTitle("");
    } catch {
      toast({ title: lang === "ar" ? "فشل إنشاء الفصل" : "Failed to create chapter", variant: "destructive" });
    }
  };

  const sortedChapters = [...(chapters || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    const reordered = [...sortedChapters];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const updates = reordered.map((ch, i) => ({ id: ch.id, order: i + 1 }));
    reorderChapters.mutate({ bookId, updates }, {
      onError: () => toast({
        title: lang === "ar" ? "تعذّر حفظ ترتيب الفصول" : "Couldn't save the new chapter order",
        variant: "destructive",
      }),
    });
  };

  const handleStartRename = (e: React.MouseEvent, chapterId: number, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingChapterId(chapterId);
    setEditingTitle(title);
  };

  const handleSaveRename = (chapterId: number, originalTitle: string) => {
    const trimmed = editingTitle.trim();
    if (trimmed && trimmed !== originalTitle) {
      updateChapter.mutate({ id: chapterId, bookId, title: trimmed });
    }
    setEditingChapterId(null);
  };

  const handleDownload = async (
    format: "pdf" | "epub" | "txt" | "docx",
    font?: "cairo" | "amiri",
    chapter?: { id: number; title: string },
  ) => {
    setIsDownloading(true);
    try {
      // PDF now goes through server-side puppeteer which returns real
      // PDF bytes, so it uses the same fetch+blob path as the other
      // formats. The "classic" template is hard-wired for now (the
      // template picker modal was removed because it added a click
      // and most users were just clicking through with the default).
      // `chapter` (optional) downloads just that one chapter through the
      // exact same pipeline (RTL + embedded Arabic font included).
      const chapterParam = chapter ? `&chapter=${chapter.id}` : "";
      const params = format === "pdf"
        ? `?format=pdf&template=classic${font ? `&font=${font}` : ""}${chapterParam}`
        : `?format=${format}${chapterParam}`;
      const url = `/api/books/${bookId}/download${params}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const nameSource = chapter ? `${book.title} - ${chapter.title}` : book.title;
      const safeTitle = nameSource.replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_") || "book";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${safeTitle}.${format}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast({ title: lang === "ar" ? "فشل التحميل" : "Download failed", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  // AI cover dialog temporarily disabled — gpt-image-1 is a paid API
  // and credits aren't provisioned pre-launch. The trigger button now
  // shows as disabled with a "Coming Soon" caption; the dialog markup
  // remains below for ease of re-enabling once credits land. Unused
  // bindings (handleGenerateCover, coverPrompt, generateCover) stay in
  // place since they're referenced by the dialog body.
  void handleGenerateCover; void coverPrompt; void setCoverPrompt; void generateCover; void isCoverDialogOpen; void setIsCoverDialogOpen;
  const CoverDialog = ({ triggerLabel }: { triggerLabel: string }) => (
    <div className="inline-flex flex-col items-stretch gap-1">
      <Button
        disabled
        title={lang === "ar" ? "إنشاء الغلاف بالذكاء الاصطناعي قريباً" : "AI cover generation coming soon"}
        className="rounded-lg font-semibold text-[#f7f2e4] shadow-lg border-0 opacity-60 cursor-not-allowed"
        style={{ background: "#292115" }}
        size="sm"
        data-testid="button-generate-cover"
      >
        <Wand2 className="w-4 h-4 mr-2" />
        {triggerLabel}
      </Button>
      <span className="text-[10px] text-muted-foreground text-center">
        {t("featureComingSoon")}
      </span>
    </div>
  );

  return (
    <Layout noScroll>
      <SEO title={book?.title || "Book"} noindex />
      {/* Hidden file input for cover upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileSelected}
        data-testid="input-cover-upload"
      />

      <div
        className={`grid grid-cols-1 lg:grid-cols-12 h-full ${isPhone ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden"} ${isRTL ? "direction-rtl" : ""}`}
        dir={isRTL ? "rtl" : "ltr"}
      >

        {/* ── Left Column ── */}
        <div className={`lg:col-span-4 flex flex-col gap-4 ${isPhone ? "" : "h-full overflow-y-auto"} px-4 sm:px-6 pt-4 sm:pt-6 pb-8 sm:pb-10`} style={{ borderRight: '1px solid rgba(66,53,33,0.08)' }}>

          {/* Cover Card */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(66,53,33,0.08)', border: '1px solid rgba(66,53,33,0.12)' }}>

            {/* Cover with hover */}
            <div className="relative group cursor-pointer">
              <BookCoverWrap book={book} />
              <div className="absolute inset-0 bg-[#221b11]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Link href={`/books/${bookId}/cover-designer`}>
                  <Button size="sm" className="bg-white/95 text-black hover:bg-white font-semibold rounded-xl shadow-xl border-0 backdrop-blur-sm">
                    <Palette className="w-3.5 h-3.5 mr-1.5" />
                    {lang === "ar" ? "مصمم الغلاف" : "Cover Designer"}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(66,53,33,0.08)' }} />

            {/* Book Info */}
            <div className="p-5 space-y-4">
              {/* Title + Author */}
              <div>
                <h1 className="text-lg font-bold leading-snug" style={{ color: '#2f2618' }} dir={bookRTL ? "rtl" : "ltr"}>
                  {book.title}
                </h1>
                {book.authorName && (
                  <p className="text-sm mt-0.5 font-medium" style={{ color: '#6d6354' }}>{book.authorName}</p>
                )}
              </div>

              {/* Summary */}
              {book.summary && (
                <p className="text-sm leading-relaxed line-clamp-3" style={{ color: '#7b7366' }} dir={bookRTL ? "rtl" : "ltr"}>
                  {book.summary}
                </p>
              )}

              {/* Genre + Language chips */}
              {(book.genre || book.language) && (
                <div className="flex flex-wrap gap-1.5">
                  {book.genre && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(66,53,33,0.08)', color: '#6d6354', letterSpacing: '0.02em' }}>
                      {book.genre}
                    </span>
                  )}
                  {book.language && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase" style={{ background: 'rgba(66,53,33,0.08)', color: '#6d6354', letterSpacing: '0.05em' }}>
                      {book.language}
                    </span>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Action Buttons — owner only */}
          {isOwner && <><div className="grid grid-cols-2 gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="w-full rounded-xl h-10 font-semibold border-0 transition-all text-sm"
                  style={{ background: 'rgba(66,53,33,0.11)', color: '#3a3020' }}
                  disabled={isDownloading}
                  data-testid="button-download-book"
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(66,53,33,0.16)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(66,53,33,0.11)')}
                >
                  {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4 mr-2" />{lang === "ar" ? "تحميل" : "Download"}</>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52 rounded-xl">
                <DropdownMenuItem className="cursor-pointer rounded-lg" onClick={() => handleDownload("pdf", "cairo")} data-testid="download-pdf-cairo">
                  <FileDown className="w-4 h-4 mr-2 text-red-400" />
                  {lang === "ar" ? "PDF · خط Cairo (عصري)" : "PDF · Cairo font (modern)"}
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer rounded-lg" onClick={() => handleDownload("pdf", "amiri")} data-testid="download-pdf-amiri">
                  <FileDown className="w-4 h-4 mr-2 text-red-400" />
                  {lang === "ar" ? "PDF · خط Amiri (كلاسيكي)" : "PDF · Amiri font (classic)"}
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer rounded-lg" onClick={() => handleDownload("docx")} data-testid="download-docx">
                  <FileText className="w-4 h-4 mr-2 text-blue-400" />Word (.docx)
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer rounded-lg" onClick={() => handleDownload("epub")} data-testid="download-epub">
                  <BookOpen className="w-4 h-4 mr-2" />EPUB
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer rounded-lg" onClick={() => handleDownload("txt")} data-testid="download-txt">
                  <FileText className="w-4 h-4 mr-2" />TXT
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href={`/books/${bookId}/cover-designer`} className="flex-1">
              <Button
                className="w-full rounded-xl h-10 font-semibold transition-all text-sm"
                style={{ background: 'transparent', color: '#4a4132', border: '1px solid rgba(66,53,33,0.16)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(66,53,33,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Palette className="w-4 h-4 mr-2" />
                {lang === "ar" ? "الغلاف" : "Cover"}
              </Button>
            </Link>
          </div>

          {/* Audiobook Studio */}
          <Link href={`/books/${bookId}/audiobook`} className="block" data-testid="button-audiobook-studio">
            <div
              className="group rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all"
              style={{ border: '1px solid rgba(66,53,33,0.12)', background: '#fffdf7' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(66,53,33,0.09)')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fffdf7')}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(66,53,33,0.11)' }}>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: '#3a3020' }}>
                  {lang === "ar" ? "استوديو الكتاب الصوتي" : "Audiobook Studio"}
                </p>
                <p className="text-xs mt-0.5 line-clamp-1" style={{ color: '#6d6354' }}>
                  {lang === "ar" ? "تحويل الكتاب إلى ملف صوتي بالذكاء الاصطناعي" : "Export your book as an AI-voiced MP3"}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 flex-shrink-0 -rotate-90 transition-colors" style={{ color: '#9a9181' }} />
            </div>
          </Link>

          {/* Find Publisher */}
          <Link href={`/books/${bookId}/find-publishers`} className="block" data-testid="button-find-publishers">
            <div
              className="group rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all"
              style={{ border: '1px solid rgba(66,53,33,0.09)', background: 'rgba(66,53,33,0.03)' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fffdf7')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(66,53,33,0.03)')}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(66,53,33,0.08)' }}>
                <Globe className="w-4 h-4" style={{ color: '#6d6354' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: '#423521' }}>
                  {lang === "ar" ? "ابحث عن ناشر" : "Find a Publisher"}
                </p>
                <p className="text-xs mt-0.5 line-clamp-1" style={{ color: '#8a8070' }}>
                  {lang === "ar" ? "توليد رسالة تقديم احترافية بالذكاء الاصطناعي" : "AI-generated submission proposal"}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 flex-shrink-0 -rotate-90 transition-colors" style={{ color: '#9a9181' }} />
            </div>
          </Link>
          </>}

        </div>

        {/* Right Column */}
        <div className={`lg:col-span-8 ${isPhone ? "" : "h-full overflow-y-auto"} px-4 sm:px-6 pt-4 sm:pt-6 pb-8 sm:pb-10 space-y-5`}>

          {/* ── Top bar: underline tabs + action buttons ── */}
          <div className={isPhone ? "flex flex-col items-stretch gap-2" : "flex items-center justify-between gap-4"} style={{ borderBottom: '1px solid rgba(66,53,33,0.11)', paddingBottom: '0' }}>

            {/* Underline tabs */}
            <div className={`flex items-center gap-0 -mb-px ${isPhone ? "overflow-x-auto" : ""}`}>
              {(
                [
                  { key: "chapters",  icon: BookOpen,   label: lang === "ar" ? "الفصول"       : "Chapters",  ownerOnly: false },
                  { key: "pages",     icon: ScrollText,  label: lang === "ar" ? "صفحات الكتاب" : "Book Pages", ownerOnly: true },
                  { key: "research",  icon: BookMarked,  label: lang === "ar" ? "البحث"        : "Research",  ownerOnly: false },
                  { key: "analytics", icon: BarChart3,   label: lang === "ar" ? "الإحصائيات"  : "Analytics", ownerOnly: true },
                  { key: "tools",     icon: Sparkles,    label: lang === "ar" ? "أدوات"        : "Tools",     ownerOnly: true },
                ] as const
              ).filter(t => !t.ownerOnly || isOwner).map(({ key, icon: Icon, label }) => {
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className="relative flex items-center gap-1.5 px-3.5 py-3 text-sm font-medium transition-all"
                    style={{ color: active ? '#2f2618' : '#5c5142', fontWeight: active ? 600 : 500 }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#5c5142'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#5c5142'; }}
                  >
                    <Icon size={13} />
                    <span className="hidden sm:inline">{label}</span>
                    {active && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full" style={{ background: '#3a3020' }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Action buttons — owner only for most */}
            <div className={`flex items-center gap-2 pb-2 ${isPhone ? "flex-wrap" : "flex-shrink-0"}`}>
              {isOwner && <button onClick={() => setShowCollabModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ color: '#4a4132', border: '1px solid rgba(66,53,33,0.2)', background: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#2f2618'; e.currentTarget.style.borderColor = '#7b5e3b'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#4a4132'; e.currentTarget.style.borderColor = 'rgba(66,53,33,0.2)'; }}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{lang === "ar" ? "تعاون" : "Collaborate"}</span>
              </button>}
              {/* Marketplace temporarily hidden site-wide; restore this
                  AI Suite button when the marketplace relaunches. */}
              {false && isOwner && <Link href="/marketplace">
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ color: '#4a4132', border: '1px solid rgba(66,53,33,0.2)', background: 'transparent' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#2f2618'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#7b5e3b'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#4a4132'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(66,53,33,0.2)'; }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{lang === "ar" ? "مجموعة الذكاء" : "AI Suite"}</span>
                </button>
              </Link>}

              {isOwner && book && (
                (book as any).isPublished ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsShareOpen(true)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                      style={{ background: '#292115', color: '#f7f2e4', border: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f7f2e4')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#2f2618')}
                      data-testid="button-share-book"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {lang === "ar" ? "شارك" : "Share"}
                    </button>
                    <Link href={`/read/${bookId}`}>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{ color: '#5c5142', border: '1px solid rgba(66,53,33,0.16)', background: 'transparent' }}>
                        <Eye className="w-3.5 h-3.5" />
                        {lang === "ar" ? "عرض" : "View"}
                      </button>
                    </Link>
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ color: '#8a8070', border: '1px solid rgba(66,53,33,0.11)', background: 'transparent' }}
                      disabled={publishBook.isPending}
                      onClick={() => publishBook.mutate(
                        { id: bookId, publish: false },
                        {
                          onSuccess: () => toast({ title: lang === "ar" ? "تم إلغاء النشر" : "Book removed from Community Library" }),
                          onError: (err: any) => toast({ title: lang === "ar" ? "فشل إلغاء النشر" : "Failed to unpublish", description: err?.message || "Please make sure you're signed in.", variant: "destructive" }),
                        }
                      )}
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{publishBook.isPending ? "..." : (lang === "ar" ? "إلغاء النشر" : "Unpublish")}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={{ background: '#292115', color: '#f7f2e4', border: 'none' }}
                    data-testid="button-finish-publish"
                    onClick={() => { if (!user) { setIsAuthModalOpen(true); } else { setIsPublishConfirmOpen(true); } }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f7f2e4')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#2f2618')}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    {lang === "ar" ? "نشر الكتاب" : "Publish"}
                  </button>
                )
              )}
            </div>
          </div>

          {/* ── Publish Confirmation Dialog ── */}
          {book && (
            <Dialog open={isPublishConfirmOpen} onOpenChange={setIsPublishConfirmOpen}>
              <DialogContent className="rounded-2xl max-w-sm" style={{ background: "#fffdf7", border: "1px solid rgba(66,53,33,0.15)" }}>
                <DialogHeader className="text-center pb-2">
                  <div className="text-5xl mb-3 text-center" aria-hidden="true">✒</div>
                  <DialogTitle className="text-xl font-bold text-center leading-snug text-white">
                    {lang === "ar" ? "هل أنت مستعد لمشاركة تحفتك الفنية؟" : "Ready to share your masterpiece?"}
                  </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-center leading-relaxed px-2 mb-2 text-white/55">
                  {lang === "ar"
                    ? `سيصبح كتابك "${book.title}" متاحًا للقراء في المكتبة المجتمعية لـ Plotzy. يمكنك إلغاء النشر في أي وقت.`
                    : `"${book.title}" will be available for readers in the Plotzy Community Library. You can unpublish at any time.`}
                </p>
                <DialogFooter className="flex flex-col gap-2 sm:flex-col mt-2">
                  <Button
                    className="w-full rounded-xl font-bold text-sm shadow-md border-0 transition-all hover:opacity-90"
                    style={{ background: "#292115", color: "#f7f2e4" }}
                    disabled={publishBook.isPending}
                    data-testid="button-confirm-publish"
                    onClick={() => {
                      if (!user) {
                        setIsPublishConfirmOpen(false);
                        setIsAuthModalOpen(true);
                        return;
                      }
                      publishBook.mutate({ id: bookId, publish: true }, {
                        onSuccess: () => {
                          setIsPublishConfirmOpen(false);
                          toast({
                            title: lang === "ar" ? "تم النشر!" : "Published!",
                            description: lang === "ar"
                              ? "كتابك الآن متاح في المكتبة المجتمعية."
                              : "Your book is now live in the Plotzy Community Library.",
                          });
                          // Immediately open the share panel — the
                          // whole point of publishing is to share, so
                          // the writer shouldn't have to hunt for the
                          // button afterwards.
                          setIsShareOpen(true);
                        },
                        onError: (err: any) => {
                          const status = (err as any)?.status;
                          if (status === 401) {
                            setIsPublishConfirmOpen(false);
                            refetchAuth();
                            setIsAuthModalOpen(true);
                            return;
                          }
                          toast({
                            title: lang === "ar" ? "فشل النشر" : "Publish failed",
                            description: err?.message || (lang === "ar" ? "حدث خطأ ما، حاول مجدداً." : "Something went wrong, please try again."),
                            variant: "destructive",
                          });
                        },
                      });
                    }}
                  >
                    {publishBook.isPending
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{lang === "ar" ? "جارٍ النشر..." : "Publishing..."}</>
                      : <><BookOpen className="w-4 h-4 mr-2" />{lang === "ar" ? "نعم، انشر الآن ✦" : "Yes, Publish Now ✦"}</>
                    }
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full rounded-xl font-medium text-sm text-white/50 hover:text-white hover:bg-white/[0.06]"
                    onClick={() => setIsPublishConfirmOpen(false)}
                  >
                    {lang === "ar" ? "ليس الآن" : "Not yet, keep writing"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* ── Tab Content ── */}
          <div className="min-w-0">

            {activeTab === "chapters" && (
              <section>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: '#7b7366' }}>{t("chapters")}</p>
                  <Dialog open={isChapterDialogOpen} onOpenChange={setIsChapterDialogOpen}>
                    <DialogTrigger asChild>
                      <button
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                        style={{ background: '#292115', color: '#f7f2e4', border: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#423521')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(66,53,33,0.11)')}
                        data-testid="button-new-chapter"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {t("newChapter")}
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md rounded-2xl" dir={isRTL ? "rtl" : "ltr"}>
                      <form onSubmit={handleCreateChapter}>
                        <DialogHeader>
                          <DialogTitle className="text-xl font-bold">{t("newChapterTitle")}</DialogTitle>
                        </DialogHeader>
                        <div className="py-5">
                          <Input
                            placeholder={t("chapterTitle")}
                            value={chapterTitle}
                            onChange={(e) => setChapterTitle(e.target.value)}
                            className="rounded-lg border-border focus:border-black/60 dark:focus:border-white/60 text-base"
                            autoFocus
                            data-testid="input-chapter-title"
                            dir={isRTL ? "rtl" : "ltr"}
                          />
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={createChapter.isPending || !chapterTitle.trim()} className="w-full rounded-lg font-semibold text-[#f7f2e4] border-0" style={{ background: "#292115" }} data-testid="button-create-chapter">
                            {createChapter.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("createChapter")}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {!sortedChapters.length ? (
                  <div className="text-center py-16 rounded-2xl" style={{ border: '1px dashed rgba(66,53,33,0.11)', background: 'rgba(66,53,33,0.02)' }}>
                    <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#fffdf7' }}>
                      <FileText className="w-5 h-5" style={{ color: '#9a9181' }} />
                    </div>
                    <p className="text-sm font-semibold" style={{ color: '#7b7366' }}>{t("noChaptersYet")}</p>
                    <p className="text-xs mt-1" style={{ color: '#7b7366' }}>{t("noChaptersDesc")}</p>
                  </div>
                ) : (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="chapters-list">
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="" style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(66,53,33,0.09)' }}>
                          {sortedChapters.map((chapter, index) => (
                            <Draggable key={chapter.id} draggableId={String(chapter.id)} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className="group relative flex items-center gap-0 transition-colors"
                                  style={{
                                    ...provided.draggableProps.style,
                                    background: snapshot.isDragging ? 'rgba(66,53,33,0.06)' : 'transparent',
                                    borderBottom: index < sortedChapters.length - 1 ? '1px solid rgba(66,53,33,0.09)' : 'none',
                                  }}
                                  onMouseEnter={e => { if (!snapshot.isDragging) (e.currentTarget as HTMLDivElement).style.background = '#fffdf7'; }}
                                  onMouseLeave={e => { if (!snapshot.isDragging) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                                  data-testid={`card-chapter-${chapter.id}`}
                                >
                                  {/* Large faded chapter number */}
                                  <div
                                    className="flex-shrink-0 flex items-center justify-center select-none"
                                    style={{ width: 56, color: '#5a4a33', fontSize: 32, fontWeight: 900, fontVariantNumeric: 'tabular-nums', lineHeight: 1, padding: '18px 0 18px 16px' }}
                                  >
                                    {String(index + 1).padStart(2, '0')}
                                  </div>

                                  {/* Drag handle */}
                                  <div
                                    {...provided.dragHandleProps}
                                    className="px-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                                    style={{ color: '#9a9181' }}
                                  >
                                    <GripVertical className="w-3.5 h-3.5" />
                                  </div>

                                  {/* Title & meta */}
                                  <div className="flex-1 min-w-0 py-4 pr-3">
                                    {editingChapterId === chapter.id ? (
                                      <input
                                        autoFocus
                                        value={editingTitle}
                                        onChange={(e) => setEditingTitle(e.target.value)}
                                        onBlur={() => handleSaveRename(chapter.id, chapter.title)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") { e.preventDefault(); handleSaveRename(chapter.id, chapter.title); }
                                          if (e.key === "Escape") { setEditingChapterId(null); }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="font-semibold text-sm rounded-md px-2 py-0.5 w-full outline-none"
                                        style={{ background: 'rgba(66,53,33,0.11)', border: '1px solid #9a9181', color: '#2f2618' }}
                                        dir={isRTL ? "rtl" : "ltr"}
                                      />
                                    ) : (
                                      <Link href={`/books/${bookId}/chapters/${chapter.id}`} className="block">
                                        <h4 className="font-semibold text-[15px] leading-tight line-clamp-1 transition-colors" style={{ color: '#2f2618' }}>
                                          {chapter.title}
                                        </h4>
                                        <p className="text-xs flex items-center gap-1.5 mt-1" style={{ color: '#6d6354' }}>
                                          {chapter.createdAt ? format(new Date(chapter.createdAt), 'MMM d, h:mm a') : ''}
                                          {countChapterWords(chapter.content) > 0 && (
                                            <><span>·</span><span>{countChapterWords(chapter.content).toLocaleString()} {lang === "ar" ? "كلمة" : "words"}</span></>
                                          )}
                                        </p>
                                      </Link>
                                    )}
                                  </div>

                                  {/* Actions. On phones the four-button row used to
                                      overflow horizontally: instead, the secondary
                                      actions collapse to icon-only and the primary
                                      Write button keeps its label. Tailwind's
                                      sm: prefix (640px) is the breakpoint.  */}
                                  {editingChapterId !== chapter.id && (
                                    <div className="flex items-center gap-1.5 sm:gap-2 pr-2 sm:pr-4 flex-shrink-0">
                                      {/* Rename — icon-only on phone, text on >=sm */}
                                      <button
                                        className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg transition-all"
                                        style={{ color: '#423521', background: 'rgba(66,53,33,0.07)', border: '1px solid rgba(66,53,33,0.18)', fontSize: 11, fontWeight: 600 }}
                                        onClick={(e) => handleStartRename(e, chapter.id, chapter.title)}
                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#423521'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(66,53,33,0.08)'; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#423521'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(66,53,33,0.07)'; }}
                                        title={lang === "ar" ? "إعادة التسمية" : "Rename"}
                                        aria-label={lang === "ar" ? "إعادة التسمية" : "Rename"}
                                      >
                                        <PenLine className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">{lang === "ar" ? "تسمية" : "Rename"}</span>
                                      </button>

                                      {/* Write / Open Editor — primary action, keeps its label on every size */}
                                      <Link href={`/books/${bookId}/chapters/${chapter.id}`}>
                                        <button
                                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all"
                                          style={{ color: '#3a3020', background: 'rgba(66,53,33,0.08)', border: '1px solid rgba(66,53,33,0.16)', fontSize: 11, fontWeight: 600 }}
                                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(66,53,33,0.12)'; }}
                                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(66,53,33,0.08)'; }}
                                          title={lang === "ar" ? "فتح المحرر" : "Open Editor"}
                                        >
                                          <span>{lang === "ar" ? "كتابة" : "Write"}</span>
                                        </button>
                                      </Link>

                                      {/* Per-chapter download — same formats as the
                                          whole book (incl. the two PDF fonts), routed
                                          through the same pipeline so RTL/Arabic-font
                                          is respected per the chapter's own content.
                                          Icon-only on phone, text + icon on >=sm. */}
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <button
                                            type="button"
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg transition-all"
                                            style={{ color: '#423521', background: 'rgba(66,53,33,0.07)', border: '1px solid rgba(66,53,33,0.18)', fontSize: 11, fontWeight: 600 }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#423521'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(66,53,33,0.08)'; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#423521'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(66,53,33,0.07)'; }}
                                            title={lang === "ar" ? "تنزيل الفصل" : "Download chapter"}
                                            aria-label={lang === "ar" ? "تنزيل الفصل" : "Download chapter"}
                                          >
                                            <Download className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">{lang === "ar" ? "تنزيل" : "Download"}</span>
                                          </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-60 rounded-xl" onClick={(e) => e.stopPropagation()}>
                                          <DropdownMenuItem className="cursor-pointer rounded-lg" onClick={() => handleDownload("pdf", "cairo", { id: chapter.id, title: chapter.title })}>
                                            <FileDown className="w-4 h-4 mr-2 text-red-400" />
                                            {lang === "ar" ? "PDF · خط Cairo (عصري)" : "PDF · Cairo font (modern)"}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem className="cursor-pointer rounded-lg" onClick={() => handleDownload("pdf", "amiri", { id: chapter.id, title: chapter.title })}>
                                            <FileDown className="w-4 h-4 mr-2 text-red-400" />
                                            {lang === "ar" ? "PDF · خط Amiri (كلاسيكي)" : "PDF · Amiri font (classic)"}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem className="cursor-pointer rounded-lg" onClick={() => handleDownload("docx", undefined, { id: chapter.id, title: chapter.title })}>
                                            <FileText className="w-4 h-4 mr-2 text-blue-400" />Word (.docx)
                                          </DropdownMenuItem>
                                          <DropdownMenuItem className="cursor-pointer rounded-lg" onClick={() => handleDownload("epub", undefined, { id: chapter.id, title: chapter.title })}>
                                            <BookOpen className="w-4 h-4 mr-2" />EPUB
                                          </DropdownMenuItem>
                                          <DropdownMenuItem className="cursor-pointer rounded-lg" onClick={() => handleDownload("txt", undefined, { id: chapter.id, title: chapter.title })}>
                                            <FileText className="w-4 h-4 mr-2" />TXT
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>

                                      {/* Delete chapter — was previously inside the chapter
                                          editor's toolbar; lives here on the chapter row so
                                          it sits next to Rename + Write. Icon-only, neutral
                                          until hover where it goes red, opens a typed
                                          confirm modal so a misclick can't drop a chapter. */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          setConfirmDeleteChapter({ id: chapter.id, title: chapter.title });
                                        }}
                                        aria-label={lang === "ar" ? "حذف الفصل" : "Delete chapter"}
                                        title={lang === "ar" ? "حذف الفصل" : "Delete chapter"}
                                        className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
                                        style={{ color: '#423521', background: 'rgba(66,53,33,0.07)', border: '1px solid rgba(66,53,33,0.18)' }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#fca5a5'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.12)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.30)'; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#423521'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(66,53,33,0.07)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(66,53,33,0.11)'; }}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}

              </section>
            )}

            {activeTab === "pages" && (() => {
              const pages: BookPages = (book as any).bookPages || {};
              const totalWords = (chapters || []).reduce((acc, ch) => acc + countChapterWords(ch.content), 0);
              const goal = (book as any).wordGoal || 0;
              const goalPct = goal > 0 ? Math.min(100, Math.round((totalWords / goal) * 100)) : 0;
              const chapterCount = (chapters || []).length;

              // Count completed sections
              const allSections = ["copyright", "dedication", "epigraph", "aboutAuthor"] as const;
              const completedCount = allSections.filter(k => !!pages[k as keyof BookPages]).length;

              const FRONT_MATTER = [
                { key: "copyright", label: lang === "ar" ? "حقوق النشر" : "Copyright", icon: FileText, placeholder: `© ${new Date().getFullYear()} ${book.authorName || "Your Name"}. All rights reserved.\n\nPublished by Plotzy.\n\nNo part of this publication may be reproduced without permission.`, desc: lang === "ar" ? "تُضاف تلقائياً في كل PDF تصدره" : "Auto-added to every PDF export" },
                { key: "dedication", label: lang === "ar" ? "الإهداء" : "Dedication", icon: Quote, placeholder: lang === "ar" ? "إلى كل من آمن بهذه القصة قبلي..." : "For everyone who believed in this story before I did.", desc: lang === "ar" ? "كلمة شكر أو إهداء شخصي" : "A personal note or dedication" },
                { key: "epigraph", label: lang === "ar" ? "الاقتباس الافتتاحي" : "Epigraph", icon: BookMarked, placeholder: lang === "ar" ? "\"البداية دائماً اليوم.\"\n— ماري شيلي" : "\"The beginning is always today.\"\n— Mary Shelley", desc: lang === "ar" ? "اقتباس يحدد نبرة الكتاب" : "A quote that sets the tone of your book" },
              ] as const;

              const BACK_MATTER = [
                { key: "aboutAuthor", label: lang === "ar" ? "نبذة عن الكاتب" : "About the Author", icon: User, placeholder: lang === "ar" ? `${book.authorName || "اسمك"} كاتب يقيم في...` : `${book.authorName || "Your name"} is a writer based in...`, desc: lang === "ar" ? "نبذة مختصرة عنك كمؤلف" : "A short bio about you as an author" },
              ] as const;

              const renderSection = (sections: typeof FRONT_MATTER | typeof BACK_MATTER) =>
                sections.map(({ key, label, icon: Icon, placeholder, desc }) => {
                  const content = pages[key as keyof BookPages] || "";
                  const isEditing = editingSection === key;
                  const filled = !!content;
                  return (
                    <div key={key} className="rounded-2xl overflow-hidden transition-all" style={{ background: "rgba(66,53,33,0.03)", border: filled ? "1px solid rgba(66,53,33,0.13)" : "1px dashed rgba(66,53,33,0.11)" }}>
                      <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl p-2.5" style={{ background: filled ? "#292115" : "rgba(66,53,33,0.06)" }}>
                            <Icon className="w-4 h-4" style={{ color: filled ? "#f7f2e4" : "#6d6354" }} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[13px]" style={{ color: filled ? "#f7f2e4" : "#5c5142" }}>{label}</span>
                              {filled && <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#7b5e3b" }} />}
                            </div>
                            <p className="text-[11px] mt-0.5" style={{ color: "#8a8070" }}>{desc}</p>
                          </div>
                        </div>
                        {!isEditing && (
                          <button
                            className="text-[12px] font-medium px-4 py-1.5 rounded-lg transition-all"
                            style={{ background: filled ? "rgba(66,53,33,0.08)" : "rgba(66,53,33,0.11)", color: filled ? "#6d6354" : "#3a3020", border: "1px solid rgba(66,53,33,0.11)" }}
                            onClick={() => { setEditingSection(key); setSectionDraft(content || placeholder); }}
                          >
                            {filled ? (lang === "ar" ? "تعديل" : "Edit") : (lang === "ar" ? "إضافة" : "Add")}
                          </button>
                        )}
                        {isEditing && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button className="text-[12px] font-semibold px-4 py-1.5 rounded-lg" style={{ background: "#292115", color: "#f7f2e4" }} onClick={() => {
                              const updated = { ...pages, [key]: sectionDraft };
                              updateBook.mutate({ id: bookId, bookPages: updated } as any);
                              setEditingSection(null);
                              toast({ title: lang === "ar" ? "تم الحفظ" : "Saved!" });
                            }}>
                              {lang === "ar" ? "حفظ" : "Save"}
                            </button>
                            <button className="text-[12px] px-3 py-1.5 rounded-lg" style={{ color: "#7b7366" }} onClick={() => setEditingSection(null)}>
                              {lang === "ar" ? "إلغاء" : "Cancel"}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      {(isEditing || filled) && (
                        <div className="px-5 pb-4">
                          {isEditing ? (
                            <Textarea autoFocus value={sectionDraft} onChange={e => setSectionDraft(e.target.value)}
                              className="min-h-[120px] resize-none text-sm rounded-xl" dir={isRTL ? "rtl" : "ltr"}
                              style={{ background: "#fffdf7", border: "1px solid rgba(66,53,33,0.13)", lineHeight: 1.7 }} />
                          ) : (
                            <div className="rounded-xl px-4 py-3" style={{ background: "rgba(66,53,33,0.04)" }}>
                              <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "#6d6354", fontFamily: "'Georgia', serif" }}>{content}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                });

              return (
                <div className="space-y-8 pb-8">
                  <StudioFlair ar={lang === "ar"} note={lang === "ar" ? "الإهداء بفرق كثير" : "a dedication goes a long way"} />

                  {/* Completion Summary */}
                  <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg, #fffdf7 0%, rgba(66,53,33,0.03) 100%)", border: "1px solid rgba(66,53,33,0.09)" }}>
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="text-base font-bold mb-1" style={{ fontFamily: "'Lora', 'Amiri', Georgia, serif" }}>{lang === "ar" ? <>جاهزية <Mark ar>كتابك</Mark></> : <>Book <Mark ar={false}>Readiness</Mark></>}</h3>
                        <p className="text-xs" style={{ color: "#8a8070" }}>{lang === "ar" ? "أكمل هذه الأقسام لتحضير كتابك للنشر" : "Complete these sections to prepare your book for publishing"}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold">{completedCount}</span>
                        <span className="text-sm" style={{ color: "#8a8070" }}>/4</span>
                      </div>
                    </div>
                    {/* Mini stats row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl p-3 text-center" style={{ background: "rgba(66,53,33,0.04)", border: "1px solid rgba(66,53,33,0.08)" }}>
                        <div className="text-lg font-bold">{chapterCount}</div>
                        <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: "#8a8070" }}>{lang === "ar" ? "فصول" : "Chapters"}</div>
                      </div>
                      <div className="rounded-xl p-3 text-center" style={{ background: "rgba(66,53,33,0.04)", border: "1px solid rgba(66,53,33,0.08)" }}>
                        <div className="text-lg font-bold">{totalWords.toLocaleString()}</div>
                        <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: "#8a8070" }}>{lang === "ar" ? "كلمات" : "Words"}</div>
                      </div>
                      <div className="rounded-xl p-3 text-center" style={{ background: "rgba(66,53,33,0.04)", border: "1px solid rgba(66,53,33,0.08)" }}>
                        <div className="text-lg font-bold">{completedCount}/4</div>
                        <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: "#8a8070" }}>{lang === "ar" ? "أقسام" : "Sections"}</div>
                      </div>
                    </div>
                  </div>

                  {/* Writing Goal */}
                  <div className="rounded-2xl p-5" style={{ background: "rgba(66,53,33,0.03)", border: "1px solid rgba(66,53,33,0.09)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl p-2.5" style={{ background: "rgba(66,53,33,0.08)" }}>
                          <Target className="w-4 h-4" style={{ color: "#4a4132" }} />
                        </div>
                        <div>
                          <span className="font-semibold text-[13px] block">{lang === "ar" ? "هدف الكتابة" : "Writing Goal"}</span>
                          <span className="text-[11px]" style={{ color: "#8a8070" }}>{lang === "ar" ? "حدد عدد الكلمات" : "Track your word count progress"}</span>
                        </div>
                      </div>
                      {!editingGoal && (
                        <button onClick={() => { setEditingGoal(true); setGoalDraft(String(goal || "")); }} className="text-xs transition-colors rounded-lg p-2" style={{ color: "#8a8070" }}>
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {editingGoal ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Input type="number" autoFocus value={goalDraft} onChange={e => setGoalDraft(e.target.value)} placeholder={lang === "ar" ? "مثال: 80000" : "e.g. 80000"} className="h-9 text-sm rounded-xl" />
                        <button className="h-9 rounded-xl px-4 text-[12px] font-semibold" style={{ background: "#292115", color: "#f7f2e4" }} onClick={() => { updateBook.mutate({ id: bookId, wordGoal: parseInt(goalDraft) || 0 } as any); setEditingGoal(false); }}>
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button className="h-9 rounded-xl px-3 text-[12px]" style={{ color: "#7b7366" }} onClick={() => setEditingGoal(false)}>✕</button>
                      </div>
                    ) : goal > 0 ? (
                      <div className="space-y-3 mt-3">
                        <div className="flex items-end justify-between">
                          <div>
                            <span className="text-2xl font-bold">{totalWords.toLocaleString()}</span>
                            <span className="text-xs ml-1" style={{ color: "#8a8070" }}>/ {goal.toLocaleString()}</span>
                          </div>
                          <span className="text-sm font-semibold" style={{ color: goalPct >= 100 ? "#7b5e3b" : "#6d6354" }}>{goalPct}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(66,53,33,0.08)" }}>
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${goalPct}%`, background: goalPct >= 100 ? "#7b5e3b" : "linear-gradient(90deg, #6d6354, #3a3020)" }} />
                        </div>
                        {goalPct >= 100 && <p className="text-xs font-medium" style={{ color: "#7b5e3b" }}>{lang === "ar" ? "تهانينا! حققت هدفك" : "Congratulations! You've reached your goal"}</p>}
                      </div>
                    ) : (
                      <button onClick={() => { setEditingGoal(true); setGoalDraft(""); }} className="mt-2 w-full rounded-xl py-3 text-sm border border-dashed transition-all hover:border-foreground/15 text-center" style={{ borderColor: "rgba(66,53,33,0.11)", color: "#8a8070" }}>
                        {lang === "ar" ? "اضغط لتعيين هدف الكلمات" : "Set a word count goal"}
                      </button>
                    )}
                  </div>

                  {/* Book Structure Flow */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: "#7b7366" }}>
                      {lang === "ar" ? "ترتيب الكتاب" : "Book Structure"}
                    </p>
                    <div className="flex items-center gap-0.5 flex-wrap">
                      {[
                        { label: lang === "ar" ? "الغلاف" : "Cover", done: true },
                        { label: lang === "ar" ? "حقوق النشر" : "Copyright", done: !!pages.copyright },
                        { label: lang === "ar" ? "الإهداء" : "Dedication", done: !!pages.dedication },
                        { label: lang === "ar" ? "الاقتباس" : "Epigraph", done: !!pages.epigraph },
                        { label: `${lang === "ar" ? "فصول" : "Chapters"} (${chapterCount})`, done: chapterCount > 0 },
                        { label: lang === "ar" ? "نبذة الكاتب" : "About Author", done: !!pages.aboutAuthor },
                      ].map((step, i, arr) => (
                        <div key={step.label} className="flex items-center">
                          <span className="text-[11px] font-medium px-3 py-1.5 rounded-lg" style={{
                            background: step.done ? "rgba(66,53,33,0.11)" : "transparent",
                            color: step.done ? "#3a3020" : "#9a9181",
                            border: step.done ? "1px solid rgba(66,53,33,0.13)" : "1px dashed rgba(66,53,33,0.11)",
                          }}>
                            {step.done && <span className="inline-block w-1 h-1 rounded-full mr-1.5" style={{ background: "#7b5e3b", verticalAlign: "middle" }} />}
                            {step.label}
                          </span>
                          {i < arr.length - 1 && <span className="mx-1 text-[10px]" style={{ color: "rgba(66,53,33,0.2)" }}>→</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Front matter */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "#7b7366" }}>
                      {lang === "ar" ? "الصفحات الأمامية" : "Front Matter"}
                    </p>
                    {renderSection(FRONT_MATTER)}
                  </div>

                  {/* Back matter */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "#7b7366" }}>
                      {lang === "ar" ? "الصفحات الخلفية" : "Back Matter"}
                    </p>
                    {renderSection(BACK_MATTER)}
                  </div>
                </div>
              );
            })()}

            {activeTab === "research" && (
              <div className="p-4">
                <StudioFlair ar={lang === "ar"} note={lang === "ar" ? "كل فكرة إلها مكان" : "every idea has a home"} />
                <ResearchBoard bookId={bookId} />
              </div>
            )}

            {activeTab === "analytics" && (
              <div className="p-4">
                <StudioFlair ar={lang === "ar"} note={lang === "ar" ? "شوف تقدمك بعينك" : "watch yourself grow"} />
                <AnalyticsDashboard bookId={bookId} />
              </div>
            )}

            {activeTab === "tools" && (
              <section className="p-4 space-y-6 relative">
                <StudioFlair ar={lang === "ar"} note={lang === "ar" ? "جاهز للنشر؟" : "ready to publish?"} />
                {/* Publishing */}
                <BookPublishingTools bookId={bookId} bookTitle={book.title} currentIsbn={(book as any).isbn} />

                {/* Divider */}
                <div className="h-px" style={{ background: "rgba(66,53,33,0.08)" }} />

                {/* Import */}
                <LegacyImporter bookId={bookId} />
              </section>
            )}

          </div>{/* end tab content */}
        </div>{/* end right column */}
      </div>{/* end grid */}


      <AuthModal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Share panel — mounted lazily so the QR generator + brand SVGs
          only ship when a writer actually publishes a book. */}
      {book && (
        <Suspense fallback={null}>
          <ShareBookModal
            open={isShareOpen}
            onClose={() => setIsShareOpen(false)}
            bookId={bookId}
            title={book.title}
            author={(book as any).authorName || null}
            coverImage={book.coverImage || null}
            summary={(book as any).blurb || (book as any).summary || null}
          />
        </Suspense>
      )}

      {/* ── Collaboration Modal ── */}
      {showCollabModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowCollabModal(false); }}>
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md border border-border p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2"><Users className="w-5 h-5" />{lang === "ar" ? "التعاون" : "Collaborate"}</h3>
              <button onClick={() => setShowCollabModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-foreground/5" style={{ color: "#7b7366" }}><XIcon className="w-4 h-4" /></button>
            </div>

            {/* Generate invite code */}
            <div className="space-y-3">
              <p className="text-xs" style={{ color: "#7b7366" }}>
                {lang === "ar" ? "ابعث هاد الكود لصاحبك عشان يقدر يدخل على كتابك" : "Share this code with someone to give them access to your book"}
              </p>
              <div className="flex gap-2">
                <NiceSelect
                  value={inviteRole}
                  onChange={(v) => setInviteRole(v as any)}
                  menuWidth={220}
                  options={[
                    { value: "editor", label: lang === "ar" ? "محرر (بيقدر يعدل)" : "Editor (can edit)" },
                    { value: "viewer", label: lang === "ar" ? "قارئ (بس يقرأ)" : "Viewer (read only)" },
                  ]}
                  triggerStyle={{ background: "#292115", border: "1px solid rgba(66,53,33,0.13)", color: "#f7f2e4", borderRadius: 12, padding: "9px 12px", fontSize: 13 }}
                />
                <button onClick={async () => {
                  try {
                    const res = await fetch(`/api/books/${bookId}/collaborators/invite`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ role: inviteRole }) });
                    const data = await res.json();
                    if (data.code) setInviteCode(data.code);
                  } catch { toast({ title: lang === "ar" ? "فشل إنشاء الكود" : "Failed to generate code", variant: "destructive" }); }
                }} className="flex-1 rounded-xl text-sm font-semibold py-2" style={{ background: "#292115", color: "#f7f2e4" }}>
                  {lang === "ar" ? "إنشاء كود دعوة" : "Generate Invite Code"}
                </button>
              </div>

              {inviteCode && (
                <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "#fffdf7", border: "1px solid rgba(66,53,33,0.13)" }}>
                  <span className="text-xl font-mono font-bold flex-1 text-center tracking-widest">{inviteCode}</span>
                  <button onClick={() => { navigator.clipboard.writeText(inviteCode); toast({ title: lang === "ar" ? "تم النسخ!" : "Code copied!" }); }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(66,53,33,0.11)", color: "#5c5142" }}>
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Collaborators list */}
            <CollaboratorsList bookId={bookId} lang={lang} />
          </div>
        </div>,
        document.body
      )}

      {/* Chapter delete confirmation. Body's onConfirm hits the
          mutation; the modal closes itself via its own onClose path
          plus the optimistic close after onConfirm so a slow network
          can't leave the modal stuck open. */}
      <ConfirmModal
        isOpen={confirmDeleteChapter !== null}
        onClose={() => setConfirmDeleteChapter(null)}
        onConfirm={async () => {
          if (!confirmDeleteChapter) return;
          const { id, title } = confirmDeleteChapter;
          try {
            await deleteChapter.mutateAsync({ id, bookId });
            toast({ title: lang === "ar" ? `تم حذف "${title}"` : `Deleted "${title}"` });
          } catch {
            toast({ title: lang === "ar" ? "فشل الحذف" : "Failed to delete chapter", variant: "destructive" });
          } finally {
            setConfirmDeleteChapter(null);
          }
        }}
        title={lang === "ar" ? "حذف الفصل؟" : "Delete chapter?"}
        message={
          confirmDeleteChapter
            ? (lang === "ar"
              ? `سيُحذف الفصل "${confirmDeleteChapter.title}" نهائياً. لا يمكن التراجع عن هذا الإجراء.`
              : `"${confirmDeleteChapter.title}" will be permanently deleted. This cannot be undone.`)
            : ""
        }
        confirmLabel={lang === "ar" ? "حذف" : "Delete"}
        variant="danger"
      />
    </Layout>
  );
}

/* ── Collaborators List Component ── */
function CollaboratorsList({ bookId, lang }: { bookId: number; lang: string }) {
  const ar = lang === "ar";
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data } = useQuery<{ collaborators: any[]; pendingInvites: any[] }>({
    queryKey: ["/api/books", bookId, "collaborators"],
    queryFn: () => fetch(`/api/books/${bookId}/collaborators`, { credentials: "include" }).then(r => r.json()),
  });

  const removeMut = useMutation({
    mutationFn: (collabId: number) => fetch(`/api/books/${bookId}/collaborators/${collabId}`, { method: "DELETE", credentials: "include" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/books", bookId, "collaborators"] }); toast({ title: ar ? "تمت الإزالة" : "Collaborator removed" }); },
  });

  const collabs = data?.collaborators || [];
  const pending = data?.pendingInvites || [];

  if (collabs.length === 0 && pending.length === 0) {
    return (
      <div className="text-center py-4" style={{ color: "#9a9181" }}>
        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">{ar ? "لا يوجد متعاونين بعد" : "No collaborators yet"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#9a9181" }}>
        {ar ? "المتعاونون" : "Collaborators"} ({collabs.length})
      </p>
      {collabs.map((c: any) => (
        <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: "rgba(66,53,33,0.04)", border: "1px solid rgba(66,53,33,0.08)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "rgba(66,53,33,0.11)", color: "#5c5142" }}>
            {(c.displayName || c.email || "?")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium">{c.displayName || c.email}</span>
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: c.role === "editor" ? "rgba(74,222,128,0.15)" : "rgba(96,165,250,0.15)", color: c.role === "editor" ? "#7b5e3b" : "#60a5fa" }}>
              {c.role === "editor" ? (ar ? "محرر" : "Editor") : (ar ? "قارئ" : "Viewer")}
            </span>
          </div>
          <button onClick={() => removeMut.mutate(c.id)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all" style={{ color: "#9a9181" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(248,113,113,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#9a9181"; e.currentTarget.style.background = "transparent"; }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {pending.map((p: any) => (
        <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: "rgba(66,53,33,0.03)", border: "1px dashed rgba(66,53,33,0.11)" }}>
          <span className="text-xs font-mono" style={{ color: "#7b7366" }}>{p.inviteCode}</span>
          <span className="text-[10px]" style={{ color: "#9a9181" }}>{ar ? "بانتظار القبول" : "Pending"}</span>
        </div>
      ))}
    </div>
  );
}
