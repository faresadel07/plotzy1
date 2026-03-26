import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useRoute, Link, useLocation } from "wouter";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Layout } from "@/components/layout";
import { AuthModal } from "@/components/auth-modal";
import { useBook, useUpdateBook, useGenerateCover, useGenerateBlurb } from "@/hooks/use-books";
import { useChapters, useCreateChapter, useUpdateChapter, useReorderChapters } from "@/hooks/use-chapters";
import { usePublishBook } from "@/hooks/use-public-library";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import AnalyticsDashboard from "@/components/analytics-dashboard";
import { ResearchBoard } from "@/components/research-board";
import { AIAnalysisTools } from "@/components/ai-analysis-tools";
import { BookPublishingTools } from "@/components/book-publishing-tools";
import LegacyImporter from "@/components/LegacyImporter";
import {
  FileText, Image as ImageIcon, Loader2, Plus, Wand2, Calendar, Sparkles,
  BookOpen, Palette, PenLine, Zap, Download, FileDown, Upload, Globe,
  BarChart3, ScrollText, Check, Edit3, Target, ChevronDown, Quote, User, Eye, EyeOff,
  GripVertical, BookMarked
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { BookPages } from "@/shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import type { Book } from "@/shared/schema";

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

// Book cover component — realistic book look, fully contained
function BookCoverWrap({ book }: { book: Book }) {
  const spineColor = book.spineColor || "#7c3aed";

  return (
    <div
      className="flex items-center justify-center py-8"
      style={{ background: `linear-gradient(160deg, ${spineColor}18 0%, ${spineColor}08 100%)` }}
    >
      {/* Book wrapper — spine + front cover side by side, no overflow */}
      <div
        className="relative flex rounded-sm overflow-hidden"
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

  const { data: book, isLoading: isLoadingBook, error: bookError } = useBook(bookId);
  const { data: chapters, isLoading: isLoadingChapters, error: chaptersError } = useChapters(bookId);
  const { user } = useAuth();
  const publishBook = usePublishBook();

  const generateCover = useGenerateCover();
  const generateBlurb = useGenerateBlurb();
  const updateBook = useUpdateBook();
  const createChapter = useCreateChapter();
  const updateChapter = useUpdateChapter();
  const reorderChapters = useReorderChapters();
  const [, navigate] = useLocation();
  const { toast } = useToast();

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
  const [exportTemplate, setExportTemplate] = useState<"classic" | "modern" | "romance">("classic");
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  // Writing goal
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");
  // Finish & Publish confirmation dialog
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  if (isLoadingBook || isLoadingChapters) {
    return (
      <Layout isFullDark>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      </Layout>
    );
  }

  if (!book) {
    return (
      <Layout isFullDark>
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
    reorderChapters.mutate({ bookId, updates });
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

  const handleDownload = async (format: "pdf" | "epub" | "txt") => {
    if (format === "pdf") { setShowTemplatePicker(true); return; }
    setIsDownloading(true);
    try {
      const url = `/api/books/${bookId}/download?format=${format}`;
      if (false) {
        window.open(url, "_blank");
      } else {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Download failed");
        const blob = await res.blob();
        const safeTitle = book.title.replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_") || "book";
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${safeTitle}.${format}`;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch {
      toast({ title: lang === "ar" ? "فشل التحميل" : "Download failed", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const CoverDialog = ({ triggerLabel }: { triggerLabel: string }) => (
    <Dialog open={isCoverDialogOpen} onOpenChange={setIsCoverDialogOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-lg font-semibold text-[#111111] shadow-lg border-0" style={{ background: "#EFEFEF" }} size="sm" data-testid="button-generate-cover">
          <Wand2 className="w-4 h-4 mr-2" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl" dir={isRTL ? "rtl" : "ltr"}>
        <form onSubmit={handleGenerateCover}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{t("designCover")}</DialogTitle>
          </DialogHeader>
          <div className="py-5 space-y-3">
            <p className="text-sm text-muted-foreground">{t("coverPromptLabel")}</p>
            <p className="text-xs text-accent-foreground bg-accent rounded-lg p-2.5">
              {lang === "ar"
                ? "سيُنشئ الذكاء الاصطناعي صورة الغلاف الأمامي. ستُعرض مع العمود والغلاف الخلفي تلقائياً."
                : "AI generates the front cover art. The spine and back cover are automatically styled and combined into a full book wrap view."}
            </p>
            <Input
              placeholder={t("coverPromptPlaceholder")}
              value={coverPrompt}
              onChange={(e) => setCoverPrompt(e.target.value)}
              className="rounded-lg border-border focus:border-black/60 dark:focus:border-white/60"
              autoFocus
              dir={isRTL ? "rtl" : "ltr"}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={generateCover.isPending || !coverPrompt.trim()} className="w-full rounded-lg font-semibold text-[#111111] border-0" style={{ background: "#EFEFEF" }}>
              {generateCover.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{lang === "ar" ? "جارٍ الإنشاء..." : "Generating..."}</>
                : <><Sparkles className="w-4 h-4 mr-2" />{t("generateArt")}</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <Layout isFullDark>
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
        className={`grid grid-cols-1 lg:grid-cols-12 gap-8 ${isRTL ? "direction-rtl" : ""}`}
        dir={isRTL ? "rtl" : "ltr"}
      >

        {/* ── Left Column ── */}
        <div className="lg:col-span-4 pb-8 space-y-3">

          {/* Cover Card */}
          <div className="rounded-2xl overflow-hidden border border-border/50 shadow-sm bg-card">

            {/* Cover with hover */}
            <div className="relative group cursor-pointer">
              <BookCoverWrap book={book} />
              <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Link href={`/books/${bookId}/cover-designer`}>
                  <Button size="sm" className="bg-white text-black hover:bg-white/95 font-semibold rounded-lg shadow-lg border-0">
                    <Palette className="w-4 h-4 mr-1.5" />
                    {lang === "ar" ? "مصمم الغلاف" : "Cover Designer"}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Book Info */}
            <div className="p-5">
              {/* Title */}
              <h1 className="text-xl font-bold text-foreground leading-snug mb-1" dir={bookRTL ? "rtl" : "ltr"}>
                {book.title}
              </h1>
              {/* Author */}
              {book.authorName && (
                <p className="text-sm text-muted-foreground font-medium mb-3">{book.authorName}</p>
              )}

              {/* Summary */}
              {book.summary && (
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-4" dir={bookRTL ? "rtl" : "ltr"}>
                  {book.summary}
                </p>
              )}

              {/* Genre + Language chips */}
              {(book.genre || book.language) && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {book.genre && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-foreground/[0.06] text-foreground/70">
                      {book.genre}
                    </span>
                  )}
                  {book.language && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-foreground/[0.06] text-foreground/70 uppercase">
                      {book.language}
                    </span>
                  )}
                </div>
              )}

              {/* Stats row */}
              {(() => {
                const totalWords = (chapters || []).reduce((acc, ch) => acc + countChapterWords(ch.content), 0);
                const chapCount = (chapters || []).length;
                const estPages = Math.ceil(totalWords / 300);
                return (
                  <div className="grid grid-cols-3 gap-px bg-border/40 rounded-xl overflow-hidden mb-4">
                    {[
                      { value: chapCount, label: lang === "ar" ? "فصل" : chapCount === 1 ? "Chapter" : "Chapters" },
                      { value: totalWords >= 1000 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords, label: lang === "ar" ? "كلمة" : "Words" },
                      { value: estPages || "—", label: lang === "ar" ? "صفحة" : "Pages" },
                    ].map(({ value, label }) => (
                      <div key={label} className="bg-card flex flex-col items-center justify-center py-3 px-2">
                        <span className="text-base font-bold text-foreground leading-none">{value}</span>
                        <span className="text-[10px] text-muted-foreground mt-1 font-medium">{label}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Created date */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <Calendar className="w-3 h-3" />
                {book.createdAt ? format(new Date(book.createdAt), 'MMM d, yyyy') : ''}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {/* Download */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="w-full rounded-xl font-semibold border-0 text-foreground bg-foreground/[0.06] hover:bg-foreground/[0.1] transition-all"
                  disabled={isDownloading}
                  data-testid="button-download-book"
                >
                  {isDownloading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <><Download className="w-4 h-4 mr-2" />{lang === "ar" ? "تحميل" : "Download"}</>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52 rounded-xl">
                <DropdownMenuItem className="cursor-pointer rounded-lg" onClick={() => handleDownload("pdf")} data-testid="download-pdf">
                  <FileDown className="w-4 h-4 mr-2 text-red-500" />PDF
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer rounded-lg" onClick={() => handleDownload("epub")} data-testid="download-epub">
                  <BookOpen className="w-4 h-4 mr-2 text-foreground/60" />EPUB
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer rounded-lg" onClick={() => handleDownload("txt")} data-testid="download-txt">
                  <FileText className="w-4 h-4 mr-2 text-muted-foreground" />TXT
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Cover Designer */}
            <Link href={`/books/${bookId}/cover-designer`} className="flex-1">
              <Button className="w-full rounded-xl font-semibold border border-border bg-card hover:bg-foreground/[0.04] text-foreground transition-all">
                <Palette className="w-4 h-4 mr-2" />
                {lang === "ar" ? "الغلاف" : "Cover"}
              </Button>
            </Link>
          </div>

          {/* Find Publisher — compact */}
          <Link href={`/books/${bookId}/find-publishers`} className="block">
            <div
              className="group rounded-xl border border-border/50 bg-card hover:border-border hover:shadow-sm transition-all p-4 flex items-center gap-3 cursor-pointer"
              data-testid="button-find-publishers"
            >
              <div className="w-9 h-9 rounded-lg bg-foreground/[0.05] flex items-center justify-center flex-shrink-0 group-hover:bg-foreground/[0.08] transition-colors">
                <Globe className="w-4 h-4 text-foreground/60" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {lang === "ar" ? "ابحث عن ناشر" : "Find a Publisher"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {lang === "ar" ? "توليد رسالة تقديم احترافية بالذكاء الاصطناعي" : "Generate a professional submission proposal"}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 -rotate-90 group-hover:text-muted-foreground transition-colors" />
            </div>
          </Link>

        </div>

        {/* Right Column */}
        <div className="lg:col-span-8 pb-8 space-y-5">

          {/* ── Top bar: horizontal tabs + action buttons ── */}
          <div className="flex items-center justify-between gap-3 flex-wrap">

            {/* Horizontal tab pills */}
            <div className="flex items-center gap-0.5 bg-foreground/[0.04] rounded-xl p-1 flex-wrap">
              {(
                [
                  { key: "chapters",  icon: BookOpen,   label: lang === "ar" ? "الفصول"       : "Chapters"   },
                  { key: "pages",     icon: ScrollText,  label: lang === "ar" ? "صفحات الكتاب" : "Book Pages" },
                  { key: "research",  icon: BookMarked,  label: lang === "ar" ? "البحث"        : "Research"   },
                  { key: "analytics", icon: BarChart3,   label: lang === "ar" ? "الإحصائيات"  : "Analytics"  },
                  { key: "tools",     icon: Sparkles,    label: lang === "ar" ? "أدوات"        : "Tools"      },
                ] as const
              ).map(({ key, icon: Icon, label }) => {
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: active ? "hsl(var(--background))" : "transparent",
                      color: active ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                      fontWeight: active ? 600 : 500,
                      boxShadow: active ? "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px hsl(var(--border)/0.5)" : "none",
                    }}
                  >
                    <Icon size={14} />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link href="/marketplace">
                <Button size="sm" variant="outline" className="rounded-lg h-8 text-xs font-semibold gap-1.5 border-border/70 hover:border-border">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{lang === "ar" ? "مجموعة الذكاء" : "AI Suite"}</span>
                </Button>
              </Link>

              {book && (
                (book as any).isPublished ? (
                  <div className="flex items-center gap-1.5">
                    <Link href={`/read/${bookId}`}>
                      <Button size="sm" variant="outline" className="rounded-lg h-8 text-xs font-semibold gap-1.5 border-border/70">
                        <Eye className="w-3.5 h-3.5" />
                        {lang === "ar" ? "عرض" : "View"}
                      </Button>
                    </Link>
                    <Button
                      size="sm" variant="outline"
                      className="rounded-lg h-8 text-xs font-semibold gap-1.5 border-border/70 text-muted-foreground"
                      disabled={publishBook.isPending}
                      onClick={() => publishBook.mutate({ id: bookId, publish: false }, {
                        onSuccess: () => toast({ title: lang === "ar" ? "تم إلغاء النشر" : "Unpublished" }),
                      })}
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{publishBook.isPending ? "..." : (lang === "ar" ? "إلغاء النشر" : "Unpublish")}</span>
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    className="rounded-lg h-8 text-xs font-semibold gap-1.5 bg-foreground text-background hover:bg-foreground/90 border-0"
                    data-testid="button-finish-publish"
                    onClick={() => { if (!user) { setIsAuthModalOpen(true); } else { setIsPublishConfirmOpen(true); } }}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    {lang === "ar" ? "نشر الكتاب" : "Publish"}
                  </Button>
                )
              )}
            </div>
          </div>

          {/* ── Publish Confirmation Dialog ── */}
          {book && (
            <Dialog open={isPublishConfirmOpen} onOpenChange={setIsPublishConfirmOpen}>
              <DialogContent className="rounded-2xl max-w-sm" style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)" }}>
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
                    style={{ background: "#ffffff", color: "#111111" }}
                    disabled={publishBook.isPending}
                    data-testid="button-confirm-publish"
                    onClick={() => publishBook.mutate({ id: bookId, publish: true }, {
                      onSuccess: () => {
                        setIsPublishConfirmOpen(false);
                        toast({
                          title: lang === "ar" ? "🎉 تم النشر!" : "🎉 Published!",
                          description: lang === "ar"
                            ? "كتابك الآن متاح في المكتبة المجتمعية."
                            : "Your book is now live in the Plotzy Community Library.",
                        });
                        navigate("/library");
                      },
                      onError: (err: any) => {
                        toast({
                          title: lang === "ar" ? "فشل النشر" : "Publish failed",
                          description: err?.message || (lang === "ar" ? "حدث خطأ ما، حاول مجدداً." : "Something went wrong, please try again."),
                          variant: "destructive",
                        });
                      },
                    })}
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
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("chapters")}</h2>
                  <Dialog open={isChapterDialogOpen} onOpenChange={setIsChapterDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="rounded-lg font-semibold text-sm bg-foreground text-background hover:bg-foreground/90 border-0" data-testid="button-new-chapter">
                        <Plus className="w-4 h-4 mr-1.5" />
                        {t("newChapter")}
                      </Button>
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
                          <Button type="submit" disabled={createChapter.isPending || !chapterTitle.trim()} className="w-full rounded-lg font-semibold text-[#111111] border-0" style={{ background: "#EFEFEF" }} data-testid="button-create-chapter">
                            {createChapter.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("createChapter")}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {!sortedChapters.length ? (
                  <div className="text-center py-14 rounded-xl border border-dashed border-foreground/10">
                    <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground font-medium">{t("noChaptersYet")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("noChaptersDesc")}</p>
                  </div>
                ) : (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="chapters-list">
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
                          {sortedChapters.map((chapter, index) => (
                            <Draggable key={chapter.id} draggableId={String(chapter.id)} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${snapshot.isDragging ? "bg-foreground/[0.08] shadow-md ring-1 ring-foreground/10" : "hover:bg-foreground/[0.04]"}`}
                                  data-testid={`card-chapter-${chapter.id}`}
                                >
                                  {/* Drag handle */}
                                  <div
                                    {...provided.dragHandleProps}
                                    className="text-muted-foreground/20 hover:text-muted-foreground/50 cursor-grab active:cursor-grabbing shrink-0 transition-colors"
                                  >
                                    <GripVertical className="w-4 h-4" />
                                  </div>

                                  {/* Number badge */}
                                  <div className="w-6 h-6 rounded-md bg-foreground/[0.06] text-muted-foreground flex items-center justify-center font-bold text-[11px] shrink-0 tabular-nums">
                                    {index + 1}
                                  </div>

                                  {/* Title & meta — clicking navigates to editor */}
                                  <div className="flex-1 min-w-0">
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
                                        className="font-semibold text-sm bg-background border border-black/30 dark:border-white/20 rounded-md px-2 py-0.5 w-full outline-none focus:ring-1 focus:ring-foreground/30"
                                        dir={isRTL ? "rtl" : "ltr"}
                                      />
                                    ) : (
                                      <Link href={`/books/${bookId}/chapters/${chapter.id}`} className="block group/link">
                                        <h4 className="font-semibold text-sm text-foreground line-clamp-1 group-hover/link:text-foreground/80 transition-colors">
                                          {chapter.title}
                                        </h4>
                                        <p className="text-xs text-muted-foreground/60 flex items-center gap-1.5 mt-0.5">
                                          {chapter.createdAt ? format(new Date(chapter.createdAt), 'MMM d, h:mm a') : ''}
                                          {countChapterWords(chapter.content) > 0 && (
                                            <><span>·</span><span>{countChapterWords(chapter.content).toLocaleString()} {lang === "ar" ? "كلمة" : "words"}</span></>
                                          )}
                                        </p>
                                      </Link>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    {editingChapterId !== chapter.id && (
                                      <button
                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/30 hover:text-muted-foreground hover:bg-foreground/[0.06] transition-all opacity-0 group-hover:opacity-100"
                                        onClick={(e) => handleStartRename(e, chapter.id, chapter.title)}
                                        title={lang === "ar" ? "إعادة التسمية" : "Rename"}
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {editingChapterId !== chapter.id && (
                                      <Link href={`/books/${bookId}/chapters/${chapter.id}`}>
                                        <button className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-foreground/[0.06] transition-all">
                                          <PenLine className="w-3.5 h-3.5" />
                                        </button>
                                      </Link>
                                    )}
                                  </div>
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

              const PAGE_SECTIONS = [
                { key: "copyright", label: "Copyright", icon: FileText, placeholder: `© ${new Date().getFullYear()} ${book.authorName || "Your Name"}. All rights reserved.\n\nPublished by Plotzy.\n\nNo part of this publication may be reproduced without permission.`, desc: "Auto-included in every PDF export. Edit to customize." },
                { key: "dedication", label: "Dedication", icon: Quote, placeholder: "For everyone who believed in this story before I did.", desc: "A personal note at the start of your book." },
                { key: "epigraph", label: "Epigraph", icon: Quote, placeholder: "\"The beginning is always today.\"\n— Mary Shelley", desc: "An opening quote or phrase that sets the tone." },
                { key: "aboutAuthor", label: "About the Author", icon: User, placeholder: `${book.authorName || "Your name"} is a writer based in...`, desc: "Placed at the back of your book when exported." },
              ] as const;

              return (
                <div className="space-y-4">
                  {/* Writing Goal card */}
                  <div className="rounded-xl bg-foreground/[0.03] p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-foreground" />
                        <span className="font-semibold text-sm">{lang === "ar" ? "هدف الكتابة" : "Writing Goal"}</span>
                      </div>
                      {!editingGoal && (
                        <button onClick={() => { setEditingGoal(true); setGoalDraft(String(goal || "")); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {editingGoal ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          autoFocus
                          value={goalDraft}
                          onChange={e => setGoalDraft(e.target.value)}
                          placeholder={lang === "ar" ? "مثال: 80000" : "e.g. 80000"}
                          className="h-8 text-sm rounded-lg"
                        />
                        <Button size="sm" className="h-8 rounded-lg text-[#111111] border-0 px-3" style={{ background: "#EFEFEF" }} onClick={() => {
                          updateBook.mutate({ id: bookId, wordGoal: parseInt(goalDraft) || 0 } as any);
                          setEditingGoal(false);
                        }}><Check className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-8 rounded-lg px-2" onClick={() => setEditingGoal(false)}>✕</Button>
                      </div>
                    ) : goal > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{totalWords.toLocaleString()} {lang === "ar" ? "كلمة" : "words written"}</span>
                          <span>{goalPct}% — {lang === "ar" ? "الهدف:" : "Goal:"} {goal.toLocaleString()}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${goalPct}%`, background: "hsl(var(--foreground))" }} />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">{lang === "ar" ? "لم يُحدد هدف بعد. اضغط ✎ لتعيين هدف الكلمات." : "No goal set yet. Click ✎ to set a word count target."}</p>
                    )}
                  </div>

                  {/* Page sections */}
                  {PAGE_SECTIONS.map(({ key, label, icon: Icon, placeholder, desc }) => {
                    const content = pages[key as keyof BookPages] || "";
                    const isEditing = editingSection === key;
                    return (
                      <div key={key} className="rounded-xl bg-foreground/[0.03] overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-foreground/[0.06]">
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4 text-foreground" />
                            <span className="font-semibold text-sm">{label}</span>
                            <span className="text-xs text-muted-foreground hidden sm:block">— {desc}</span>
                          </div>
                          {!isEditing ? (
                            <Button size="sm" variant="outline" className="h-7 rounded-lg text-xs px-3" onClick={() => { setEditingSection(key); setSectionDraft(content || placeholder); }}>
                              <Edit3 className="w-3 h-3 mr-1" />{content ? (lang === "ar" ? "تعديل" : "Edit") : (lang === "ar" ? "إضافة" : "Add")}
                            </Button>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Button size="sm" className="h-7 rounded-lg text-xs px-3 text-[#111111] border-0" style={{ background: "#EFEFEF" }} onClick={() => {
                                const updated = { ...pages, [key]: sectionDraft };
                                updateBook.mutate({ id: bookId, bookPages: updated } as any);
                                setEditingSection(null);
                                toast({ title: lang === "ar" ? "تم الحفظ" : "Saved!" });
                              }}><Check className="w-3 h-3 mr-1" />{lang === "ar" ? "حفظ" : "Save"}</Button>
                              <Button size="sm" variant="ghost" className="h-7 rounded-lg text-xs px-2" onClick={() => setEditingSection(null)}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
                            </div>
                          )}
                        </div>
                        <div className="px-5 py-4">
                          {isEditing ? (
                            <Textarea
                              autoFocus
                              value={sectionDraft}
                              onChange={e => setSectionDraft(e.target.value)}
                              className="min-h-[120px] resize-none text-sm rounded-lg border-border"
                              dir={isRTL ? "rtl" : "ltr"}
                            />
                          ) : content ? (
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-3">{content}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground/60 italic leading-relaxed line-clamp-2">{placeholder}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {activeTab === "research" && (
              <div className="p-4">
                <ResearchBoard bookId={bookId} />
              </div>
            )}

            {activeTab === "analytics" && (
              <AnalyticsDashboard bookId={bookId} />
            )}

            {activeTab === "tools" && (
              <section className="p-4 space-y-8 relative">
                {/* ── AI Writing Tools ── */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1 border-b border-border/20">
                    <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {lang === "ar" ? "تحليل ذكي" : "AI Analysis"}
                    </span>
                  </div>
                  <AIAnalysisTools bookId={bookId} />
                </div>

                {/* ── Publishing Tools ── */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1 border-b border-border/20">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {lang === "ar" ? "النشر والتوزيع" : "Publishing"}
                    </span>
                  </div>
                  <BookPublishingTools bookId={bookId} bookTitle={book.title} currentIsbn={(book as any).isbn} />
                </div>

                {/* ── Import ── */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1 border-b border-border/20">
                    <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {lang === "ar" ? "استيراد" : "Import"}
                    </span>
                  </div>
                  <LegacyImporter bookId={bookId} />
                </div>
              </section>
            )}

          </div>{/* end tab content */}
        </div>{/* end right column */}
      </div>{/* end grid */}

      {/* Export Template Picker Dialog */}
      {showTemplatePicker && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowTemplatePicker(false); }}>
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md border border-border p-6 space-y-5">
            <h3 className="text-lg font-bold">{lang === "ar" ? "اختر قالب التصدير" : "Choose Export Template"}</h3>
            <div className="grid grid-cols-3 gap-3">
              {([ { id: "classic", label: "Classic", desc: "Lora serif, elegant", icon: "📖" },
                  { id: "modern",  label: "Modern",  desc: "Clean Inter + Playfair", icon: "✦" },
                  { id: "romance", label: "Romance", desc: "Cormorant drop caps", icon: "❧" },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setExportTemplate(t.id)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-all ${exportTemplate === t.id ? "border-foreground bg-foreground/10" : "border-border hover:border-foreground/30"}`}>
                  <span className="text-2xl">{t.icon}</span>
                  <span>{t.label}</span>
                  <span className="text-[10px] text-muted-foreground text-center">{t.desc}</span>
                  {exportTemplate === t.id && <Check className="w-3.5 h-3.5 text-foreground" />}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Button className="flex-1 rounded-xl text-[#111111] border-0 font-semibold" style={{ background: "#EFEFEF" }}
                onClick={async () => {
                  setShowTemplatePicker(false);
                  setIsDownloading(true);
                  try {
                    const url = `/api/books/${bookId}/download?format=pdf&template=${exportTemplate}`;
                    window.open(url, "_blank");
                  } finally { setIsDownloading(false); }
                }}>
                <FileDown className="w-4 h-4 mr-2" />{lang === "ar" ? "تنزيل PDF" : "Download PDF"}
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={() => setShowTemplatePicker(false)}>
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <AuthModal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </Layout>
  );
}
