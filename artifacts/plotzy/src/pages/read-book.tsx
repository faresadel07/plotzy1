import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import {
  usePublishedBook, usePublishedBookChapters, useIncrementBookView,
  useBookRatingStats, useRateBook, useBookComments, useAddBookComment,
} from "@/hooks/use-public-library";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  BookOpen, ChevronLeft, ChevronRight, ArrowLeft, Eye,
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
      style={{
        marginBottom: "1.45em",
        textIndent: i === 0 ? 0 : "2em",
        lineHeight: 1.85,
        fontSize: "clamp(14px, 1.5vw, 16px)",
        color: "#1c1410",
        fontFamily: "'Georgia', 'Palatino Linotype', 'Book Antiqua', serif",
        letterSpacing: "0.008em",
        textAlign: "justify",
        hyphens: "auto" as any,
      }}
    >
      {p}
    </p>
  ));
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
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}
          >
            <Star style={{
              width: 28, height: 28, transition: "all 0.15s",
              fill: s <= Math.round(display) ? "#555" : "none",
              color: s <= Math.round(display) ? "#555" : "#aaa",
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
    <div style={{ marginTop: 48 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <MessageSquare style={{ width: 16, height: 16, color: "#888" }} />
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#222", fontFamily: "Georgia, serif" }}>
          Reader Comments {comments && comments.length > 0 && <span style={{ fontWeight: 400, color: "#888" }}>({comments.length})</span>}
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
              {addComment.isPending ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 14, height: 14 }} />}
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
              <p style={{ fontSize: 14, color: "#333", lineHeight: 1.65, fontFamily: "Georgia, serif", whiteSpace: "pre-wrap" }}>{c.content}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Single Book Page ───────────────────────────────────── */

function BookPage({ chapter, chapterIndex, isRight }: { chapter: any; chapterIndex: number; isRight?: boolean }) {
  const text = parseContent(chapter?.content);
  return (
    <div style={{
      flex: 1,
      background: isRight
        ? "linear-gradient(160deg, #fffcf7 0%, #fff9f2 100%)"
        : "linear-gradient(200deg, #fff9f2 0%, #fffcf7 100%)",
      padding: "clamp(24px, 4vw, 52px) clamp(20px, 4vw, 56px)",
      position: "relative",
      minHeight: 560,
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Spine shadow — right page has it on the left, left page has it on the right */}
      {!isRight && (
        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 20,
          background: "linear-gradient(to left, rgba(0,0,0,0.06), transparent)",
          pointerEvents: "none",
        }} />
      )}
      {isRight && (
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 20,
          background: "linear-gradient(to right, rgba(0,0,0,0.06), transparent)",
          pointerEvents: "none",
        }} />
      )}

      {/* Chapter header */}
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <p style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "0.22em",
          textTransform: "uppercase", color: "#aaa", marginBottom: 10,
          fontFamily: "Georgia, serif",
        }}>
          {chapterIndex + 1}
        </p>
        <h2 style={{
          fontSize: "clamp(16px, 2vw, 22px)", fontWeight: 700,
          color: "#1c1410", fontFamily: "Georgia, 'Palatino Linotype', serif",
          lineHeight: 1.2, letterSpacing: "-0.01em", margin: 0,
        }}>
          {chapter.title}
        </h2>
        <div style={{ width: 36, height: 1, background: "#ccc", margin: "16px auto 0" }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        {text ? renderParagraphs(text) : (
          <p style={{ color: "#bbb", fontStyle: "italic", fontFamily: "Georgia, serif", textAlign: "center", padding: "40px 0", fontSize: 14 }}>
            This chapter has no content yet.
          </p>
        )}
      </div>

      {/* Page number */}
      <div style={{
        marginTop: 32, paddingTop: 16,
        borderTop: "1px solid #e4ddd4",
        textAlign: isRight ? "right" : "left",
      }}>
        <span style={{ fontSize: 11, color: "#bbb", fontFamily: "Georgia, serif", letterSpacing: "0.08em" }}>
          {chapterIndex + 1}
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

  const sortedChapters = chapters ? [...chapters].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];
  const totalSpreads = Math.ceil(sortedChapters.length / 2);
  const leftChapter = sortedChapters[spreadIndex * 2] ?? null;
  const rightChapter = sortedChapters[spreadIndex * 2 + 1] ?? null;
  const isLastSpread = spreadIndex === totalSpreads - 1;
  const authorName = book?.authorName || (book as any)?.authorDisplayName || "Anonymous";

  function goSpread(idx: number, direction: "next" | "prev") {
    setDir(direction);
    setSpreadIndex(idx);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setShowToc(false);
  }

  if (bookLoading || chaptersLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 style={{ width: 32, height: 32, color: "#888", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!book) {
    return (
      <div style={{ minHeight: "100vh", background: "#111", color: "#888", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
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
    <div style={{ minHeight: "100vh", background: "#111" }}>

      {/* ── Top bar ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(17,17,17,0.95)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px", height: 50, display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/library">
            <button style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13, padding: "4px 8px", borderRadius: 6, transition: "color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#ddd")}
              onMouseLeave={e => (e.currentTarget.style.color = "#888")}
            >
              <ArrowLeft style={{ width: 15, height: 15 }} />
              <span>Library</span>
            </button>
          </Link>

          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#eee", fontFamily: "Georgia, serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {book.title}
            </p>
          </div>

          {ratingStats && ratingStats.count > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#888" }}>
              <Star style={{ width: 12, height: 12, fill: "#888", color: "#888" }} />
              <span style={{ fontWeight: 700, color: "#ccc" }}>{ratingStats.avg.toFixed(1)}</span>
            </div>
          )}

          {/* Spread counter */}
          {totalSpreads > 0 && (
            <span style={{ fontSize: 11, color: "#555", fontFamily: "Georgia, serif", letterSpacing: "0.05em" }}>
              {spreadIndex * 2 + 1}–{Math.min(spreadIndex * 2 + 2, sortedChapters.length)} / {sortedChapters.length}
            </span>
          )}

          <button
            onClick={() => setShowToc(!showToc)}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 12, padding: "4px 10px", borderRadius: 6 }}
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
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 55, top: 50 }}
            />
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                position: "fixed", left: 0, top: 50, bottom: 0, zIndex: 60,
                width: 280, background: "#1a1a1a",
                borderRight: "1px solid rgba(255,255,255,0.08)",
                overflowY: "auto", padding: 20,
                display: "flex", flexDirection: "column", gap: 20,
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{
                  width: 52, height: 68, borderRadius: 4, flexShrink: 0, overflow: "hidden",
                  background: book.spineColor || "#333",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "2px 4px 12px rgba(0,0,0,0.4)",
                }}>
                  {book.coverImage
                    ? <img src={book.coverImage} alt={book.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <BookOpen style={{ width: 20, height: 20, color: "rgba(255,255,255,0.5)" }} />
                  }
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#eee", fontFamily: "Georgia, serif", lineHeight: 1.3 }}>{book.title}</p>
                  <p style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{authorName}</p>
                  <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 11, color: "#555" }}>
                    <span><Eye style={{ width: 10, height: 10, display: "inline", marginRight: 3 }} />{book.viewCount || 0}</span>
                    {book.publishedAt && <span>{format(new Date(book.publishedAt), "MMM yyyy")}</span>}
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#444", textTransform: "uppercase", marginBottom: 10 }}>Chapters</p>
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
                          background: isActive ? "rgba(255,255,255,0.07)" : "transparent",
                          color: isActive ? "#eee" : "#555",
                          cursor: "pointer", transition: "background 0.12s",
                        }}
                      >
                        <span style={{ fontSize: 10, opacity: 0.4, width: 18, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Book spread ── */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 16px 80px" }}>

        {!sortedChapters.length ? (
          <div style={{ textAlign: "center", padding: "96px 0", color: "#555" }}>
            <BookOpen style={{ width: 48, height: 48, margin: "0 auto 16px", opacity: 0.3 }} />
            <p style={{ fontFamily: "Georgia, serif", fontSize: 16 }}>This book has no chapters yet.</p>
          </div>
        ) : leftChapter ? (
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={spreadIndex}
              custom={dir}
              initial={{ opacity: 0, x: dir === "next" ? 40 : -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir === "next" ? -40 : 40 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* Two-page spread */}
              <div style={{
                display: "flex",
                borderRadius: 4,
                overflow: "hidden",
                boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)",
              }}>
                {/* Left page */}
                <BookPage chapter={leftChapter} chapterIndex={spreadIndex * 2} isRight={false} />

                {/* Center spine */}
                <div style={{
                  width: 2,
                  background: "linear-gradient(180deg, #d4ccc0 0%, #bbb4a8 50%, #d4ccc0 100%)",
                  flexShrink: 0,
                  boxShadow: "0 0 8px rgba(0,0,0,0.15)",
                }} />

                {/* Right page */}
                {rightChapter ? (
                  <BookPage chapter={rightChapter} chapterIndex={spreadIndex * 2 + 1} isRight={true} />
                ) : (
                  /* Blank right page when odd total chapters */
                  <div style={{
                    flex: 1,
                    background: "linear-gradient(160deg, #fffcf7 0%, #fff9f2 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <p style={{ color: "#ddd", fontStyle: "italic", fontFamily: "Georgia, serif", fontSize: 14 }}>
                      — fin —
                    </p>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginTop: 24, padding: "0 4px",
              }}>
                {/* Prev */}
                {spreadIndex > 0 ? (
                  <button
                    onClick={() => goSpread(spreadIndex - 1, "prev")}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10, padding: "10px 18px", cursor: "pointer", color: "#888",
                      fontSize: 13, transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.09)"; (e.currentTarget as HTMLButtonElement).style.color = "#ccc"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLButtonElement).style.color = "#888"; }}
                  >
                    <ChevronLeft style={{ width: 16, height: 16 }} />
                    <span style={{ fontFamily: "Georgia, serif" }}>
                      Ch. {(spreadIndex - 1) * 2 + 1}
                      {sortedChapters[(spreadIndex - 1) * 2 + 1] ? `–${(spreadIndex - 1) * 2 + 2}` : ""}
                    </span>
                  </button>
                ) : <div />}

                {/* Spread info */}
                <span style={{ fontSize: 12, color: "#444", fontFamily: "Georgia, serif", letterSpacing: "0.06em" }}>
                  {spreadIndex + 1} / {totalSpreads}
                </span>

                {/* Next */}
                {spreadIndex < totalSpreads - 1 ? (
                  <button
                    onClick={() => goSpread(spreadIndex + 1, "next")}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10, padding: "10px 18px", cursor: "pointer", color: "#888",
                      fontSize: 13, transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.09)"; (e.currentTarget as HTMLButtonElement).style.color = "#ccc"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLButtonElement).style.color = "#888"; }}
                  >
                    <span style={{ fontFamily: "Georgia, serif" }}>
                      Ch. {spreadIndex * 2 + 3}
                      {sortedChapters[spreadIndex * 2 + 3] ? `–${spreadIndex * 2 + 4}` : ""}
                    </span>
                    <ChevronRight style={{ width: 16, height: 16 }} />
                  </button>
                ) : (
                  <div style={{ fontSize: 12, color: "#444", fontFamily: "Georgia, serif", letterSpacing: "0.08em" }}>
                    End of book
                  </div>
                )}
              </div>

              {/* Rating & Comments after last spread */}
              {isLastSpread && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  style={{ marginTop: 48, maxWidth: 660, margin: "48px auto 0" }}
                >
                  <div style={{
                    background: "#1a1a1a",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 16, padding: 32, textAlign: "center", marginBottom: 28,
                  }}>
                    <p style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#555", marginBottom: 8 }}>You've reached the end</p>
                    <h3 style={{ fontSize: 20, fontWeight: 700, color: "#eee", fontFamily: "Georgia, serif", marginBottom: 6 }}>Did you enjoy this story?</h3>
                    <p style={{ fontSize: 13, color: "#666", marginBottom: 24 }}>Your rating helps other readers discover great books</p>
                    <StarRating bookId={bookId} currentAvg={ratingStats?.avg ?? 0} count={ratingStats?.count ?? 0} />
                  </div>
                  <CommentsSection bookId={bookId} />
                </motion.div>
              )}

              {!isLastSpread && (
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
      `}</style>
    </div>
  );
}
