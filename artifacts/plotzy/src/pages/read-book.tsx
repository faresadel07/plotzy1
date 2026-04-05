import { useState, useEffect, useCallback, useRef } from "react";
import { useRoute, Link } from "wouter";
import {
  usePublishedBook, usePublishedBookChapters, useIncrementBookView,
  useBookRatingStats, useRateBook, useBookComments, useAddBookComment,
} from "@/hooks/use-public-library";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  BookOpen, ChevronLeft, ChevronRight, ArrowLeft, Eye,
  Loader2, Star, MessageSquare, Send, List, X, BookMarked,
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

function htmlToText(html: string): string {
  return html
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isArabicText(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}

function parseContent(raw: string | null | undefined): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    /* v2 chapter format: { v:2, pages: "<p>...</p>", floatingImages: {...} } */
    if (parsed && typeof parsed === "object" && parsed.v === 2) {
      const pagesHtml =
        typeof parsed.pages === "string"
          ? parsed.pages
          : Array.isArray(parsed.pages)
          ? parsed.pages.join("\n\n")
          : "";
      return htmlToText(pagesHtml);
    }
    /* TipTap JSON doc format */
    if (parsed && typeof parsed === "object" && parsed.type === "doc") {
      return extractText(parsed).trim();
    }
    /* Old page-array format: [{ type:"text", content:"<p>...</p>" }] */
    if (Array.isArray(parsed)) {
      const combined = parsed.map((item: any) => {
        if (typeof item === "string") return item;
        if (item && typeof item.content === "string") return item.content;
        return extractText(item);
      }).join("\n\n");
      return htmlToText(combined);
    }
    if (typeof parsed === "string") return parsed;
  } catch { }
  /* Plain HTML fallback */
  return htmlToText(raw);
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
          <button key={s}
            onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)}
            onClick={() => {
              setSelected(s);
              rateBook.mutate({ bookId, rating: s }, {
                onSuccess: () => toast({ title: "Thanks for rating!" }),
                onError: () => toast({ title: "Failed", variant: "destructive" }),
              });
            }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
          >
            <Star style={{ width: 26, height: 26, transition: "all 0.15s", fill: s <= Math.round(display) ? "#555" : "none", color: s <= Math.round(display) ? "#555" : "#bbb" }} />
          </button>
        ))}
      </div>
      {count > 0
        ? <p style={{ fontSize: 13, color: "#888" }}><strong style={{ color: "#333" }}>{currentAvg.toFixed(1)}</strong> / 5 · {count} {count === 1 ? "rating" : "ratings"}</p>
        : <p style={{ fontSize: 13, color: "#888" }}>Be the first to rate</p>
      }
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
          Reader Comments {comments && comments.length > 0 && <span style={{ fontWeight: 400, color: "#888" }}>({comments.length})</span>}
        </h3>
      </div>
      <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <div style={{ background: "#f9f7f4", border: "1px solid #e4ddd4", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {!user && <Input placeholder="Your name (optional)" value={guestName} onChange={e => setGuestName(e.target.value)} style={{ borderColor: "#ddd5c8", background: "#fff", fontFamily: "Georgia, serif", fontSize: 14 }} maxLength={50} />}
          <Textarea placeholder="Share your thoughts…" value={content} onChange={e => setContent(e.target.value)} style={{ borderColor: "#ddd5c8", background: "#fff", fontFamily: "Georgia, serif", fontSize: 14, minHeight: 88, resize: "none" }} maxLength={1000} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#aaa" }}>{content.length}/1000</span>
            <button type="submit" disabled={!content.trim() || addComment.isPending}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#1c1410", color: "#fff", border: "none", cursor: "pointer", opacity: !content.trim() ? 0.5 : 1 }}>
              {addComment.isPending ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 14, height: 14 }} />}
              Post
            </button>
          </div>
        </div>
      </form>
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "32px 0" }}><Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite", color: "#aaa", margin: "0 auto" }} /></div>
      ) : !comments || comments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#aaa", border: "1px dashed #ddd", borderRadius: 12 }}>
          <MessageSquare style={{ width: 28, height: 28, margin: "0 auto 8px", opacity: 0.4 }} />
          <p style={{ fontSize: 13 }}>No comments yet — be the first!</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {comments.map(c => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: "#f9f7f4", border: "1px solid #e4ddd4", borderRadius: 12, padding: 16 }}>
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

/* ─── Two-column paginated book spread ───────────────────── */

const PAGE_PADDING_V = 48;
const PAGE_PADDING_H = 52;
const SPINE_W = 3;
const FOOTER_H = 40;

interface BookSpreadProps {
  chapters: any[];
  spreadIndex: number;
  totalSpreads: number;
  onTotalSpreads: (n: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

function BookSpread({ chapters, spreadIndex, totalSpreads, onTotalSpreads, onPrev, onNext }: BookSpreadProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);
  const [containerH, setContainerH] = useState(620);
  const [measured, setMeasured] = useState(false);

  /* Build full book text as React nodes with chapter breaks */
  const bookContent = chapters.map((ch, i) => {
    const text = parseContent(ch?.content);
    const paras = text ? text.split(/\n{2,}/).map((p: string) => p.trim()).filter(Boolean) : [];
    const isRTL = paras.some(p => isArabicText(p));
    return (
      <div key={ch.id} style={{ breakInside: "avoid-column" as any, direction: isRTL ? "rtl" : "ltr" }}>
        {/* Chapter header */}
        <div style={{ textAlign: "center", marginBottom: 28, marginTop: i === 0 ? 0 : 32, breakAfter: "avoid" as any }}>
          <p style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.3em", textTransform: "uppercase", color: "#b0a898", fontFamily: "Georgia, serif", marginBottom: 10 }}>
            Chapter {i + 1}
          </p>
          {ch?.title && (
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1c1410", fontFamily: "'Georgia', 'Palatino Linotype', serif", lineHeight: 1.25, margin: "0 0 14px", direction: isArabicText(ch.title) ? "rtl" : "ltr" }}>
              {ch.title}
            </h2>
          )}
          <div style={{ width: 28, height: 1, background: "#c8bfb3", margin: "0 auto" }} />
        </div>

        {/* Paragraphs */}
        {paras.length > 0 ? paras.map((p: string, pi: number) => {
          const pIsRTL = isArabicText(p);
          return (
            <p key={pi} style={{
              marginBottom: "1.35em",
              textIndent: pi === 0 ? 0 : "2em",
              lineHeight: 1.85,
              fontSize: 14,
              color: "#1c1410",
              fontFamily: pIsRTL
                ? "'Amiri', 'Scheherazade New', 'Traditional Arabic', 'Arial', serif"
                : "'Georgia', 'Palatino Linotype', 'Book Antiqua', serif",
              letterSpacing: pIsRTL ? "0" : "0.008em",
              textAlign: "justify",
              direction: pIsRTL ? "rtl" : "ltr",
              hyphens: "auto" as any,
            }}>
              {p}
            </p>
          );
        }) : (
          <p style={{ color: "#bbb", fontStyle: "italic", fontFamily: "Georgia, serif", textAlign: "center", padding: "32px 0", fontSize: 13 }}>
            This chapter has no content yet.
          </p>
        )}
      </div>
    );
  });

  /* Measure container and compute total spreads */
  useEffect(() => {
    function measure() {
      if (!wrapperRef.current || !innerRef.current) return;
      const w = wrapperRef.current.clientWidth;
      /* Each page is half the spread width; book ratio is 2:3 (w:h per page) */
      const pageW = (w - SPINE_W) / 2;
      const h = Math.round(pageW * 1.5);
      setContainerW(w);
      setContainerH(h);

      /* After DOM settles, read scrollWidth to count columns */
      requestAnimationFrame(() => {
        if (!innerRef.current) return;
        const scrollW = innerRef.current.scrollWidth;
        /* Each "page" column = (w - SPINE_W) / 2  wide, two columns = one spread = w */
        const spreads = Math.max(1, Math.round(scrollW / w));
        onTotalSpreads(spreads);
        setMeasured(true);
      });
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [chapters]);

  const translateX = containerW > 0 ? -(spreadIndex * containerW) : 0;

  /* Page numbers for footer */
  const leftPage = spreadIndex * 2 + 1;
  const rightPage = spreadIndex * 2 + 2;

  return (
    <div
      ref={wrapperRef}
      style={{
        width: "100%",
        height: containerH || 620,
        position: "relative",
        overflow: "hidden",
        borderRadius: 3,
        boxShadow: [
          "0 2px 4px rgba(0,0,0,0.45)",
          "0 8px 24px rgba(0,0,0,0.4)",
          "0 28px 72px rgba(0,0,0,0.4)",
        ].join(", "),
      }}
    >
      {/* Left page background */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0,
        width: `calc(50% - ${SPINE_W / 2}px)`,
        background: "linear-gradient(to left, #f5f1ea 0%, #faf7f2 100%)",
      }} />
      {/* Right page background */}
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        width: `calc(50% - ${SPINE_W / 2}px)`,
        background: "linear-gradient(to right, #f5f1ea 0%, #faf7f2 100%)",
      }} />
      {/* Spine */}
      <div style={{
        position: "absolute", left: "50%", top: 0, bottom: 0,
        width: SPINE_W, transform: "translateX(-50%)",
        background: "linear-gradient(180deg, #c2b9ae 0%, #a89d92 40%, #c2b9ae 100%)",
        zIndex: 2,
      }} />
      {/* Left inner shadow */}
      <div style={{
        position: "absolute", left: `calc(50% - ${SPINE_W / 2}px)`, top: 0, bottom: 0,
        width: 28, transform: "translateX(-100%)",
        background: "linear-gradient(to left, rgba(0,0,0,0.07), transparent)",
        pointerEvents: "none", zIndex: 3,
      }} />
      {/* Right inner shadow */}
      <div style={{
        position: "absolute", right: `calc(50% - ${SPINE_W / 2}px)`, top: 0, bottom: 0,
        width: 28, transform: "translateX(100%)",
        background: "linear-gradient(to right, rgba(0,0,0,0.07), transparent)",
        pointerEvents: "none", zIndex: 3,
      }} />

      {/* Scrolling columns content */}
      <div
        ref={innerRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          /* Two columns per spread, column-width = half of container */
          columnWidth: containerW > 0 ? `${(containerW - SPINE_W) / 2}px` : "50%",
          columnGap: SPINE_W,
          columnFill: "auto",
          /* Animate page turns */
          transform: `translateX(${translateX}px)`,
          transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
          /* Padding inside each column */
          padding: `${PAGE_PADDING_V}px 0 ${FOOTER_H + 8}px`,
          opacity: measured ? 1 : 0,
          /* Wide enough to hold all columns */
          width: "max-content",
          minWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Inline padding via column wrapper hack */}
        <style>{`
          .book-col-inner > * { padding-left: ${PAGE_PADDING_H}px; padding-right: ${PAGE_PADDING_H}px; }
        `}</style>
        <div
          className="book-col-inner"
          style={{ columnWidth: "inherit", columnGap: "inherit", display: "contents" }}
        >
          {bookContent}
        </div>
      </div>

      {/* ── Left-side tap area: go to previous spread ── */}
      {spreadIndex > 0 && (
        <div
          onClick={onPrev}
          title="Previous pages"
          style={{
            position: "absolute", left: 0, top: 0, bottom: FOOTER_H,
            width: "22%", zIndex: 5, cursor: "w-resize",
            display: "flex", alignItems: "center", justifyContent: "flex-start",
            paddingLeft: 8,
          }}
        >
          <div
            className="page-nav-hint page-nav-hint-left"
            style={{
              opacity: 0, transition: "opacity 0.2s",
              background: "rgba(0,0,0,0.35)", borderRadius: "0 50% 50% 0",
              width: 32, height: 56, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <ChevronLeft style={{ width: 18, height: 18, color: "#fff" }} />
          </div>
        </div>
      )}

      {/* ── Right-side tap area: go to next spread ── */}
      {spreadIndex < totalSpreads - 1 && (
        <div
          onClick={onNext}
          title="Next pages"
          style={{
            position: "absolute", right: 0, top: 0, bottom: FOOTER_H,
            width: "22%", zIndex: 5, cursor: "e-resize",
            display: "flex", alignItems: "center", justifyContent: "flex-end",
            paddingRight: 8,
          }}
        >
          <div
            className="page-nav-hint page-nav-hint-right"
            style={{
              opacity: 0, transition: "opacity 0.2s",
              background: "rgba(0,0,0,0.35)", borderRadius: "50% 0 0 50%",
              width: 32, height: 56, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <ChevronRight style={{ width: 18, height: 18, color: "#fff" }} />
          </div>
        </div>
      )}

      {/* Page number footers (overlaid) */}
      {containerW > 0 && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: FOOTER_H, zIndex: 4, display: "flex", pointerEvents: "none" }}>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", paddingLeft: PAGE_PADDING_H,
            borderTop: "1px solid rgba(180,170,155,0.3)",
            background: "linear-gradient(to left, #f5f1ea 0%, #faf7f2 100%)",
          }}>
            <span style={{ fontSize: 10, color: "#c0b8ae", fontFamily: "Georgia, serif", letterSpacing: "0.1em" }}>{leftPage}</span>
          </div>
          <div style={{ width: SPINE_W, background: "linear-gradient(180deg, #c2b9ae 0%, #a89d92 40%, #c2b9ae 100%)" }} />
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: PAGE_PADDING_H,
            borderTop: "1px solid rgba(180,170,155,0.3)",
            background: "linear-gradient(to right, #f5f1ea 0%, #faf7f2 100%)",
          }}>
            <span style={{ fontSize: 10, color: "#c0b8ae", fontFamily: "Georgia, serif", letterSpacing: "0.1em" }}>{rightPage}</span>
          </div>
        </div>
      )}
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
  const [totalSpreads, setTotalSpreads] = useState(1);
  const [showToc, setShowToc] = useState(false);
  const [viewCounted, setViewCounted] = useState(false);
  const [showPageNav, setShowPageNav] = useState(false);
  const [jumpInput, setJumpInput] = useState("");
  const [jumpEditing, setJumpEditing] = useState(false);
  const scrubberRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (book && !viewCounted) { incrementView.mutate(bookId); setViewCounted(true); }
  }, [book, bookId, viewCounted]);

  const sortedChapters = chapters
    ? [...chapters].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];

  const authorName = book?.authorName || (book as any)?.authorDisplayName || "Anonymous";

  const goSpread = useCallback((idx: number) => {
    setSpreadIndex(Math.max(0, Math.min(idx, totalSpreads - 1)));
    window.scrollTo({ top: 0, behavior: "smooth" });
    setShowToc(false);
  }, [totalSpreads]);

  /* Keyboard navigation */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (jumpEditing) return;
      if (e.key === "ArrowRight") goSpread(spreadIndex + 1);
      if (e.key === "ArrowLeft") goSpread(spreadIndex - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [spreadIndex, goSpread, jumpEditing]);

  /* Scrubber click handler */
  const handleScrubberClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    goSpread(Math.round(ratio * (totalSpreads - 1)));
  }, [totalSpreads, goSpread]);

  /* Jump to page handler */
  const handleJumpSubmit = useCallback((val: string) => {
    const n = parseInt(val.trim(), 10);
    if (!isNaN(n)) {
      // Convert 1-based page number to spread index (each spread = 2 pages)
      const spread = Math.max(0, Math.min(totalSpreads - 1, Math.ceil(n / 2) - 1));
      goSpread(spread);
    }
    setJumpEditing(false);
    setJumpInput("");
  }, [totalSpreads, goSpread]);

  const leftPage = spreadIndex * 2 + 1;
  const rightPage = spreadIndex * 2 + 2;
  const totalPages = totalSpreads * 2;
  const pct = totalSpreads > 1 ? Math.round((spreadIndex / (totalSpreads - 1)) * 100) : 100;

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
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 20px", height: 52, display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/library">
            <button style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "#777", cursor: "pointer", fontSize: 13, padding: "4px 8px", borderRadius: 6 }}
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

          {totalSpreads > 1 && (
            <span style={{ fontSize: 11, color: "#444", fontFamily: "Georgia, serif", letterSpacing: "0.06em", flexShrink: 0 }}>
              {spreadIndex + 1} / {totalSpreads}
            </span>
          )}

          <button onClick={() => setShowToc(!showToc)}
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowToc(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 55, top: 52 }}
            />
            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              style={{ position: "fixed", left: 0, top: 52, bottom: 0, zIndex: 60, width: 280, background: "#1a1815", borderRight: "1px solid rgba(255,255,255,0.07)", overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 20 }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 52, height: 70, borderRadius: 4, flexShrink: 0, overflow: "hidden", background: book.spineColor || "#2a2522", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "3px 4px 14px rgba(0,0,0,0.5)" }}>
                  {book.coverImage
                    ? <img src={book.coverImage} alt={book.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <BookOpen style={{ width: 20, height: 20, color: "rgba(255,255,255,0.4)" }} />
                  }
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#e8e0d4", fontFamily: "Georgia, serif", lineHeight: 1.35 }}>{book.title}</p>
                  <p style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{authorName}</p>
                  <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 11, color: "#444" }}>
                    <span><Eye style={{ width: 10, height: 10, display: "inline", marginRight: 3 }} />{book.viewCount || 0}</span>
                    {book.publishedAt && <span>{format(new Date(book.publishedAt), "MMM yyyy")}</span>}
                  </div>
                </div>
              </div>
              <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: "#444", textTransform: "uppercase", marginBottom: 10, fontFamily: "Georgia, serif" }}>Chapters</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {sortedChapters.map((ch, i) => (
                    <button key={ch.id} onClick={() => setShowToc(false)}
                      style={{ textAlign: "left", padding: "9px 12px", borderRadius: 8, fontSize: 13, display: "flex", alignItems: "center", gap: 10, border: "none", background: "transparent", color: "#555", cursor: "pointer", fontFamily: "Georgia, serif" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#ccc")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#555")}
                    >
                      <span style={{ fontSize: 10, opacity: 0.35, width: 18, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Reading area ── */}
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 16px 0" }}>

        {!sortedChapters.length ? (
          <div style={{ textAlign: "center", padding: "100px 0", color: "#555" }}>
            <BookOpen style={{ width: 48, height: 48, margin: "0 auto 16px", opacity: 0.3 }} />
            <p style={{ fontFamily: "Georgia, serif", fontSize: 16 }}>This book has no chapters yet.</p>
          </div>
        ) : (
          <>
            {/* Book spread with CSS columns for true pagination */}
            <BookSpread
              chapters={sortedChapters}
              spreadIndex={spreadIndex}
              totalSpreads={totalSpreads}
              onTotalSpreads={setTotalSpreads}
              onPrev={() => goSpread(spreadIndex - 1)}
              onNext={() => goSpread(spreadIndex + 1)}
            />

            {/* ── Inline spacer so content doesn't hide behind sticky nav ── */}
            <div style={{ height: 80 }} />

            {/* Rating & Comments — always visible */}
            <div style={{ maxWidth: 700, margin: "8px auto 0", paddingBottom: 64 }}>
              {/* Rating card */}
              <div style={{ background: "#1a1815", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "28px 32px", textAlign: "center", marginBottom: 28 }}>
                {spreadIndex === totalSpreads - 1 ? (
                  <>
                    <p style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#444", marginBottom: 8, fontFamily: "Georgia, serif" }}>You've reached the end</p>
                    <h3 style={{ fontSize: 20, fontWeight: 700, color: "#e0d8cc", fontFamily: "Georgia, serif", marginBottom: 6 }}>Did you enjoy this story?</h3>
                    <p style={{ fontSize: 13, color: "#555", marginBottom: 22, fontFamily: "Georgia, serif" }}>Your rating helps other readers discover great books</p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#888", fontFamily: "Georgia, serif", marginBottom: 16 }}>Rate this book</p>
                  </>
                )}
                <StarRating bookId={bookId} currentAvg={ratingStats?.avg ?? 0} count={ratingStats?.count ?? 0} />
              </div>
              <CommentsSection bookId={bookId} />
            </div>
          </>
        )}
      </div>

      {/* ── Sticky Page Navigator Bar ── */}
      {sortedChapters.length > 0 && totalSpreads > 1 && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 70,
          background: "rgba(18,16,14,0.97)", backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.07)",
        }}>
          {/* Page grid panel */}
          <AnimatePresence>
            {showPageNav && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                style={{ overflow: "hidden", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div style={{ padding: "14px 20px 10px", maxWidth: 980, margin: "0 auto" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <p style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#555", fontFamily: "Georgia, serif" }}>
                      Jump to page
                    </p>
                    {/* Jump-to-page input */}
                    <form onSubmit={e => { e.preventDefault(); handleJumpSubmit(jumpInput); }}
                      style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: "#555" }}>Go to page</span>
                      <input
                        type="number" min={1} max={totalPages} value={jumpInput}
                        onChange={e => setJumpInput(e.target.value)}
                        onFocus={() => setJumpEditing(true)}
                        onBlur={() => { handleJumpSubmit(jumpInput); }}
                        placeholder={String(leftPage)}
                        style={{
                          width: 60, padding: "3px 8px", borderRadius: 6, fontSize: 12, textAlign: "center",
                          background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                          color: "#ccc", outline: "none",
                        }}
                      />
                      <span style={{ fontSize: 11, color: "#444" }}>/ {totalPages}</span>
                    </form>
                  </div>
                  {/* Page tile grid */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {Array.from({ length: totalSpreads }).map((_, i) => {
                      const isActive = i === spreadIndex;
                      const lp = i * 2 + 1;
                      const rp = i * 2 + 2;
                      return (
                        <button key={i} onClick={() => { goSpread(i); setShowPageNav(false); }}
                          title={`Pages ${lp}–${rp}`}
                          style={{
                            width: 36, height: 26, borderRadius: 5, fontSize: 9, border: "none",
                            cursor: "pointer", transition: "all 0.15s", fontFamily: "Georgia, serif",
                            background: isActive ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.07)",
                            color: isActive ? "#fff" : "#555",
                            fontWeight: isActive ? 700 : 400,
                          }}
                          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.14)"; }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)"; }}
                        >
                          {lp}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main nav row */}
          <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 16px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>

            {/* Previous button */}
            <button
              onClick={() => goSpread(spreadIndex - 1)}
              disabled={spreadIndex === 0}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "none", border: "none", cursor: spreadIndex === 0 ? "default" : "pointer",
                color: spreadIndex === 0 ? "#333" : "#888", fontSize: 13, fontFamily: "Georgia, serif",
                padding: "6px 10px", borderRadius: 8, transition: "color 0.15s", flexShrink: 0,
              }}
              onMouseEnter={e => { if (spreadIndex > 0) (e.currentTarget as HTMLButtonElement).style.color = "#ddd"; }}
              onMouseLeave={e => { if (spreadIndex > 0) (e.currentTarget as HTMLButtonElement).style.color = "#888"; }}
            >
              <ChevronLeft style={{ width: 16, height: 16 }} />
              <span>Previous</span>
            </button>

            {/* Scrubber + page info */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              {/* Scrubber track */}
              <div
                ref={scrubberRef}
                onClick={handleScrubberClick}
                style={{ width: "100%", height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", cursor: "pointer", position: "relative", flexShrink: 0 }}
              >
                <div style={{
                  position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 3,
                  background: "linear-gradient(90deg, rgba(255,255,255,0.5), rgba(255,255,255,0.3))",
                  width: `${pct}%`, transition: "width 0.25s",
                }} />
                {/* Thumb */}
                <div style={{
                  position: "absolute", top: "50%", transform: "translate(-50%, -50%)",
                  left: `${pct}%`, width: 14, height: 14, borderRadius: "50%",
                  background: "#e8e0d4", boxShadow: "0 1px 6px rgba(0,0,0,0.6)",
                  transition: "left 0.25s",
                }} />
              </div>

              {/* Page numbers + % */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <button
                  onClick={() => { setShowPageNav(p => !p); setJumpInput(""); }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                    fontFamily: "Georgia, serif",
                  }}
                >
                  <span style={{ fontSize: 12, color: "#999", letterSpacing: "0.04em" }}>
                    {leftPage}–{rightPage}
                    <span style={{ color: "#444" }}> / {totalPages}</span>
                  </span>
                  <span style={{ fontSize: 10, color: "#444", padding: "1px 6px", borderRadius: 4, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    {pct}% complete
                  </span>
                  <BookMarked style={{ width: 11, height: 11, color: showPageNav ? "#bbb" : "#444", transition: "color 0.15s" }} />
                </button>
              </div>
            </div>

            {/* Next button */}
            {spreadIndex < totalSpreads - 1 ? (
              <button
                onClick={() => goSpread(spreadIndex + 1)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "none", border: "none", cursor: "pointer",
                  color: "#888", fontSize: 13, fontFamily: "Georgia, serif",
                  padding: "6px 10px", borderRadius: 8, transition: "color 0.15s", flexShrink: 0,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ddd"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#888"; }}
              >
                <span>Next</span>
                <ChevronRight style={{ width: 16, height: 16 }} />
              </button>
            ) : (
              <span style={{ fontSize: 12, color: "#383430", fontFamily: "Georgia, serif", flexShrink: 0, padding: "6px 10px" }}>End</span>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        /* Show arrow hints when hovering the tap areas */
        div:hover > .page-nav-hint { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
