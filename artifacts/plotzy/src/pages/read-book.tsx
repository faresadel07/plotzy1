import { useState, useEffect, useRef } from "react";
import { useRoute, Link } from "wouter";
import {
  usePublishedBook, usePublishedBookChapters, useIncrementBookView,
  useBookRatingStats, useRateBook, useBookComments, useAddBookComment,
} from "@/hooks/use-public-library";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  BookOpen, ChevronLeft, ChevronRight, ArrowLeft, User, Eye,
  Calendar, Loader2, Star, MessageSquare, Send, List, X,
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

/* ─── Content Parser ─────────────────────────────────────── */

function extractText(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node.type === "text") {
    if (typeof node.text === "string") return node.text;
    if (typeof node.content === "string") return node.content;
    if (Array.isArray(node.content)) return node.content.map(extractText).join("");
    return "";
  }
  if (node.type === "hardBreak") return "\n";
  if (node.type === "paragraph") {
    const inner = Array.isArray(node.content) ? node.content.map(extractText).join("") : "";
    return inner + "\n\n";
  }
  if (Array.isArray(node.content)) return node.content.map(extractText).join("");
  if (typeof node.content === "string") return node.content;
  return "";
}

function parseContent(raw: string | null | undefined): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.type === "doc") {
      return extractText(parsed).trim();
    }
    if (Array.isArray(parsed)) {
      return parsed.map(extractText).join("").trim();
    }
    if (typeof parsed === "string") return parsed;
  } catch { }
  return raw.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s{2,}/g, " ").trim();
}

function renderParagraphs(text: string) {
  const paras = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  return paras.map((p, i) => (
    <p
      key={i}
      className="book-paragraph"
      style={{
        marginBottom: "1.6em",
        textIndent: i === 0 ? 0 : "2em",
        lineHeight: 1.9,
        fontSize: "clamp(16px, 1.8vw, 18px)",
        color: "#2a1f14",
        fontFamily: "'Georgia', 'Palatino Linotype', 'Book Antiqua', serif",
        letterSpacing: "0.01em",
        textAlign: "justify",
        hyphens: "auto" as any,
      }}
    >
      {i === 0 ? (
        <>
          <span style={{
            float: "left", fontSize: "3.8em", lineHeight: 0.82,
            marginRight: "0.1em", marginTop: "0.1em",
            fontFamily: "'Georgia', serif", fontWeight: 700,
            color: "#1a1008",
          }}>
            {p[0]}
          </span>
          {p.slice(1)}
        </>
      ) : p}
    </p>
  ));
}

/* ─── Star Rating ───────────────────────────────────────── */

function StarRating({ bookId, currentAvg, count }: { bookId: number; currentAvg: number; count: number }) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const rateBook = useRateBook();
  const { toast } = useToast();
  const display = hovered || selected || currentAvg;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => {
              setSelected(s);
              rateBook.mutate({ bookId, rating: s }, {
                onSuccess: () => toast({ title: "Thanks for rating!" }),
                onError: () => toast({ title: "Failed", variant: "destructive" }),
              });
            }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}
          >
            <Star style={{
              width: 28, height: 28, transition: "all 0.15s",
              fill: s <= Math.round(display) ? "#c9922a" : "none",
              color: s <= Math.round(display) ? "#c9922a" : "#c4b49a",
            }} />
          </button>
        ))}
      </div>
      {count > 0 ? (
        <p style={{ fontSize: 13, color: "#8a7560" }}>
          <strong style={{ color: "#4a3520" }}>{currentAvg.toFixed(1)}</strong> / 5 · {count} {count === 1 ? "rating" : "ratings"}
        </p>
      ) : (
        <p style={{ fontSize: 13, color: "#8a7560" }}>Be the first to rate</p>
      )}
    </div>
  );
}

/* ─── Comments ──────────────────────────────────────────── */

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
        onSuccess: () => { setContent(""); setGuestName(""); toast({ title: "Comment posted!" }); },
        onError: () => toast({ title: "Failed to post comment", variant: "destructive" }),
      }
    );
  };

  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <MessageSquare style={{ width: 16, height: 16, color: "#8a7560" }} />
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#4a3520", fontFamily: "Georgia, serif" }}>
          Reader Comments {comments && comments.length > 0 && <span style={{ fontWeight: 400, color: "#8a7560" }}>({comments.length})</span>}
        </h3>
      </div>

      <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <div style={{ background: "#fffaf4", border: "1px solid #e8dcc8", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {!user && (
            <Input
              placeholder="Your name (optional)"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              style={{ borderColor: "#e0d0b8", background: "#fff8ee", fontFamily: "Georgia, serif", fontSize: 14 }}
              maxLength={50}
            />
          )}
          <Textarea
            placeholder="Share your thoughts about this book..."
            value={content}
            onChange={e => setContent(e.target.value)}
            style={{ borderColor: "#e0d0b8", background: "#fff8ee", fontFamily: "Georgia, serif", fontSize: 14, minHeight: 88, resize: "none" }}
            maxLength={1000}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#b0a090" }}>{content.length}/1000</span>
            <button
              type="submit"
              disabled={!content.trim() || addComment.isPending}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: "#2a1f14", color: "#fffaf4", border: "none", cursor: "pointer",
                opacity: !content.trim() ? 0.5 : 1,
              }}
            >
              {addComment.isPending ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 14, height: 14 }} />}
              Post
            </button>
          </div>
        </div>
      </form>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite", color: "#c4b49a", margin: "0 auto" }} />
        </div>
      ) : !comments || comments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#b0a090", border: "1px dashed #e0d0b8", borderRadius: 12 }}>
          <MessageSquare style={{ width: 28, height: 28, margin: "0 auto 8px", opacity: 0.4 }} />
          <p style={{ fontSize: 13 }}>No comments yet — be the first!</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {comments.map(c => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ background: "#fffaf4", border: "1px solid #e8dcc8", borderRadius: 12, padding: 16 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e8dcc8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#6a5040" }}>
                  {c.authorName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#3a2810" }}>{c.authorName}</p>
                  {c.createdAt && <p style={{ fontSize: 11, color: "#b0a090" }}>{format(new Date(c.createdAt), "MMM d, yyyy")}</p>}
                </div>
              </div>
              <p style={{ fontSize: 14, color: "#4a3520", lineHeight: 1.65, fontFamily: "Georgia, serif", whiteSpace: "pre-wrap" }}>{c.content}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────── */

export default function ReadBook() {
  const [, params] = useRoute("/read/:id");
  const bookId = Number(params?.id);

  const { data: book, isLoading: bookLoading } = usePublishedBook(bookId);
  const { data: chapters, isLoading: chaptersLoading } = usePublishedBookChapters(bookId);
  const { data: ratingStats } = useBookRatingStats(bookId);
  const incrementView = useIncrementBookView();

  const [activeChapterId, setActiveChapterId] = useState<number | null>(null);
  const [showToc, setShowToc] = useState(false);
  const [viewCounted, setViewCounted] = useState(false);
  const [pageDir, setPageDir] = useState<"next" | "prev">("next");
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (book && !viewCounted) { incrementView.mutate(bookId); setViewCounted(true); }
  }, [book, bookId, viewCounted]);

  useEffect(() => {
    if (chapters && chapters.length > 0 && activeChapterId === null) {
      const sorted = [...chapters].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setActiveChapterId(sorted[0].id);
    }
  }, [chapters]);

  const sortedChapters = chapters ? [...chapters].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];
  const activeChapter = sortedChapters.find(c => c.id === activeChapterId);
  const activeIndex = sortedChapters.findIndex(c => c.id === activeChapterId);
  const prevChapter = activeIndex > 0 ? sortedChapters[activeIndex - 1] : null;
  const nextChapter = activeIndex >= 0 && activeIndex < sortedChapters.length - 1 ? sortedChapters[activeIndex + 1] : null;
  const isLastChapter = activeIndex === sortedChapters.length - 1;
  const authorName = book?.authorName || (book as any)?.authorDisplayName || "Anonymous";

  function goToChapter(id: number, dir: "next" | "prev") {
    setPageDir(dir);
    setActiveChapterId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setShowToc(false);
  }

  if (bookLoading || chaptersLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0e0a06", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 style={{ width: 32, height: 32, color: "#c9922a", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!book) {
    return (
      <div style={{ minHeight: "100vh", background: "#0e0a06", color: "#c4b49a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <BookOpen style={{ width: 48, height: 48, opacity: 0.4 }} />
        <p style={{ fontSize: 20, fontWeight: 600, fontFamily: "Georgia, serif" }}>Book not found</p>
        <Link href="/library">
          <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#c4b49a", cursor: "pointer", fontSize: 14 }}>
            <ArrowLeft style={{ width: 16, height: 16 }} /> Back to Library
          </button>
        </Link>
      </div>
    );
  }

  const parsedText = activeChapter ? parseContent(activeChapter.content) : "";

  return (
    <div style={{ minHeight: "100vh", background: "#0e0a06" }}>

      {/* ── Top navigation bar ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(14,10,6,0.92)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(201,146,42,0.15)",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px", height: 52, display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/library">
            <button style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "#c4b49a", cursor: "pointer", fontSize: 13, padding: "4px 8px", borderRadius: 6 }}>
              <ArrowLeft style={{ width: 15, height: 15 }} />
              <span style={{ display: window.innerWidth < 480 ? "none" : "inline" }}>Library</span>
            </button>
          </Link>

          <div style={{ width: 1, height: 18, background: "rgba(201,146,42,0.2)" }} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#f5eada", fontFamily: "Georgia, serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {book.title}
            </p>
          </div>

          {ratingStats && ratingStats.count > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#c4b49a" }}>
              <Star style={{ width: 13, height: 13, fill: "#c9922a", color: "#c9922a" }} />
              <span style={{ fontWeight: 700, color: "#f5eada" }}>{ratingStats.avg.toFixed(1)}</span>
              <span>({ratingStats.count})</span>
            </div>
          )}

          <button
            onClick={() => setShowToc(!showToc)}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "#c4b49a", cursor: "pointer", fontSize: 12, padding: "4px 10px", borderRadius: 6 }}
          >
            {showToc ? <X style={{ width: 15, height: 15 }} /> : <List style={{ width: 15, height: 15 }} />}
            <span style={{ display: window.innerWidth < 480 ? "none" : "inline" }}>Contents</span>
          </button>
        </div>
      </header>

      {/* ── Table of Contents drawer ── */}
      <AnimatePresence>
        {showToc && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowToc(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 55, top: 52 }}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                position: "fixed", left: 0, top: 52, bottom: 0, zIndex: 60,
                width: 280, background: "#1a120a",
                borderRight: "1px solid rgba(201,146,42,0.2)",
                overflowY: "auto", padding: 20,
                display: "flex", flexDirection: "column", gap: 20,
              }}
            >
              {/* Book info */}
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{
                  width: 56, height: 72, borderRadius: 4, flexShrink: 0, overflow: "hidden",
                  background: book.spineColor || "#7c3aed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "2px 4px 12px rgba(0,0,0,0.4)",
                }}>
                  {book.coverImage
                    ? <img src={book.coverImage} alt={book.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <BookOpen style={{ width: 20, height: 20, color: "rgba(255,255,255,0.7)" }} />
                  }
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#f5eada", fontFamily: "Georgia, serif", lineHeight: 1.3 }}>{book.title}</p>
                  <p style={{ fontSize: 11, color: "#8a7560", marginTop: 4 }}>{authorName}</p>
                  <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 11, color: "#8a7560" }}>
                    <span><Eye style={{ width: 10, height: 10, display: "inline", marginRight: 3 }} />{book.viewCount || 0} views</span>
                    {book.publishedAt && <span>{format(new Date(book.publishedAt), "MMM yyyy")}</span>}
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: "rgba(201,146,42,0.15)" }} />

              {/* Chapter list */}
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#6a5040", textTransform: "uppercase", marginBottom: 10 }}>Chapters</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {sortedChapters.map((ch, i) => (
                    <button
                      key={ch.id}
                      onClick={() => goToChapter(ch.id, i > activeIndex ? "next" : "prev")}
                      style={{
                        textAlign: "left", padding: "9px 12px", borderRadius: 8, fontSize: 13,
                        display: "flex", alignItems: "center", gap: 10, border: "none",
                        background: activeChapterId === ch.id ? "rgba(201,146,42,0.15)" : "transparent",
                        color: activeChapterId === ch.id ? "#f5eada" : "#8a7560",
                        cursor: "pointer", transition: "background 0.12s",
                        fontFamily: activeChapterId === ch.id ? "Georgia, serif" : "inherit",
                      }}
                    >
                      <span style={{ fontSize: 10, opacity: 0.5, width: 18, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Book page ── */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 16px 80px" }}>

        {!sortedChapters.length ? (
          <div style={{ textAlign: "center", padding: "96px 0", color: "#8a7560" }}>
            <BookOpen style={{ width: 48, height: 48, margin: "0 auto 16px", opacity: 0.3 }} />
            <p style={{ fontFamily: "Georgia, serif", fontSize: 16 }}>This book has no chapters yet.</p>
          </div>
        ) : activeChapter ? (
          <AnimatePresence mode="wait" custom={pageDir}>
            <motion.div
              key={activeChapter.id}
              custom={pageDir}
              initial={{ opacity: 0, x: pageDir === "next" ? 60 : -60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: pageDir === "next" ? -60 : 60 }}
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              ref={pageRef}
            >
              {/* The "book page" */}
              <div style={{
                background: "linear-gradient(160deg, #fff8ee 0%, #fffcf5 60%, #fff8e8 100%)",
                borderRadius: "2px 16px 16px 2px",
                boxShadow: [
                  "-8px 0 24px rgba(0,0,0,0.5)",
                  "0 8px 40px rgba(0,0,0,0.4)",
                  "inset -1px 0 0 #e8d8b8",
                  "inset 0 0 60px rgba(201,146,42,0.04)",
                ].join(", "),
                padding: "clamp(32px, 6vw, 72px) clamp(28px, 8vw, 96px)",
                position: "relative",
                minHeight: 480,
              }}>
                {/* Spine shadow effect */}
                <div style={{
                  position: "absolute", left: 0, top: 0, bottom: 0, width: 24,
                  background: "linear-gradient(to right, rgba(0,0,0,0.08), transparent)",
                  borderRadius: "2px 0 0 2px", pointerEvents: "none",
                }} />

                {/* Chapter header */}
                <div style={{ marginBottom: 40, textAlign: "center" }}>
                  <p style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.2em",
                    textTransform: "uppercase", color: "#c9922a", marginBottom: 12,
                    fontFamily: "Georgia, serif",
                  }}>
                    Chapter {activeIndex + 1}
                  </p>
                  <h1 style={{
                    fontSize: "clamp(22px, 3.5vw, 32px)", fontWeight: 700,
                    color: "#1a1008", fontFamily: "Georgia, 'Palatino Linotype', serif",
                    lineHeight: 1.25, letterSpacing: "-0.01em",
                  }}>
                    {activeChapter.title}
                  </h1>

                  {/* Ornamental divider */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 24, marginBottom: 8 }}>
                    <div style={{ flex: 1, maxWidth: 80, height: 1, background: "linear-gradient(to left, #c9922a44, transparent)" }} />
                    <span style={{ fontSize: 14, color: "#c9922a", opacity: 0.7 }}>❧</span>
                    <div style={{ flex: 1, maxWidth: 80, height: 1, background: "linear-gradient(to right, #c9922a44, transparent)" }} />
                  </div>
                </div>

                {/* Chapter content */}
                <div style={{ maxWidth: 620, margin: "0 auto" }}>
                  {parsedText ? renderParagraphs(parsedText) : (
                    <p style={{ color: "#b0a090", fontStyle: "italic", fontFamily: "Georgia, serif", textAlign: "center", padding: "40px 0" }}>
                      This chapter has no content yet.
                    </p>
                  )}
                </div>

                {/* Page footer line */}
                <div style={{
                  marginTop: 56, paddingTop: 24,
                  borderTop: "1px solid #e0d0b8",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  {prevChapter ? (
                    <button
                      onClick={() => goToChapter(prevChapter.id, "prev")}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        background: "none", border: "none", cursor: "pointer",
                        color: "#8a7560", padding: "6px 10px", borderRadius: 8,
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#4a3520")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#8a7560")}
                    >
                      <ChevronLeft style={{ width: 16, height: 16 }} />
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.7 }}>Previous</div>
                        <div style={{ fontSize: 13, fontFamily: "Georgia, serif", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prevChapter.title}</div>
                      </div>
                    </button>
                  ) : <div />}

                  {/* Page number */}
                  <span style={{ fontSize: 12, color: "#c4b49a", fontFamily: "Georgia, serif", letterSpacing: "0.05em" }}>
                    {activeIndex + 1} / {sortedChapters.length}
                  </span>

                  {nextChapter ? (
                    <button
                      onClick={() => goToChapter(nextChapter.id, "next")}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        background: "none", border: "none", cursor: "pointer",
                        color: "#8a7560", padding: "6px 10px", borderRadius: 8,
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#4a3520")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#8a7560")}
                    >
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.7 }}>Next</div>
                        <div style={{ fontSize: 13, fontFamily: "Georgia, serif", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nextChapter.title}</div>
                      </div>
                      <ChevronRight style={{ width: 16, height: 16 }} />
                    </button>
                  ) : (
                    <div style={{ textAlign: "right", color: "#8a7560" }}>
                      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em" }}>Fin</div>
                      <div style={{ fontSize: 13, fontFamily: "Georgia, serif" }}>End of story</div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Rating & Comments (after last chapter) ── */}
              {isLastChapter && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  style={{ marginTop: 40, maxWidth: 660, margin: "40px auto 0" }}
                >
                  <div style={{
                    background: "#1a120a",
                    border: "1px solid rgba(201,146,42,0.2)",
                    borderRadius: 16, padding: 32, textAlign: "center", marginBottom: 28,
                  }}>
                    <p style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8a7560", marginBottom: 8 }}>You've reached the end</p>
                    <h3 style={{ fontSize: 20, fontWeight: 700, color: "#f5eada", fontFamily: "Georgia, serif", marginBottom: 6 }}>Did you enjoy this story?</h3>
                    <p style={{ fontSize: 13, color: "#8a7560", marginBottom: 24 }}>Your rating helps other readers discover great books</p>
                    <StarRating bookId={bookId} currentAvg={ratingStats?.avg ?? 0} count={ratingStats?.count ?? 0} />
                  </div>
                  <CommentsSection bookId={bookId} />
                </motion.div>
              )}

              {!isLastChapter && (
                <div style={{ maxWidth: 660, margin: "32px auto 0" }}>
                  <CommentsSection bookId={bookId} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .book-paragraph::after { content: ""; display: block; clear: both; }
      `}</style>
    </div>
  );
}
