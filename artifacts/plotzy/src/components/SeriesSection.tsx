import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Plus, Pencil, Trash2, X, Check, ChevronRight, ChevronLeft, Layers,
  ChevronDown, ChevronUp, FileText, Type, Target, Send, Globe, Share2, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { PerspectiveBook } from "@/components/ui/perspective-book";
import { BookCoverShader } from "@/components/ui/book-cover-shader";
import {
  useSeries, useCreateSeries, useUpdateSeries, useDeleteSeries,
  useAddBookToSeries, useRemoveBookFromSeries, useReorderSeriesBooks,
  usePublishSeries,
  type BookSeriesWithBooks,
} from "@/hooks/use-series";
import type { Book } from "@/shared/api-schemas";

type Props = { books: Book[] | undefined };

// Book cover matching the original library style
function MiniCover({ book, onClick }: { book: { id: number; title: string; coverImage?: string | null; spineColor?: string | null; genre?: string | null }; onClick: () => void }) {
  const spine = book.spineColor ?? "#1a1a2e";
  const [hover, setHover] = useState(false);
  const { data: chapterCount } = useQuery<number>({
    queryKey: ["book-chapter-count", book.id],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/books/${book.id}/chapters`, { credentials: "include" });
        if (!res.ok) return 0;
        const chs = await res.json();
        return Array.isArray(chs) ? chs.length : 0;
      } catch { return 0; }
    },
    enabled: hover,
    staleTime: 60_000,
  });
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex-shrink-0 focus:outline-none text-left relative"
      style={{ width: 90 }}
    >
      {/* Custom tooltip */}
      {hover && (
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-16 z-50 px-3 py-2 rounded-lg shadow-xl pointer-events-none whitespace-nowrap"
          style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <p className="text-xs font-semibold text-white mb-0.5">{book.title}</p>
          <p className="text-[10px] text-white/40">
            {chapterCount !== undefined
              ? `${chapterCount} ${chapterCount === 1 ? "chapter" : "chapters"}`
              : "Loading..."}
          </p>
          {/* Arrow */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 rotate-45"
            style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderTop: "none", borderLeft: "none" }}
          />
        </div>
      )}
      <PerspectiveBook spineColor={spine}>
        {/* Shader background (same as original — no coverImage) */}
        {!book.coverImage && (
          <div className="absolute inset-0">
            <BookCoverShader bookId={book.id} speed={0.5} />
          </div>
        )}
        {/* Cover image */}
        {book.coverImage && (
          <img src={book.coverImage} alt={book.title} className="absolute inset-0 w-full h-full object-cover object-center" />
        )}
        {/* Top gloss */}
        <div className="absolute top-0 inset-x-0 h-1/2 pointer-events-none z-20" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.04), transparent)' }} />
        {/* Title overlay */}
        <div className="absolute bottom-0 inset-x-0 p-2 flex flex-col justify-end z-20" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 55%, transparent 100%)' }}>
          <h3 className="text-white font-bold leading-tight line-clamp-2" style={{ fontSize: 8, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif", textShadow: '0 1px 8px rgba(0,0,0,0.7)' }}>{book.title}</h3>
          <div className="mt-0.5 tracking-[0.18em] uppercase" style={{ fontSize: '7px', color: 'rgba(255,255,255,0.35)' }}>{book.genre ?? 'Book'}</div>
        </div>
      </PerspectiveBook>
    </button>
  );
}

// Manage books dialog
function ManageBooksDialog({
  series,
  allBooks,
  open,
  onOpenChange,
}: {
  series: BookSeriesWithBooks;
  allBooks: Book[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const addBook = useAddBookToSeries();
  const removeBook = useRemoveBookFromSeries();
  const { toast } = useToast();

  const seriesBookIds = new Set(series.books.map((b) => b.id));
  const candidates = allBooks.filter((b) => b.contentType !== "article");

  async function toggle(book: Book) {
    if (seriesBookIds.has(book.id)) {
      await removeBook.mutateAsync({ seriesId: series.id, bookId: book.id });
      toast({ title: `Removed from "${series.name}"` });
    } else {
      await addBook.mutateAsync({ seriesId: series.id, bookId: book.id });
      toast({ title: `Added to "${series.name}"` });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111] border border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-base font-semibold">Manage Books — {series.name}</DialogTitle>
        </DialogHeader>
        <p className="text-white/40 text-xs mb-4">Toggle books to add or remove them from this series.</p>
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {candidates.length === 0 && (
            <p className="text-white/30 text-sm text-center py-6">No books yet.</p>
          )}
          {candidates.map((book) => {
            const spine = book.spineColor ?? "#333";
            const inSeries = seriesBookIds.has(book.id);
            return (
              <button
                key={book.id}
                onClick={() => toggle(book)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200 text-left ${
                  inSeries
                    ? "border-white/30 bg-white/10"
                    : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                <div
                  className="relative flex-shrink-0 rounded-sm overflow-hidden shadow"
                  style={{ width: 28, height: 40, background: spine }}
                >
                  {book.coverImage && (
                    <img src={book.coverImage} alt={book.title} className="absolute inset-0 w-full h-full object-cover" />
                  )}
                </div>
                <span className="flex-1 text-sm text-white/80 truncate">{book.title}</span>
                <span className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${inSeries ? "bg-white border-white" : "border-white/20"}`}>
                  {inSeries && <Check className="w-3 h-3 text-black" />}
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Single series shelf card
function SeriesCard({
  series,
  allBooks,
}: {
  series: BookSeriesWithBooks;
  allBooks: Book[];
}) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const updateSeries = useUpdateSeries();
  const deleteSeries = useDeleteSeries();
  const reorder = useReorderSeriesBooks();
  const publishSeries = usePublishSeries();
  const [shareCopied, setShareCopied] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(series.name);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descVal, setDescVal] = useState(series.description || "");
  const [manageOpen, setManageOpen] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  // Collapse empty series by default, but auto-expand if they have books
  const [expanded, setExpanded] = useState(series.books.length > 0);

  async function saveName() {
    if (!nameVal.trim() || nameVal.trim() === series.name) { setEditingName(false); return; }
    await updateSeries.mutateAsync({ id: series.id, name: nameVal.trim() });
    setEditingName(false);
    toast({ title: "Series renamed" });
  }

  async function saveDesc() {
    if (descVal.trim() === (series.description || "")) { setEditingDesc(false); return; }
    await updateSeries.mutateAsync({ id: series.id, description: descVal.trim() });
    setEditingDesc(false);
    toast({ title: "Description updated" });
  }

  // Series stats (coming from backend)
  const stats = (series as any).stats as { totalChapters: number; totalWords: number; totalWordGoal: number } | undefined;
  const isEmpty = series.books.length === 0;
  const isPublished = !!series.isPublished;

  async function togglePublish() {
    try {
      await publishSeries.mutateAsync({ id: series.id, publish: !isPublished });
      toast({ title: isPublished ? "Series unpublished" : "Series published!" });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  }

  function copyShareLink() {
    const url = `${window.location.origin}/series/${series.id}`;
    navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
    toast({ title: "Link copied!" });
  }

  async function handleDelete() {
    await deleteSeries.mutateAsync(series.id);
    toast({ title: `Series "${series.name}" deleted` });
    setShowConfirmDelete(false);
  }

  async function moveBook(idx: number, dir: -1 | 1) {
    const arr = [...series.books];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    await reorder.mutateAsync({ seriesId: series.id, order: arr.map((b) => b.id) });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="group/card relative rounded-2xl border border-white/8 bg-white/[0.025] hover:border-white/15 transition-all duration-300 p-5 overflow-visible"
    >
      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-8 h-8 rounded-lg bg-white/8 border border-white/12 flex items-center justify-center flex-shrink-0 mt-0.5 hover:bg-white/12 transition-colors"
          title={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronUp className="w-4 h-4 text-white/50" /> : <ChevronDown className="w-4 h-4 text-white/50" />}
        </button>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <form onSubmit={(e) => { e.preventDefault(); saveName(); }} className="flex items-center gap-2">
              <Input
                autoFocus
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                className="h-7 text-sm bg-white/5 border-white/20 text-white focus:border-white/50 px-2"
                onClick={(e) => e.stopPropagation()}
              />
              <button type="submit" className="p-1 text-white/60 hover:text-white"><Check className="w-4 h-4" /></button>
              <button type="button" onClick={() => { setNameVal(series.name); setEditingName(false); }} className="p-1 text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button>
            </form>
          ) : (
            <h3 className="text-base font-semibold text-white leading-tight truncate">{series.name}</h3>
          )}
          <p className="text-[10px] text-white/25 mt-1 font-medium tracking-wider uppercase">
            {isEmpty ? "No books yet" : `${series.books.length} book${series.books.length !== 1 ? "s" : ""}`}
            {stats && stats.totalChapters > 0 && ` · ${stats.totalChapters} ${stats.totalChapters === 1 ? "chapter" : "chapters"}`}
            {stats && stats.totalWords > 0 && ` · ${stats.totalWords.toLocaleString()} words`}
          </p>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {/* Published badge — always visible when published */}
          {isPublished && (
            <span className="hidden sm:flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: "rgba(124,106,247,0.15)", color: "#a78bfa", border: "1px solid rgba(124,106,247,0.3)" }}>
              <Globe className="w-2.5 h-2.5" /> Live
            </span>
          )}
          {/* Share link button — only when published */}
          {isPublished && (
            <button
              onClick={copyShareLink}
              className="p-1.5 rounded-lg text-white/40 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
              title="Copy public link"
            >
              {shareCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>
          )}
          <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
            <button
              onClick={() => setEditingName(true)}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-all"
              title="Rename"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setManageOpen(true)}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-all"
              title="Manage books"
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Delete series"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Description section — editable */}
      {expanded && (
        <div className="mb-4">
          {editingDesc ? (
            <div className="space-y-2">
              <Textarea
                autoFocus
                value={descVal}
                onChange={(e) => setDescVal(e.target.value)}
                placeholder="Describe your series — genre, setting, characters, themes..."
                rows={3}
                className="bg-white/5 border-white/15 text-white placeholder:text-white/20 focus:border-white/30 resize-none text-sm"
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setDescVal(series.description || ""); setEditingDesc(false); }} className="text-xs text-white/40 hover:text-white/70 px-3 py-1">Cancel</button>
                <button type="button" onClick={saveDesc} className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-md border border-white/15">Save</button>
              </div>
            </div>
          ) : series.description ? (
            <button type="button" onClick={() => setEditingDesc(true)} className="group/desc cursor-pointer p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all w-full text-left">
              <p className="text-sm text-white/60 leading-relaxed">{series.description}</p>
              <span className="text-[10px] text-white/25 mt-1 block opacity-0 group-hover/desc:opacity-100 transition-opacity">Click to edit</span>
            </button>
          ) : (
            <button onClick={() => setEditingDesc(true)} className="w-full text-left text-xs text-white/30 hover:text-white/60 transition-colors border border-dashed border-white/10 hover:border-white/20 rounded-lg px-3 py-2">
              + Add description
            </button>
          )}
        </div>
      )}

      {/* Stats row — only when expanded and has stats */}
      {expanded && stats && series.books.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2">
            <div className="flex items-center gap-1.5 text-white/40 text-[9px] uppercase tracking-wider font-semibold">
              <FileText className="w-3 h-3" /> Chapters
            </div>
            <p className="text-base font-bold text-white mt-0.5">{stats.totalChapters.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2">
            <div className="flex items-center gap-1.5 text-white/40 text-[9px] uppercase tracking-wider font-semibold">
              <Type className="w-3 h-3" /> Words
            </div>
            <p className="text-base font-bold text-white mt-0.5">{stats.totalWords.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2">
            <div className="flex items-center gap-1.5 text-white/40 text-[9px] uppercase tracking-wider font-semibold">
              <Target className="w-3 h-3" /> Progress
            </div>
            <p className="text-base font-bold text-white mt-0.5">
              {stats.totalWordGoal > 0
                ? `${Math.min(100, Math.round((stats.totalWords / stats.totalWordGoal) * 100))}%`
                : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Book shelf — only when expanded */}
      {!expanded ? null : series.books.length === 0 ? (
        <button
          onClick={() => setManageOpen(true)}
          className="w-full h-24 rounded-xl border border-dashed border-white/10 flex items-center justify-center gap-2 text-white/25 hover:text-white/40 hover:border-white/20 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Add books to this series
        </button>
      ) : (
        <div className="flex items-end gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {series.books.map((seriesBook, idx) => {
            // Use full book data from allBooks (has coverImage, spineColor etc.) — fall back to series book data
            const fullBook = allBooks.find((b) => b.id === seriesBook.id) ?? seriesBook;
            return (
            <div key={seriesBook.id} className="relative flex-shrink-0 flex flex-col items-center gap-1">
              {/* Reorder arrows */}
              <div className="flex gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity h-4">
                <button
                  disabled={idx === 0}
                  onClick={() => moveBook(idx, -1)}
                  className="p-0.5 text-white/20 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  disabled={idx === series.books.length - 1}
                  onClick={() => moveBook(idx, 1)}
                  className="p-0.5 text-white/20 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              {/* Cover — uses full book data so coverImage is always present */}
              <MiniCover book={fullBook} onClick={() => setLocation(`/books/${seriesBook.id}`)} />
              {/* Volume badge */}
              <span className="text-[9px] font-semibold text-white/30 uppercase tracking-wider mt-1">
                Vol. {idx + 1}
              </span>
            </div>
            );
          })}
          {/* + add more */}
          <button
            onClick={() => setManageOpen(true)}
            className="flex-shrink-0 rounded-[4px] border border-dashed border-white/12 flex items-center justify-center text-white/20 hover:text-white/40 hover:border-white/25 transition-all self-center mt-4"
            style={{ width: 56, height: 80 }}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="mt-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Publish section — only show when expanded and series has books */}
      {expanded && !isEmpty && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white/70">
              {isPublished ? "Published as a series" : "Publish this series"}
            </p>
            <p className="text-[11px] text-white/35 mt-0.5">
              {isPublished
                ? "Readers can discover & share all books together"
                : "Share one link that shows all your books in order"}
            </p>
          </div>
          <button
            onClick={togglePublish}
            disabled={publishSeries.isPending}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isPublished
                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                : "bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 border border-violet-500/30"
            }`}
          >
            {isPublished ? (
              <><Globe className="w-3 h-3" /> Unpublish</>
            ) : (
              <><Send className="w-3 h-3" /> Publish Series</>
            )}
          </button>
        </div>
      )}

      <ManageBooksDialog
        series={series}
        allBooks={allBooks ?? []}
        open={manageOpen}
        onOpenChange={setManageOpen}
      />

      <AnimatePresence>
        {showConfirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 bg-[#0c0c0c]/95 rounded-2xl flex flex-col items-center justify-center gap-3 px-6 text-center"
          >
            <Trash2 className="w-6 h-6 text-white/50" />
            <p className="text-sm text-white/80">Delete <span className="font-semibold text-white">"{series.name}"</span>?</p>
            <p className="text-xs text-white/35">Your books won't be deleted, just unlinked from this series.</p>
            <div className="flex gap-2 mt-1">
              <Button size="sm" variant="ghost" onClick={() => setShowConfirmDelete(false)} className="text-white/50 hover:text-white/80 hover:bg-white/8 border border-white/10 text-xs h-8">
                Cancel
              </Button>
              <Button size="sm" onClick={handleDelete} className="bg-white/10 hover:bg-white/20 text-white text-xs h-8 border border-white/15">
                Delete Series
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Create Series dialog
function CreateSeriesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useCreateSeries();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await create.mutateAsync({ name: name.trim(), description: desc.trim() || undefined });
    toast({ title: `Series "${name.trim()}" created!` });
    setName(""); setDesc("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111] border border-white/10 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white text-base font-semibold flex items-center gap-2">
            <Layers className="w-4 h-4 text-white/50" /> New Book Series
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider font-semibold block mb-1.5">Series Name</label>
            <Input
              autoFocus
              placeholder='e.g. "The Dark Tower" or "Mistborn"'
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/5 border-white/15 text-white placeholder:text-white/20 focus:border-white/40"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider font-semibold block mb-1.5">
              Description <span className="text-white/20 normal-case tracking-normal font-normal">(optional)</span>
            </label>
            <Textarea
              placeholder="A short description of this series…"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              className="bg-white/5 border-white/15 text-white placeholder:text-white/20 focus:border-white/40 resize-none text-sm"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/5 text-sm">
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || create.isPending} className="flex-1 bg-white text-black hover:bg-white/90 text-sm border-0">
              {create.isPending ? "Creating…" : "Create Series"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main exported component ──────────────────────────────────────────────────
export function SeriesSection({ books }: Props) {
  const { data: seriesList, isLoading } = useSeries();
  const [createOpen, setCreateOpen] = useState(false);

  if (isLoading) return null;

  return (
    <section className="bg-[#050505] border-t border-white/8 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/25 mb-1.5">Collections</p>
            <h2 className="text-2xl font-bold text-white tracking-tight leading-none">Book Series</h2>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 hover:border-white/20 text-sm h-9"
            variant="ghost"
          >
            <Plus className="w-3.5 h-3.5" />
            New Series
          </Button>
        </div>

        {/* Series grid or empty state */}
        {(!seriesList || seriesList.length === 0) ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-dashed border-white/8 py-16 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-6 h-6 text-white/30" />
            </div>
            <h3 className="text-white/60 font-semibold mb-2">No series yet</h3>
            <p className="text-white/30 text-sm mb-6 max-w-xs mx-auto">
              Group your books into a trilogy, saga, or series — keep your universe organized.
            </p>
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-white text-black hover:bg-white/90 border-0 gap-2 text-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Create your first series
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {seriesList.map((series) => (
                <SeriesCard key={series.id} series={series} allBooks={(books ?? []).filter((b) => b.contentType !== "article")} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <CreateSeriesDialog open={createOpen} onOpenChange={setCreateOpen} />
    </section>
  );
}
