import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useRoute, Link, useLocation } from "wouter";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Layout } from "@/components/layout";
import { useBook, useUpdateBook, useGenerateCover, useGenerateBlurb } from "@/hooks/use-books";
import { useChapters, useCreateChapter, useUpdateChapter, useReorderChapters } from "@/hooks/use-chapters";
import { usePublishBook } from "@/hooks/use-public-library";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import AnalyticsDashboard from "@/components/analytics-dashboard";
import OutlineBoard from "@/components/outline-board";
import { ResearchBoard } from "@/components/research-board";
import { AIAnalysisTools } from "@/components/ai-analysis-tools";
import { BookPublishingTools } from "@/components/book-publishing-tools";
import LegacyImporter from "@/components/LegacyImporter";
import {
  FileText, Image as ImageIcon, Loader2, Plus, Wand2, Calendar, Sparkles,
  BookOpen, Palette, PenLine, Zap, Download, FileDown, Upload, Globe,
  BarChart3, LayoutTemplate, ScrollText, Check, Edit3, Target, ChevronDown, Quote, User, Eye, EyeOff,
  GripVertical, BookMarked
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { BookPages } from "@/shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import type { Book } from "@/shared/schema";

const RTL_LANGS = ["ar", "he", "fa", "ur"];

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
  const [activeTab, setActiveTab] = useState<"chapters" | "outline" | "analytics" | "tools" | "pages" | "research">("chapters");
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

  if (isLoadingBook || isLoadingChapters) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-black dark:text-white" />
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
    <Layout>
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
                const totalWords = (chapters || []).reduce((acc, ch) => {
                  try {
                    const p = JSON.parse(ch.content);
                    if (Array.isArray(p)) return acc + p.join(" ").trim().split(/\s+/).filter(Boolean).length;
                  } catch {}
                  return acc + ch.content.trim().split(/\s+/).filter(Boolean).length;
                }, 0);
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

        {/* Right Column — vertical tab sidebar + content */}
        <div className="lg:col-span-8 pb-8">
          <div className="flex gap-4">

            {/* ── Vertical Tab Sidebar ── */}
            <div className="flex-shrink-0 flex flex-col gap-1 pt-1" style={{ width: 130 }}>
              {(
                [
                  { key: "chapters",  icon: BookOpen,       label: lang === "ar" ? "الفصول"        : "Chapters"       },
                  { key: "pages",     icon: ScrollText,      label: lang === "ar" ? "صفحات الكتاب"  : "Book Pages"     },
                  { key: "outline",   icon: LayoutTemplate, label: lang === "ar" ? "لوحة الأحداث"  : "Story Board"    },
                  { key: "research",  icon: BookMarked,      label: lang === "ar" ? "لوحة البحث"   : "Research"       },
                  { key: "analytics", icon: BarChart3,       label: lang === "ar" ? "الإحصائيات"   : "Analytics"      },
                  { key: "tools",     icon: Sparkles,        label: lang === "ar" ? "أدوات"         : "Tools"          },
                ] as const
              ).map(({ key, icon: Icon, label }) => {
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "9px 12px",
                      borderRadius: 10,
                      border: active
                        ? "1px solid hsl(var(--foreground) / 0.12)"
                        : "1px solid transparent",
                      background: active
                        ? "hsl(var(--foreground) / 0.06)"
                        : "transparent",
                      cursor: "pointer",
                      width: "100%",
                      textAlign: isRTL ? "right" : "left",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--foreground) / 0.04)"; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                  >
                    <Icon
                      size={15}
                      style={{ color: active ? "hsl(var(--foreground))" : "var(--muted-foreground)", flexShrink: 0 }}
                    />
                    <span style={{
                      fontSize: 13,
                      fontWeight: active ? 700 : 500,
                      color: active ? "var(--foreground)" : "var(--muted-foreground)",
                      whiteSpace: "nowrap",
                    }}>
                      {label}
                    </span>
                  </button>
                );
              })}

              {/* ── Actions below tabs ── */}
              <div className="mt-3 pt-3 border-t border-border/50 flex flex-col gap-1.5">
                {/* AI Suite */}
                <Link href="/marketplace">
                  <button
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold transition-all border border-border/60 bg-card hover:bg-foreground/[0.04] text-foreground/70 hover:text-foreground"
                  >
                    <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{lang === "ar" ? "مجموعة الذكاء الاصطناعي" : "AI Suite"}</span>
                  </button>
                </Link>

                {book && (
                  (book as any).isPublished ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 px-1 py-1">
                        <Check className="w-3 h-3 text-foreground/50 flex-shrink-0" />
                        <span className="text-[11px] font-semibold text-foreground/60 truncate">
                          {lang === "ar" ? "منشور" : "Published"}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Link href={`/read/${bookId}`} className="flex-1">
                          <button className="w-full text-[11px] font-semibold rounded-lg py-1.5 border border-border/60 bg-card hover:bg-foreground/[0.04] text-foreground/70 transition-colors">
                            {lang === "ar" ? "عرض" : "View"}
                          </button>
                        </Link>
                        <button
                          className="flex-1 text-[11px] font-semibold rounded-lg py-1.5 border border-border/60 bg-card hover:bg-foreground/[0.04] text-foreground/60 transition-colors"
                          disabled={publishBook.isPending}
                          onClick={() => publishBook.mutate({ id: bookId, publish: false }, {
                            onSuccess: () => toast({ title: lang === "ar" ? "تم إلغاء النشر" : "Unpublished" }),
                          })}
                        >
                          {publishBook.isPending ? "..." : (lang === "ar" ? "إلغاء النشر" : "Unpublish")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold transition-all border-0 hover:opacity-90 bg-foreground text-background"
                      data-testid="button-finish-publish"
                      onClick={() => setIsPublishConfirmOpen(true)}
                    >
                      <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{lang === "ar" ? "نشر الكتاب" : "Publish"}</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* ── Publish Confirmation Dialog ── */}
            {book && (
              <Dialog open={isPublishConfirmOpen} onOpenChange={setIsPublishConfirmOpen}>
                <DialogContent className="rounded-2xl max-w-sm" style={{ background: "linear-gradient(160deg, #F5EDD6 0%, #EDE0C4 100%)", border: "1px solid #C8A84B50" }}>
                  <DialogHeader className="text-center pb-2">
                    <div className="text-5xl mb-3 text-center" aria-hidden="true">✒</div>
                    <DialogTitle className="text-xl font-bold text-center leading-snug" style={{ color: "#2D2315" }}>
                      {lang === "ar" ? "هل أنت مستعد لمشاركة تحفتك الفنية؟" : "Ready to share your masterpiece?"}
                    </DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-center leading-relaxed px-2 mb-2" style={{ color: "#5C4A1E" }}>
                    {lang === "ar"
                      ? `سيصبح كتابك "${book.title}" متاحًا للقراء في المكتبة المجتمعية لـ Plotzy. يمكنك إلغاء النشر في أي وقت.`
                      : `"${book.title}" will be available for readers in the Plotzy Community Library. You can unpublish at any time.`}
                  </p>
                  <DialogFooter className="flex flex-col gap-2 sm:flex-col mt-2">
                    <Button
                      className="w-full rounded-xl font-bold text-sm shadow-md border-0 transition-all hover:-translate-y-0.5"
                      style={{ background: "linear-gradient(135deg, #2D2315 0%, #3D3020 100%)", color: "#F5EDD6" }}
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
                        },
                      })}
                    >
                      {publishBook.isPending
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{lang === "ar" ? "جارٍ النشر..." : "Publishing..."}</>
                        : <><BookOpen className="w-4 h-4 mr-2" style={{ color: "#C8A84B" }} />{lang === "ar" ? "نعم، انشر الآن ✦" : "Yes, Publish Now ✦"}</>
                      }
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full rounded-xl font-medium text-sm"
                      style={{ color: "#5C4A1E" }}
                      onClick={() => setIsPublishConfirmOpen(false)}
                    >
                      {lang === "ar" ? "ليس الآن" : "Not yet, keep writing"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* ── Tab Content ── */}
            <div className="flex-1 min-w-0">

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
                                  className={`flex items-center gap-2 px-3 py-3 rounded-xl transition-all group ${snapshot.isDragging ? "bg-foreground/[0.06] shadow-md ring-1 ring-foreground/10" : "hover:bg-foreground/[0.04]"}`}
                                  data-testid={`card-chapter-${chapter.id}`}
                                >
                                  {/* Drag handle */}
                                  <div
                                    {...provided.dragHandleProps}
                                    className="text-muted-foreground/20 hover:text-muted-foreground/60 cursor-grab active:cursor-grabbing shrink-0 transition-colors"
                                  >
                                    <GripVertical className="w-4 h-4" />
                                  </div>

                                  {/* Number badge */}
                                  <div className="w-7 h-7 rounded-full bg-foreground/[0.06] text-foreground/60 flex items-center justify-center font-bold text-xs shrink-0">
                                    {index + 1}
                                  </div>

                                  {/* Title & meta */}
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
                                      <h4
                                        className="font-semibold text-sm text-foreground line-clamp-1 cursor-text hover:text-black dark:hover:text-white transition-colors"
                                        onClick={(e) => handleStartRename(e, chapter.id, chapter.title)}
                                        title={lang === "ar" ? "انقر للتعديل المباشر" : "Click to rename"}
                                      >
                                        {chapter.title}
                                      </h4>
                                    )}
                                    {editingChapterId !== chapter.id && (
                                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                        {chapter.createdAt ? format(new Date(chapter.createdAt), 'MMM d, h:mm a') : ''}
                                        {chapter.content.length > 0 && (
                                          <><span>·</span><span>{Math.ceil(chapter.content.length / 250)} {t("minRead")}</span></>
                                        )}
                                      </p>
                                    )}
                                  </div>

                                  {/* Open chapter button */}
                                  {editingChapterId !== chapter.id && (
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                      <Link href={`/books/${bookId}/chapters/${chapter.id}`}>
                                        <Button variant="ghost" size="sm" className="rounded-lg hover:bg-primary/10 text-primary text-xs flex items-center gap-1">
                                          <PenLine className="w-3 h-3" />
                                          {t("editChapter")}
                                        </Button>
                                      </Link>
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
              const totalWords = (chapters || []).reduce((acc, ch) => {
                try { const p = JSON.parse(ch.content); if (Array.isArray(p)) return acc + p.join(" ").trim().split(/\s+/).filter(Boolean).length; } catch {}
                return acc + ch.content.trim().split(/\s+/).filter(Boolean).length;
              }, 0);
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

            {activeTab === "outline" && (
              <OutlineBoard bookId={bookId} />
            )}

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
          </div>{/* end flex row */}
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

    </Layout>
  );
}
