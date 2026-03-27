import { useState, useEffect, useCallback } from "react";
import { useRoute, Link } from "wouter";
import {
  usePublishedBook, usePublishedBookChapters, useIncrementBookView,
  useBookRatingStats, useRateBook, useBookComments, useAddBookComment,
} from "@/hooks/use-public-library";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  BookOpen, ChevronLeft, ChevronRight, ArrowLeft, Eye,
  Loader2, Star, MessageSquare, Send, List, X,
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
    if (Array.isArray(parsed)) return parsed.map(extractText).join("").trim();
    if (typeof parsed === "string") return parsed;
  } catch { }
  return raw.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s{2,}/g, " ").trim();
}

/* ─── Star Rating ────────────────────────────────────────── */

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
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
          >
            <Star style={{
              width: 28, height: 28, transition: "all 0.15s",
              fill: s <= Math.round(display) ? "#555" : "none",
              color: s <= Math.round(display) ? "#555" : "#bbb",
            }} />
          </button>
        ))}
      </div>
      {count > 0 ? (
        <p style={{ fontSize: 13, color: "#888" }}>
          <strong style={{ color: "#333" }}>{currentAvg.toFixed(1)}</strong> / 5 · {count} {count === 1 ? "rating" : "ratings"}
        </p>
      ) : (
        <p style={{ fontSize: 13, color: "#888" }}>Be the first to rate</p>
      )}
    </div>
  );
}

/* ─── Comments ───────────────────────────────────────────── */

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
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <MessageSquare style={{ width: 16, height: 16, color: "#888" }} />
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#222", fontFamily: "Georgia, serif" }}>
          Reader Comments {comments && comments.length > 0 && (
            <span style={{ fontWeight: 400, color: "#888" }}>({comments.length})</span>
          )}
        </h3>
      </div>

      <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <div style={{ background: "#f9f7f4", border: "1px solid #e4ddd4", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {!user && (
            <Input
              placeholder="Your name (optional)"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              style={{ borderColor: "#ddd5c8", background: "#fff", fontFamily: "Georgia, serif", fontSize: 14 }}
              maxLength={50}
            />
          )}
          <Textarea
            placeholder="Share your thoughts about this book..."
            value={content}
            onChange={e => setContent(e.target.value)}
            style={{ borderColor: "#ddd5c8", background: "#fff", fontFamily: "Georgia, serif", fontSize: 14, minHeight: 88, resize: "none" }}
            maxLength={1000}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#aaa" }}>{content.length}/1000</span>
            <button
              type="submit"
              disabled={!content.trim() || addComment.isPending}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: "#1c1410", color: "#fff", border: "none", cursor: "pointer",
                opacity: !content.trim() ? 0.5 : 1,
              }}
            >
              {addComment.isPending
                ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                : <Send style={{ width: 14, height: 14 }} />
              }
              Post
            </button>
          </div>
        </div>
      </form>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite", color: "#aaa", margin: "0 auto" }} />
        </div>
      ) : !comments || comments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#aaa", border: "1px dashed #ddd", borderRadius: 12 }}>
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
              style={{ background: "#f9f7f4", border: "1px solid #e4ddd4", borderRadius: 12, padding: 16 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e4ddd4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#555" }}>
                  {c.authorName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#222" }}>{c.authorName}</p>
                  {c.createdAt && <p style={{ fontSize: 11, color: "#aaa" }}>{format(new Date(c.createdAt), "MMM d, yyyy")}</p>}
                </div>
              </div>
              <p style={{ fontSize: 14, color: "#333", lineHeight: 1.7, fontFamily: "Georgia, serif", whiteSpace: "pre-wrap" }}>{c.content}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Single Book Page ───────────────────────────────────── */

function BookPage({
  chapter, chapterIndex, pageNum, isRight, isBlank,
}: {
  chapter?: any; chapterIndex?: number; pageNum: number; isRight: boolean; isBlank?: boolean;
}) {
  const text = chapter ? parseContent(chapter?.content) : "";
  const paras = text ? text.split(/\n{2,}/).map((p: string) => p.trim()).filter(Boolean) : [];

  return (
    <div style={{
      flex: "1 1 0",
      minWidth: 0,
      background: isRight
        ? "linear-gradient(to right, #faf7f2 0%, #fdf9f4 100%)"
        : "linear-gradient(to left, #faf7f2 0%, #fdf9f4 100%)",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Inner spine shadow */}
      {!isRight && (
        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 24,
          background: "linear-gradient(to left, rgba(0,0,0,0.07) 0%, transparent 100%)",
          pointerEvents: "none", zIndex: 1,
        }} />
      )}
      {isRight && (
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 24,
          background: "linear-gradient(to right, rgba(0,0,0,0.07) 0%, transparent 100%)",
          pointerEvents: "none", zIndex: 1,
        }} />
      )}

      {/* Page content area */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "48px 52px 36px",
      }}>
        {isBlank ? (
          /* Blank verso page — subtle decoration only */
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ color: "#ccc", fontStyle: "italic", fontFamily: "Georgia, serif", fontSize: 14, letterSpacing: "0.12em" }}>
              — fin —
            </p>
          </div>
        ) : (
          <>
            {/* Chapter header */}
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <p style={{
                fontSize: 9, fontWeight: 600, letterSpacing: "0.3em",
                textTransform: "uppercase", color: "#b0a898",
                fontFamily: "Georgia, serif", marginBottom: 12,
              }}>
                Chapter {(chapterIndex ?? 0) + 1}
              </p>
              {chapter?.title && (
                <h2 style={{
                  fontSize: "clamp(15px, 1.8vw, 20px)", fontWeight: 700,
                  color: "#1c1410", fontFamily: "'Georgia', 'Palatino Linotype', serif",
                  lineHeight: 1.25, letterSpacing: "-0.01em", margin: "0 0 16px",
                }}>
                  {chapter.title}
                </h2>
              )}
              <div style={{ width: 32, height: 1, background: "#c8bfb3", margin: "0 auto" }} />
            </div>

            {/* Paragraphs */}
            <div style={{ flex: 1 }}>
              {paras.length > 0 ? paras.map((p: string, i: number) => (
                <p
                  key={i}
                  style={{
                    marginBottom: "1.4em",
                    textIndent: i === 0 ? 0 : "2em",
                    lineHeight: 1.85,
                    fontSize: "clamp(13px, 1.4vw, 15px)",
                    color: "#1c1410",
                    fontFamily: "'Georgia', 'Palatino Linotype', 'Book Antiqua', serif",
                    letterSpacing: "0.01em",
                    textAlign: "justify",
                    hyphens: "auto" as any,
                  }}
                >
                  {p}
                </p>
              )) : (
                <p style={{ color: "#bbb", fontStyle: "italic", fontFamily: "Georgia, serif", textAlign: "center", paddingTop: 40, fontSize: 14 }}>
                  This chapter has no content yet.
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Page number footer */}
      <div style={{
        padding: "10px 52px 20px",
        borderTop: "1px solid rgba(180,170,155,0.3)",
        display: "flex",
        justifyContent: isRight ? "flex-end" : "flex-start",
      }}>
        <span style={{ fontSize: 10, color: "#c0b8ae", fontFamily: "Georgia, serif", letterSpacing: "0.1em" }}>
          {pageNum}
        </span>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */

export default function ReadBook() {
  const [, params] = useRoute("/read/:id");
  const bookId = Number(params?.id);

  const { data: book, isLoading: bookLoading } = usePublishedBook(bookId);
  const { data: chapters, isLoading: chaptersLoading } = usePublishedBookChapters(bookId);
  const { data: ratingStats } = useBookRatingStats(bookId);
  const incrementView = useIncrementBookView();

  const [spreadIndex, setSpreadIndex] = useState(0);
  const [showToc, setShowToc] = useState(false);
  const [viewCounted, setViewCounted] = useState(false);
  const [dir, setDir] = useState<"next" | "prev">("next");

  useEffect(() => {
    if (book && !viewCounted) { incrementView.mutate(bookId); setViewCounted(true); }
  }, [book, bookId, viewCounted]);

  const sortedChapters = chapters
    ? [...chapters].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];
  const totalSpreads = Math.max(1, Math.ceil(sortedChapters.length / 2));
  const leftChapter = sortedChapters[spreadIndex * 2] ?? null;
  const rightChapter = sortedChapters[spreadIndex * 2 + 1] ?? null;
  const isLastSpread = spreadIndex === totalSpreads - 1;
  const authorName = book?.authorName || (book as any)?.authorDisplayName || "Anonymous";

  const goSpread = useCallback((idx: number, direction: "next" | "prev") => {
    setDir(direction);
    setSpreadIndex(idx);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setShowToc(false);
  }, []);

  /* Keyboard navigation */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && spreadIndex < totalSpreads - 1) goSpread(spreadIndex + 1, "next");
      if (e.key === "ArrowLeft" && spreadIndex > 0) goSpread(spreadIndex - 1, "prev");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [spreadIndex, totalSpreads, goSpread]);

  if (bookLoading || chaptersLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#181614", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 style={{ width: 32, height: 32, color: "#888", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!book) {
    return (
      <div style={{ minHeight: "100vh", background: "#181614", color: "#888", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <BookOpen style={{ width: 48, height: 48, opacity: 0.4 }} />
        <p style={{ fontSize: 20, fontWeight: 600, fontFamily: "Georgia, serif" }}>Book not found</p>
        <Link href="/library">
          <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#888", cursor: "pointer", fontSize: 14 }}>
            <ArrowLeft style={{ width: 16, height: 16 }} /> Back to Library
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#181614" }}>

      {/* ── Top bar ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(24,22,20,0.97)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{
          maxWidth: 1400, margin: "0 auto",
          padding: "0 20px", height: 52,
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <Link href="/library">
            <button
              style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "#777", cursor: "pointer", fontSize: 13, padding: "4px 8px", borderRadius: 6 }}
              onMouseEnter={e => (e.currentTarget.style.color = "#ccc")}
              onMouseLeave={e => (e.currentTarget.style.color = "#777")}
            >
              <ArrowLeft style={{ width: 15, height: 15 }} />
              <span>Library</span>
            </button>
          </Link>

          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#ddd", fontFamily: "Georgia, serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {book.title}
            </p>
            <p style={{ fontSize: 11, color: "#555", marginTop: 1 }}>by {authorName}</p>
          </div>

          {ratingStats && ratingStats.count > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#666" }}>
              <Star style={{ width: 11, height: 11, fill: "#888", color: "#888" }} />
              <span style={{ fontWeight: 700, color: "#aaa" }}>{ratingStats.avg.toFixed(1)}</span>
            </div>
          )}

          {totalSpreads > 0 && (
            <span style={{ fontSize: 11, color: "#444", fontFamily: "Georgia, serif", letterSpacing: "0.06em", flexShrink: 0 }}>
              {spreadIndex + 1} / {totalSpreads}
            </span>
          )}

          <button
            onClick={() => setShowToc(!showToc)}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 12, padding: "5px 10px", borderRadius: 6, flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = "#bbb")}
            onMouseLeave={e => (e.currentTarget.style.color = "#666")}
          >
            {showToc ? <X style={{ width: 15, height: 15 }} /> : <List style={{ width: 15, height: 15 }} />}
            <span>Contents</span>
          </button>
        </div>
      </header>

      {/* ── TOC drawer ── */}
      <AnimatePresence>
        {showToc && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowToc(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 55, top: 52 }}
            />
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              style={{
                position: "fixed", left: 0, top: 52, bottom: 0, zIndex: 60,
                width: 280, background: "#1a1815",
                borderRight: "1px solid rgba(255,255,255,0.07)",
                overflowY: "auto", padding: "20px 16px",
                display: "flex", flexDirection: "column", gap: 20,
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{
                  width: 52, height: 70, borderRadius: 4, flexShrink: 0, overflow: "hidden",
                  background: book.spineColor || "#2a2522",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "3px 4px 14px rgba(0,0,0,0.5)",
                }}>
                  {book.coverImage
                    ? <img src={book.coverImage} alt={book.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <BookOpen style={{ width: 20, height: 20, color: "rgba(255,255,255,0.4)" }} />
                  }
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#e8e0d4", fontFamily: "Georgia, serif", lineHeight: 1.35 }}>{book.title}</p>
                  <p style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{authorName}</p>
                  <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 11, color: "#444" }}>
                    <span><Eye style={{ width: 10, height: 10, display: "inline", marginRight: 3 }} />{book.viewCount || 0} views</span>
                    {book.publishedAt && <span>{format(new Date(book.publishedAt), "MMM yyyy")}</span>}
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />

              <div>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: "#444", textTransform: "uppercase", marginBottom: 10, fontFamily: "Georgia, serif" }}>Table of Contents</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {sortedChapters.map((ch, i) => {
                    const chSpread = Math.floor(i / 2);
                    const isActive = chSpread === spreadIndex;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => goSpread(chSpread, chSpread > spreadIndex ? "next" : "prev")}
                        style={{
                          textAlign: "left", padding: "9px 12px", borderRadius: 8, fontSize: 13,
                          display: "flex", alignItems: "center", gap: 10, border: "none",
                          background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                          color: isActive ? "#e0d8cc" : "#555",
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ fontSize: 10, opacity: 0.35, width: 18, textAlign: "right", flexShrink: 0, fontFamily: "Georgia, serif" }}>{i + 1}</span>
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "Georgia, serif" }}>{ch.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Reading area ── */}
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "32px 16px 80px" }}>

        {!sortedChapters.length ? (
          <div style={{ textAlign: "center", padding: "100px 0", color: "#555" }}>
            <BookOpen style={{ width: 48, height: 48, margin: "0 auto 16px", opacity: 0.3 }} />
            <p style={{ fontFamily: "Georgia, serif", fontSize: 16 }}>This book has no chapters yet.</p>
          </div>
        ) : leftChapter ? (
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={spreadIndex}
              custom={dir}
              initial={{ opacity: 0, x: dir === "next" ? 48 : -48 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir === "next" ? -48 : 48 }}
              transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* ── Two-page book spread ── */}
              <div style={{
                display: "flex",
                width: "100%",
                minHeight: 620,
                borderRadius: 3,
                overflow: "hidden",
                boxShadow: [
                  "0 2px 4px rgba(0,0,0,0.5)",
                  "0 8px 24px rgba(0,0,0,0.5)",
                  "0 32px 80px rgba(0,0,0,0.45)",
                ].join(", "),
              }}>
                {/* Left page */}
                <BookPage
                  chapter={leftChapter}
                  chapterIndex={spreadIndex * 2}
                  pageNum={spreadIndex * 2 + 1}
                  isRight={false}
                />

                {/* Book spine */}
                <div style={{
                  width: 3, flexShrink: 0,
                  background: "linear-gradient(180deg, #c8bfb3 0%, #a89e93 30%, #c0b8ae 70%, #c8bfb3 100%)",
                  boxShadow: "inset -1px 0 2px rgba(0,0,0,0.1), inset 1px 0 2px rgba(0,0,0,0.1)",
                }} />

                {/* Right page */}
                {rightChapter ? (
                  <BookPage
                    chapter={rightChapter}
                    chapterIndex={spreadIndex * 2 + 1}
                    pageNum={spreadIndex * 2 + 2}
                    isRight={true}
                  />
                ) : (
                  <BookPage
                    pageNum={spreadIndex * 2 + 2}
                    isRight={true}
                    isBlank={true}
                  />
                )}
              </div>

              {/* ── Navigation ── */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginTop: 28, padding: "0 4px",
              }}>
                {spreadIndex > 0 ? (
                  <button
                    onClick={() => goSpread(spreadIndex - 1, "prev")}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 10, padding: "10px 20px", cursor: "pointer", color: "#777",
                      fontSize: 13, fontFamily: "Georgia, serif", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "#ccc"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLButtonElement).style.color = "#777"; }}
                  >
                    <ChevronLeft style={{ width: 15, height: 15 }} />
                    Previous
                  </button>
                ) : <div />}

                <div style={{ display: "flex", gap: 6 }}>
                  {Array.from({ length: totalSpreads }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goSpread(i, i > spreadIndex ? "next" : "prev")}
                      style={{
                        width: i === spreadIndex ? 20 : 6,
                        height: 6, borderRadius: 3,
                        background: i === spreadIndex ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.12)",
                        border: "none", cursor: "pointer", padding: 0,
                        transition: "all 0.2s",
                      }}
                    />
                  ))}
                </div>

                {spreadIndex < totalSpreads - 1 ? (
                  <button
                    onClick={() => goSpread(spreadIndex + 1, "next")}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 10, padding: "10px 20px", cursor: "pointer", color: "#777",
                      fontSize: 13, fontFamily: "Georgia, serif", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "#ccc"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLButtonElement).style.color = "#777"; }}
                  >
                    Next
                    <ChevronRight style={{ width: 15, height: 15 }} />
                  </button>
                ) : (
                  <div style={{ fontSize: 12, color: "#444", fontFamily: "Georgia, serif", letterSpacing: "0.08em" }}>
                    End of Book
                  </div>
                )}
              </div>

              {/* ── Rating & Comments ── */}
              {isLastSpread && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.5 }}
                  style={{ marginTop: 56, maxWidth: 700, margin: "56px auto 0" }}
                >
                  <div style={{
                    background: "#1a1815", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 16, padding: "36px 40px", textAlign: "center", marginBottom: 32,
                  }}>
                    <p style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#444", marginBottom: 10, fontFamily: "Georgia, serif" }}>
                      You've reached the end
                    </p>
                    <h3 style={{ fontSize: 22, fontWeight: 700, color: "#e0d8cc", fontFamily: "Georgia, serif", marginBottom: 8 }}>
                      Did you enjoy this story?
                    </h3>
                    <p style={{ fontSize: 13, color: "#555", marginBottom: 28, fontFamily: "Georgia, serif" }}>
                      Your rating helps other readers discover great books
                    </p>
                    <StarRating bookId={bookId} currentAvg={ratingStats?.avg ?? 0} count={ratingStats?.count ?? 0} />
                  </div>
                  <CommentsSection bookId={bookId} />
                </motion.div>
              )}

              {!isLastSpread && (
                <div style={{ maxWidth: 700, margin: "40px auto 0" }}>
                  <CommentsSection bookId={bookId} />
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
