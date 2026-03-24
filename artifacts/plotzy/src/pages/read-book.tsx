import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import {
  usePublishedBook, usePublishedBookChapters, useIncrementBookView,
  useBookRatingStats, useRateBook, useBookComments, useAddBookComment,
} from "@/hooks/use-public-library";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  BookOpen, ChevronLeft, ChevronRight, ArrowLeft, User, Eye,
  Calendar, ListOrdered, Loader2, Moon, Sun, Star, MessageSquare, Send,
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function renderContent(content: string) {
  let text = content;
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) text = parsed.join("\n\n");
    else if (typeof parsed === "string") text = parsed;
  } catch { }
  text = stripHtmlTags(text);
  const paragraphs = text.split(/\n{2,}/).filter(Boolean);
  return paragraphs.map((p, i) => (
    <p key={i} className="mb-5 last:mb-0">{p.trim()}</p>
  ));
}

function StarRating({
  bookId, currentAvg, count,
}: { bookId: number; currentAvg: number; count: number }) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const rateBook = useRateBook();
  const { toast } = useToast();

  const displayRating = hovered || selected || currentAvg;

  const handleRate = (star: number) => {
    setSelected(star);
    rateBook.mutate({ bookId, rating: star }, {
      onSuccess: () => toast({ title: "Thanks for your rating! ⭐" }),
      onError: () => toast({ title: "Failed to submit rating", variant: "destructive" }),
    });
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(displayRating);
          return (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => handleRate(star)}
              disabled={rateBook.isPending}
              className="transition-transform hover:scale-110 active:scale-95"
            >
              <Star
                className={`w-7 h-7 transition-colors ${
                  filled
                    ? "fill-amber-400 text-amber-400"
                    : "fill-none text-foreground/20 hover:text-amber-300"
                }`}
              />
            </button>
          );
        })}
      </div>
      {count > 0 && (
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{currentAvg.toFixed(1)}</span>
          {" "}/ 5 · {count} {count === 1 ? "rating" : "ratings"}
        </p>
      )}
      {count === 0 && (
        <p className="text-sm text-muted-foreground">Be the first to rate this book</p>
      )}
    </div>
  );
}

function CommentsSection({ bookId }: { bookId: number }) {
  const { data: comments, isLoading } = useBookComments(bookId);
  const addComment = useAddBookComment();
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [guestName, setGuestName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    addComment.mutate(
      { bookId, content, authorName: user ? undefined : guestName || "Anonymous" },
      {
        onSuccess: () => {
          setContent("");
          setGuestName("");
          toast({ title: "Comment posted!" });
        },
        onError: () => toast({ title: "Failed to post comment", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="mt-16">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-foreground/60" />
        <h3 className="text-lg font-bold">
          Reader Comments
          {comments && comments.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">({comments.length})</span>
          )}
        </h3>
      </div>

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          {!user && (
            <Input
              placeholder="Your name (optional)"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="rounded-xl border-border text-sm"
              maxLength={50}
            />
          )}
          <Textarea
            placeholder="Share your thoughts about this book..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="rounded-xl border-border resize-none text-sm min-h-[90px]"
            maxLength={1000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{content.length}/1000</span>
            <Button
              type="submit"
              size="sm"
              disabled={!content.trim() || addComment.isPending}
              className="rounded-xl font-semibold"
            >
              {addComment.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Post Comment
            </Button>
          </div>
        </div>
      </form>

      {/* Comments list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : !comments || comments.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-2xl">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No comments yet. Be the first to leave feedback!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-foreground/8 flex items-center justify-center text-xs font-bold text-foreground/60">
                  {c.authorName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{c.authorName}</p>
                  {c.createdAt && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(c.createdAt), "MMM d, yyyy · h:mm a")}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{c.content}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReadBook() {
  const [, params] = useRoute("/read/:id");
  const bookId = Number(params?.id);

  const { data: book, isLoading: bookLoading } = usePublishedBook(bookId);
  const { data: chapters, isLoading: chaptersLoading } = usePublishedBookChapters(bookId);
  const { data: ratingStats } = useBookRatingStats(bookId);
  const incrementView = useIncrementBookView();
  const { resolvedTheme, setTheme } = useTheme();

  const [activeChapterId, setActiveChapterId] = useState<number | null>(null);
  const [showToc, setShowToc] = useState(true);
  const [viewCounted, setViewCounted] = useState(false);


  useEffect(() => {
    if (book && !viewCounted) {
      incrementView.mutate(bookId);
      setViewCounted(true);
    }
  }, [book, bookId, viewCounted]);

  useEffect(() => {
    if (chapters && chapters.length > 0 && activeChapterId === null) {
      const sorted = [...chapters].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setActiveChapterId(sorted[0].id);
    }
  }, [chapters]);

  const sortedChapters = chapters ? [...chapters].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];
  const activeChapter = sortedChapters.find((c) => c.id === activeChapterId);
  const activeIndex = sortedChapters.findIndex((c) => c.id === activeChapterId);
  const prevChapter = activeIndex > 0 ? sortedChapters[activeIndex - 1] : null;
  const nextChapter = activeIndex >= 0 && activeIndex < sortedChapters.length - 1 ? sortedChapters[activeIndex + 1] : null;
  const isLastChapter = activeIndex === sortedChapters.length - 1;

  const authorName = book?.authorName || book?.authorDisplayName || "Anonymous";

  const D = {
    bg: "#0a0a0a",
    bg2: "#141414",
    bg3: "#1c1c1e",
    border: "rgba(255,255,255,0.08)",
    text: "#f5f5f7",
    muted: "rgba(255,255,255,0.45)",
  };

  if (bookLoading || chaptersLoading) {
    return (
      <div style={{ minHeight: "100vh", background: D.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: D.muted }} />
      </div>
    );
  }

  if (!book) {
    return (
      <div style={{ minHeight: "100vh", background: D.bg, color: D.text, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <BookOpen className="w-12 h-12" style={{ color: D.muted }} />
        <p style={{ fontSize: 20, fontWeight: 600 }}>Book not found</p>
        <Link href="/library">
          <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: `1px solid ${D.border}`, background: "transparent", color: D.muted, cursor: "pointer", fontSize: 14 }}>
            <ArrowLeft className="w-4 h-4" /> Back to Library
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: D.bg, color: D.text }}>
      {/* Top Bar */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, borderBottom: `1px solid ${D.border}`, background: "rgba(10,10,10,0.85)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/library">
            <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8, border: "none", background: "transparent", color: D.muted, cursor: "pointer", fontSize: 13 }}>
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Library</span>
            </button>
          </Link>
          <div style={{ width: 1, height: 20, background: D.border }} />
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 14, fontWeight: 500, color: D.text }} className="truncate">{book.title}</p>
          </div>
          {ratingStats && ratingStats.count > 0 && (
            <div className="hidden sm:flex items-center gap-1" style={{ fontSize: 12, color: D.muted }}>
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span style={{ fontWeight: 600, color: D.text }}>{ratingStats.avg.toFixed(1)}</span>
              <span>({ratingStats.count})</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8, border: "none", background: "transparent", color: D.muted, cursor: "pointer", fontSize: 13 }}
              onClick={() => setShowToc(!showToc)}
            >
              <ListOrdered className="w-4 h-4" />
              <span className="hidden sm:inline" style={{ fontSize: 12 }}>Contents</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 flex gap-8">
        {/* Sidebar: Table of Contents */}
        <AnimatePresence>
          {showToc && (
            <motion.aside
              initial={{ opacity: 0, x: -20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 260 }}
              exit={{ opacity: 0, x: -20, width: 0 }}
              transition={{ duration: 0.25 }}
              className="hidden md:flex flex-col flex-shrink-0 overflow-hidden"
              style={{ width: 260 }}
            >
              <div className="sticky top-20 flex flex-col gap-4">
                {/* Book Info */}
                <div style={{ borderRadius: 12, border: `1px solid ${D.border}`, background: D.bg2, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                  {book.coverImage ? (
                    <img src={book.coverImage} alt={book.title} className="w-full aspect-[3/4] object-cover rounded-lg shadow" />
                  ) : (
                    <div className="w-full aspect-[3/4] rounded-lg flex items-center justify-center" style={{ backgroundColor: book.spineColor || "#7c3aed" }}>
                      <BookOpen className="w-8 h-8 text-white/70" />
                    </div>
                  )}
                  <div>
                    <h2 style={{ fontWeight: 600, fontSize: 13, color: D.text, lineHeight: 1.4 }}>{book.title}</h2>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, color: D.muted, fontSize: 12 }}>
                      <User className="w-3 h-3" />
                      <span>{authorName}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: D.muted, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Eye className="w-3 h-3" />
                      {((book.viewCount || 0) + 1).toLocaleString()} views
                    </div>
                    {ratingStats && ratingStats.count > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {ratingStats.avg.toFixed(1)} ({ratingStats.count})
                      </div>
                    )}
                    {book.publishedAt && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Calendar className="w-3 h-3" />
                        {format(new Date(book.publishedAt), "MMM yyyy")}
                      </div>
                    )}
                  </div>
                  {book.summary && (
                    <p style={{ fontSize: 11, color: D.muted, lineHeight: 1.6 }} className="line-clamp-4">{book.summary}</p>
                  )}
                </div>

                {/* Chapter List */}
                {sortedChapters.length > 0 && (
                  <div style={{ borderRadius: 12, border: `1px solid ${D.border}`, background: D.bg2, overflow: "hidden" }}>
                    <div style={{ padding: "8px 12px", fontSize: 10, fontWeight: 700, color: D.muted, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: `1px solid ${D.border}` }}>
                      Chapters
                    </div>
                    <nav style={{ display: "flex", flexDirection: "column", maxHeight: 288, overflowY: "auto" }}>
                      {sortedChapters.map((ch, i) => (
                        <button
                          key={ch.id}
                          onClick={() => { setActiveChapterId(ch.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                          style={{
                            textAlign: "left", padding: "10px 12px", fontSize: 13,
                            display: "flex", alignItems: "center", gap: 8,
                            borderBottom: `1px solid ${D.border}`, border: "none",
                            background: activeChapterId === ch.id ? "rgba(255,255,255,0.06)" : "transparent",
                            color: activeChapterId === ch.id ? D.text : D.muted,
                            fontWeight: activeChapterId === ch.id ? 500 : 400,
                            cursor: "pointer", transition: "background 0.12s",
                          }}
                        >
                          <span style={{ fontSize: 11, opacity: 0.4, width: 20, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                          <span className="truncate">{ch.title}</span>
                        </button>
                      ))}
                    </nav>
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Reading Area */}
        <main className="flex-1 min-w-0">
          {!sortedChapters.length ? (
            <div style={{ textAlign: "center", padding: "96px 0", color: D.muted }}>
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>This book has no chapters yet.</p>
            </div>
          ) : activeChapter ? (
            <>
              <AnimatePresence mode="wait">
                <motion.article
                  key={activeChapter.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-2xl mx-auto"
                >
                  {/* Chapter heading */}
                  <div className="mb-8">
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: D.muted, marginBottom: 8 }}>
                      Chapter {activeIndex + 1}
                    </p>
                    <h1 style={{ fontSize: "clamp(22px,3vw,30px)", fontWeight: 700, lineHeight: 1.25, color: D.text }}>{activeChapter.title}</h1>
                    <div style={{ height: 1, background: D.border, marginTop: 24 }} />
                  </div>

                  {/* Content */}
                  <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 17, lineHeight: 2, color: "rgba(245,245,247,0.85)", letterSpacing: "0.01em" }}>
                    {renderContent(activeChapter.content)}
                  </div>

                  {/* Chapter navigation */}
                  <div style={{ marginTop: 64, paddingTop: 32, borderTop: `1px solid ${D.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                    {prevChapter ? (
                      <button
                        onClick={() => { setActiveChapterId(prevChapter.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: D.muted, background: "none", border: "none", cursor: "pointer" }}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6 }}>Previous</div>
                          <div style={{ fontWeight: 500, maxWidth: 160 }} className="truncate">{prevChapter.title}</div>
                        </div>
                      </button>
                    ) : <div />}
                    {nextChapter ? (
                      <button
                        onClick={() => { setActiveChapterId(nextChapter.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: D.muted, background: "none", border: "none", cursor: "pointer", textAlign: "right" }}
                      >
                        <div>
                          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6 }}>Next</div>
                          <div style={{ fontWeight: 500, maxWidth: 160 }} className="truncate">{nextChapter.title}</div>
                        </div>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <div style={{ fontSize: 14, color: D.muted, textAlign: "right" }}>
                        <span style={{ fontWeight: 500 }}>End of book</span>
                        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>Thank you for reading</div>
                      </div>
                    )}
                  </div>

                  {/* ── Rating & Comments ── */}
                  {isLastChapter && (
                    <div style={{ marginTop: 64, maxWidth: 672, margin: "64px auto 0" }}>
                      <div style={{ height: 1, background: D.border, marginBottom: 48 }} />
                      <div style={{ background: D.bg2, border: `1px solid ${D.border}`, borderRadius: 16, padding: 32, textAlign: "center", marginBottom: 32 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: D.text, marginBottom: 4 }}>Enjoyed this book?</h3>
                        <p style={{ fontSize: 14, color: D.muted, marginBottom: 20 }}>Rate it to help other readers discover it</p>
                        <StarRating bookId={bookId} currentAvg={ratingStats?.avg ?? 0} count={ratingStats?.count ?? 0} />
                      </div>
                      <CommentsSection bookId={bookId} />
                    </div>
                  )}
                </motion.article>
              </AnimatePresence>

              {!isLastChapter && (
                <div style={{ maxWidth: 672, margin: "48px auto 0", paddingBottom: 32 }}>
                  <div style={{ height: 1, background: D.border, marginBottom: 32 }} />
                  <CommentsSection bookId={bookId} />
                </div>
              )}
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
