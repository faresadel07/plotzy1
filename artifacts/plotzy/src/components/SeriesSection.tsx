import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Plus, Pencil, Trash2, X, Check, ChevronRight, ChevronLeft, Layers
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
  type BookSeriesWithBooks,
} from "@/hooks/use-series";
import type { Book } from "@/hooks/use-books";

type Props = { books: Book[] | undefined };

// Book cover matching the original library style
function MiniCover({ book, onClick }: { book: { id: number; title: string; coverImage?: string | null; spineColor?: string | null; genre?: string | null }; onClick: () => void }) {
  const spine = book.spineColor ?? "#1a1a2e";
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 focus:outline-none text-left"
      title={book.title}
      style={{ width: 90 }}
    >
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

  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(series.name);
  const [manageOpen, setManageOpen] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  async function saveName() {
    if (!nameVal.trim() || nameVal.trim() === series.name) { setEditingName(false); return; }
    await updateSeries.mutateAsync({ id: series.id, name: nameVal.trim() });
    setEditingName(false);
    toast({ title: "Series renamed" });
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
      <div className="flex items-start gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-white/8 border border-white/12 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Layers className="w-4 h-4 text-white/50" />
        </div>
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
          {series.description && !editingName && (
            <p className="text-xs text-white/35 mt-0.5 line-clamp-1">{series.description}</p>
          )}
          <p className="text-[10px] text-white/25 mt-1 font-medium tracking-wider uppercase">
            {series.books.length === 0 ? "No books" : `${series.books.length} book${series.books.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {/* Action buttons */}
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

      {/* Book shelf */}
      {series.books.length === 0 ? (
        <button
          onClick={() => setManageOpen(true)}
          className="w-full h-24 rounded-xl border border-dashed border-white/10 flex items-center justify-center gap-2 text-white/25 hover:text-white/40 hover:border-white/20 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Add books to this series
        </button>
      ) : (
        <div className="flex items-end gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {series.books.map((book, idx) => (
            <div key={book.id} className="relative flex-shrink-0 flex flex-col items-center gap-1">
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
              {/* Cover */}
              <MiniCover book={book} onClick={() => setLocation(`/books/${book.id}`)} />
              {/* Volume badge */}
              <span className="text-[9px] font-semibold text-white/30 uppercase tracking-wider mt-1">
                Vol. {idx + 1}
              </span>
            </div>
          ))}
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
