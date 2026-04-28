import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { sanitizeHtml } from "@/lib/sanitize";
import {
  usePublishedBook, usePublishedBookChapters, useIncrementBookView,
  useBookRatingStats, useRateBook, useBookComments, useAddBookComment,
  useBookInlineComments, useDeleteInlineComment, useResolveInlineComment,
  type InlineComment,
} from "@/hooks/use-public-library";
import { InlineCommentsLayer } from "@/components/InlineCommentsLayer";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  BookOpen, ChevronLeft, ChevronRight, ArrowLeft, Eye,
  Loader2, Star, MessageSquare, MessageSquarePlus, Send, List, X, BookMarked, Check, Trash2, Highlighter,
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

/** Like parseContent but returns HTML string (preserving formatting) */
function parseContentAsHtml(raw: string | null | undefined): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.v === 2) {
      return typeof parsed.pages === "string"
        ? parsed.pages
        : Array.isArray(parsed.pages) ? parsed.pages.join("") : "";
    }
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => {
        if (typeof item === "string") return item;
        if (item && typeof item.content === "string") return item.content;
        return "";
      }).join("");
    }
    if (typeof parsed === "string") return parsed;
  } catch { }
  return raw;
}

/* ─── Split HTML into pages by paragraph groups (~250 words per page) ── */
function splitHtmlIntoPages(html: string, wordsPerPage = 250): string[] {
  // Split by paragraph tags
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const elements = Array.from(doc.body.firstElementChild?.children || []);
  if (elements.length === 0) return [html];

  const pages: string[] = [];
  let currentPage = "";
  let currentWords = 0;

  elements.forEach(el => {
    const text = el.textContent || "";
    const words = text.trim().split(/\s+/).filter(Boolean).length;

    if (currentWords > 0 && currentWords + words > wordsPerPage) {
      pages.push(currentPage);
      currentPage = el.outerHTML;
      currentWords = words;
    } else {
      currentPage += el.outerHTML;
      currentWords += words;
    }
  });

  if (currentPage) pages.push(currentPage);
  return pages.length > 0 ? pages : [html];
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
          <Textarea placeholder="Share your thoughts…" value={content} onChange={e => setContent(e.target.value)} style={{ borderColor: "rgba(255,255,255,0.1)", background: "#111", color: "#fff", fontFamily: "Georgia, serif", fontSize: 14, minHeight: 88, resize: "none" }} maxLength={1000} />
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

const PAGE_PADDING_V = 52;
const PAGE_PADDING_H = 48;
const SPINE_W = 4;
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

  /* Build full book content as React nodes with chapter breaks */
  const bookContent = chapters.map((ch, i) => {
    const html = parseContentAsHtml(ch?.content);
    const plainText = parseContent(ch?.content);
    const isRTL = isArabicText(plainText);
    const fontFam = isRTL
      ? "'Amiri', 'Scheherazade New', 'Traditional Arabic', serif"
      : "'Georgia', 'Palatino Linotype', 'Book Antiqua', serif";
    // Determine if title is just a number (like "1", "2") -- skip showing it separately
    const titleIsNumber = ch?.title && /^\d+$/.test(ch.title.trim());
    const chapterLabel = titleIsNumber ? `Chapter ${ch.title}` : `Chapter ${i + 1}`;
    const showTitle = ch?.title && !titleIsNumber;

    return (
      <div key={ch.id} style={{ direction: isRTL ? "rtl" : "ltr" }}>
        {/* Chapter header */}
        <div style={{ textAlign: "center", marginBottom: 28, marginTop: i === 0 ? 0 : 48, breakAfter: "avoid" as any }}>
          <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: "#b0a898", fontFamily: "Georgia, serif", marginBottom: showTitle ? 10 : 16 }}>
            {chapterLabel}
          </p>
          {showTitle && (
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1c1410", fontFamily: "'Georgia', 'Palatino Linotype', serif", lineHeight: 1.3, margin: "0 0 16px", direction: isArabicText(ch.title) ? "rtl" : "ltr" }}>
              {ch.title}
            </h2>
          )}
          <div style={{ width: 32, height: 1, background: "#c8bfb3", margin: "0 auto" }} />
        </div>

        {/* Chapter content — rendered as HTML to preserve formatting */}
        {html ? (
          <div
            className="book-reader-content"
            data-chapter-id={ch.id}
            style={{ fontFamily: fontFam, fontSize: 14, lineHeight: 1.85, color: "#1c1410", textAlign: "justify", letterSpacing: isRTL ? "0" : "0.008em", hyphens: "auto" as any }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
          />
        ) : (
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
      const fullW = wrapperRef.current.parentElement?.clientWidth ?? wrapperRef.current.clientWidth;
      /* Available viewport height minus header + top-padding + bottom nav */
      const HEADER_H = 52;
      const TOP_PAD = 28;
      const BOTTOM_NAV = 64;
      const maxH = Math.max(300, window.innerHeight - HEADER_H - TOP_PAD - BOTTOM_NAV);

      /* Each page is half the spread width; book ratio is 2:3 (w:h per page) */
      const pageW_from_w = (fullW - SPINE_W) / 2;
      const h_from_w = Math.round(pageW_from_w * 1.5);

      let h: number;
      let w: number;
      if (h_from_w <= maxH) {
        /* Width is the binding constraint — use full width */
        h = h_from_w;
        w = fullW;
      } else {
        /* Height is the binding constraint — scale down to maintain 2:3 ratio */
        h = maxH;
        const pageW_from_h = Math.round(maxH / 1.5);
        w = pageW_from_h * 2 + SPINE_W;
      }

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
    // Capture the target node BEFORE handing it to ResizeObserver. If
    // wrapperRef.current is reassigned mid-effect (fast navigation,
    // chapter swap), the cleanup below would otherwise see a different
    // ref and `target` could already be unmounted. Capturing keeps the
    // observe/unobserve symmetric on whatever node we actually watched.
    const target = wrapperRef.current?.parentElement ?? wrapperRef.current ?? null;
    const ro = new ResizeObserver(measure);
    if (target) ro.observe(target);
    return () => {
      if (target) ro.unobserve(target);
      ro.disconnect();
    };
  }, [chapters]);

  const translateX = containerW > 0 ? -(spreadIndex * containerW) : 0;

  /* Page numbers for footer */
  const leftPage = spreadIndex * 2 + 1;
  const rightPage = spreadIndex * 2 + 2;

  return (
    <div
      ref={wrapperRef}
      style={{
        width: containerW > 0 ? containerW : "100%",
        maxWidth: "100%",
        margin: "0 auto",
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
          /* Two columns per spread — gap includes spine + inner margins */
          columnWidth: containerW > 0 ? `${(containerW - SPINE_W - PAGE_PADDING_H * 2) / 2}px` : "45%",
          columnGap: SPINE_W + PAGE_PADDING_H * 2,
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
        {/* Page padding applied to left/right of the content area */}
        <style>{`
          .book-col-inner > * { padding-left: ${PAGE_PADDING_H}px; padding-right: 0; }
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
  const [currentChapterIdx, setCurrentChapterIdx] = useState(0);
  const [currentPageInChapter, setCurrentPageInChapter] = useState(0);
  const [showPageNav, setShowPageNav] = useState(false);
  const [jumpInput, setJumpInput] = useState("");
  const [jumpEditing, setJumpEditing] = useState(false);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);
  const [commentHintDismissed, setCommentHintDismissed] = useState(false);
  const { data: inlineComments = [] } = useBookInlineComments(bookId);
  const deleteInlineComment = useDeleteInlineComment();
  const resolveInlineComment = useResolveInlineComment();

  const [, navigate] = useLocation();

  // Redirect articles to /blog/:id
  useEffect(() => {
    if (book && (book as any).contentType === "article") {
      navigate(`/blog/${bookId}`, { replace: true });
    }
  }, [book, bookId, navigate]);

  useEffect(() => {
    if (book && !viewCounted) { incrementView.mutate(bookId); setViewCounted(true); }
  }, [book, bookId, viewCounted]);

  const sortedChapters = chapters
    ? [...chapters].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];

  const authorName = book?.authorName || (book as any)?.authorDisplayName || "Anonymous";

  // ── Reader units: front matter + chapters + back matter ────────────────
  // The author's bookPages (copyright / dedication / epigraph / aboutAuthor)
  // are rendered as dedicated reader pages wrapped around the chapters so
  // the online experience matches the PDF export — not just plain chapters.
  type ReaderUnit =
    | { kind: "chapter"; chapter: typeof sortedChapters[number]; chapterIndex: number }
    | { kind: "front-copyright"; content: string }
    | { kind: "front-dedication"; content: string }
    | { kind: "front-epigraph"; content: string }
    | { kind: "back-about-author"; content: string };

  const bookPages = ((book as any)?.bookPages || {}) as {
    copyright?: string;
    dedication?: string;
    epigraph?: string;
    aboutAuthor?: string;
  };

  const readerUnits: ReaderUnit[] = [];
  if (bookPages.copyright?.trim())  readerUnits.push({ kind: "front-copyright",  content: bookPages.copyright });
  if (bookPages.dedication?.trim()) readerUnits.push({ kind: "front-dedication", content: bookPages.dedication });
  if (bookPages.epigraph?.trim())   readerUnits.push({ kind: "front-epigraph",   content: bookPages.epigraph });
  sortedChapters.forEach((ch, i) => readerUnits.push({ kind: "chapter", chapter: ch, chapterIndex: i }));
  if (bookPages.aboutAuthor?.trim()) readerUnits.push({ kind: "back-about-author", content: bookPages.aboutAuthor });

  // Labels used in both the TOC and the current-chapter footer line.
  const unitLabel = (unit: ReaderUnit): string => {
    if (unit.kind === "chapter") {
      const ch = unit.chapter;
      const titleIsNumber = ch.title && /^\d+$/.test(ch.title.trim());
      if (titleIsNumber) return `Chapter ${ch.title}`;
      return ch.title?.trim() || `Chapter ${unit.chapterIndex + 1}`;
    }
    if (unit.kind === "front-copyright")   return "Copyright";
    if (unit.kind === "front-dedication")  return "Dedication";
    if (unit.kind === "front-epigraph")    return "Epigraph";
    return "About the Author";
  };

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

  /* ─── Collect chapter content DOM refs for inline comments ─── */
  const [chapterRefs, setChapterRefs] = useState<Map<number, HTMLElement>>(new Map());
  const chapterIds = useMemo(() => sortedChapters.map(ch => ch.id), [sortedChapters]);

  useEffect(() => {
    // Collect all .book-reader-content[data-chapter-id] elements
    const timer = setTimeout(() => {
      const map = new Map<number, HTMLElement>();
      document.querySelectorAll<HTMLElement>(".book-reader-content[data-chapter-id]").forEach(el => {
        const id = Number(el.dataset.chapterId);
        if (id && !map.has(id)) map.set(id, el);
      });
      if (map.size > 0) setChapterRefs(map);
    }, 500);
    return () => clearTimeout(timer);
  }, [sortedChapters, spreadIndex]);

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

          {sortedChapters.length > 0 && (
            <span style={{ fontSize: 11, color: "#444", fontFamily: "Georgia, serif", flexShrink: 0 }}>
              {sortedChapters.length} {sortedChapters.length === 1 ? "chapter" : "chapters"}
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

          {/* Inline comments sidebar toggle */}
          <button onClick={() => setShowCommentsSidebar(!showCommentsSidebar)}
            style={{ position: "relative", display: "flex", alignItems: "center", gap: 5, background: showCommentsSidebar ? "rgba(250,204,21,0.12)" : "none", border: "none", color: showCommentsSidebar ? "#facc15" : "#666", cursor: "pointer", fontSize: 12, padding: "5px 10px", borderRadius: 6, flexShrink: 0 }}
            onMouseEnter={e => { if (!showCommentsSidebar) e.currentTarget.style.color = "#bbb"; }}
            onMouseLeave={e => { if (!showCommentsSidebar) e.currentTarget.style.color = "#666"; }}
          >
            <MessageSquarePlus style={{ width: 15, height: 15 }} />
            <span>Notes</span>
            {inlineComments.length > 0 && (
              <span style={{ background: "#facc15", color: "#000", fontSize: 9, fontWeight: 700, borderRadius: 10, padding: "1px 5px", minWidth: 16, textAlign: "center" }}>
                {inlineComments.length}
              </span>
            )}
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
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: "#444", textTransform: "uppercase", marginBottom: 10, fontFamily: "Georgia, serif" }}>Contents</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {readerUnits.map((unit, i) => {
                    const isActive = currentChapterIdx === i;
                    const isMatter = unit.kind !== "chapter";
                    // For chapter units keep the running number; for front/back matter show a dash.
                    const numberCell = unit.kind === "chapter" ? String(unit.chapterIndex + 1) : "—";
                    return (
                      <button key={i} onClick={() => { setCurrentChapterIdx(i); setCurrentPageInChapter(0); setShowToc(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        style={{ textAlign: "left", padding: "9px 12px", borderRadius: 8, fontSize: 13, display: "flex", alignItems: "center", gap: 10, border: "none", background: isActive ? "rgba(255,255,255,0.08)" : "transparent", color: isActive ? "#fff" : "#555", cursor: "pointer", fontFamily: "Georgia, serif", fontStyle: isMatter ? "italic" : "normal" }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = "#ccc"; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "#555"; }}
                      >
                        <span style={{ fontSize: 10, opacity: 0.35, width: 18, textAlign: "right", flexShrink: 0 }}>{numberCell}</span>
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{unitLabel(unit)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Inline Comments Sidebar ── */}
      <AnimatePresence>
        {showCommentsSidebar && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCommentsSidebar(false)}
              style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.4)" }} />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              style={{
                position: "fixed", top: 0, right: 0, bottom: 0, width: 360, zIndex: 61,
                background: "#1a1815", borderLeft: "1px solid rgba(255,255,255,0.08)",
                display: "flex", flexDirection: "column", overflow: "hidden",
              }}
            >
              {/* Header */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <MessageSquarePlus style={{ width: 16, height: 16, color: "#facc15" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#e0d8cc", fontFamily: "Georgia, serif" }}>
                    Reader Notes
                  </span>
                  <span style={{ fontSize: 11, color: "#555", fontWeight: 600 }}>({inlineComments.length})</span>
                </div>
                <button onClick={() => setShowCommentsSidebar(false)}
                  style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: 4 }}>
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>

              {/* Comments list */}
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
                {inlineComments.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 20px", color: "#444" }}>
                    <MessageSquare style={{ width: 32, height: 32, margin: "0 auto 12px", opacity: 0.3 }} />
                    <p style={{ fontSize: 13, fontFamily: "Georgia, serif", lineHeight: 1.6 }}>
                      No notes yet.<br />Select any text to add a comment.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {inlineComments.map((c: InlineComment) => {
                      const chapter = sortedChapters.find(ch => ch.id === c.chapterId);
                      return (
                        <div key={c.id} style={{
                          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: 12, padding: 14, transition: "border-color 0.15s",
                        }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(250,204,21,0.2)")}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
                        >
                          {/* Author + chapter */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {c.authorAvatarUrl ? (
                                <img src={c.authorAvatarUrl} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} />
                              ) : (
                                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(250,204,21,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#facc15" }}>
                                  {c.authorName[0]?.toUpperCase()}
                                </div>
                              )}
                              <span style={{ fontSize: 11, fontWeight: 600, color: "#bbb" }}>{c.authorName}</span>
                            </div>
                            {chapter && (
                              <span style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Ch. {sortedChapters.indexOf(chapter) + 1}
                              </span>
                            )}
                          </div>

                          {/* Quoted text */}
                          <div style={{
                            background: "rgba(250,204,21,0.06)", borderLeft: "2px solid rgba(250,204,21,0.3)",
                            borderRadius: "0 6px 6px 0", padding: "6px 10px", marginBottom: 8,
                            fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.5, fontStyle: "italic",
                            maxHeight: 40, overflow: "hidden",
                          }}>
                            &ldquo;{c.selectedText.length > 80 ? c.selectedText.slice(0, 80) + "..." : c.selectedText}&rdquo;
                          </div>

                          {/* Comment content */}
                          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, marginBottom: 8 }}>
                            {c.content}
                          </p>

                          {/* Footer: date + actions */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 10, color: "#444" }}>
                              {new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                            <div style={{ display: "flex", gap: 4 }}>
                              <button onClick={() => resolveInlineComment.mutate({ bookId, commentId: c.id })}
                                title="Resolve"
                                style={{ background: "none", border: "none", color: "rgba(34,197,94,0.5)", cursor: "pointer", padding: 3, borderRadius: 4 }}
                                onMouseEnter={e => (e.currentTarget.style.color = "#22c55e")}
                                onMouseLeave={e => (e.currentTarget.style.color = "rgba(34,197,94,0.5)")}
                              >
                                <Check style={{ width: 13, height: 13 }} />
                              </button>
                              <button onClick={() => deleteInlineComment.mutate({ bookId, commentId: c.id })}
                                title="Delete"
                                style={{ background: "none", border: "none", color: "rgba(239,68,68,0.4)", cursor: "pointer", padding: 3, borderRadius: 4 }}
                                onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                                onMouseLeave={e => (e.currentTarget.style.color = "rgba(239,68,68,0.4)")}
                              >
                                <Trash2 style={{ width: 13, height: 13 }} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Reading area — scrollable pages ── */}
      <div className="read-book-container" style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px" }}>

        {!readerUnits.length ? (
          <div style={{ textAlign: "center", padding: "100px 0", color: "#555" }}>
            <BookOpen style={{ width: 48, height: 48, margin: "0 auto 16px", opacity: 0.3 }} />
            <p style={{ fontFamily: "Georgia, serif", fontSize: 16 }}>This book has no chapters yet.</p>
          </div>
        ) : (
          <>
            {/* One "unit" at a time — front matter, chapter, or back matter. */}
            {(() => {
              const unit = readerUnits[Math.min(currentChapterIdx, readerUnits.length - 1)];
              if (!unit) return null;

              const isChapter = unit.kind === "chapter";

              // For chapter units, split into pages. Matter pages are
              // single-page, so totalPagesInChapter is 1 and pageIdx is 0.
              const ch = isChapter ? unit.chapter : null;
              const html = isChapter ? parseContentAsHtml(ch!.content) : "";
              // Outer ternary already handles isChapter; in the false branch unit.kind is
              // narrowed to one of the matter kinds, so unit.content is always defined.
              const plainText = isChapter ? parseContent(ch!.content) : unit.content;
              const isRTL = isArabicText(plainText);
              const titleIsNumber = isChapter && ch!.title && /^\d+$/.test(ch!.title.trim());
              const chapterLabel = isChapter
                ? (titleIsNumber ? `Chapter ${ch!.title}` : `Chapter ${unit.chapterIndex + 1}`)
                : unitLabel(unit);
              const showTitle = isChapter && ch!.title && !titleIsNumber;
              const fontFam = isRTL
                ? "'Amiri', 'Scheherazade New', 'Traditional Arabic', serif"
                : "'Georgia', 'Palatino Linotype', 'Book Antiqua', serif";

              const chapterPages = isChapter && html ? splitHtmlIntoPages(html, 250) : [""];
              const pageIdx = isChapter ? Math.min(currentPageInChapter, chapterPages.length - 1) : 0;
              const pageHtml = isChapter ? (chapterPages[pageIdx] || "") : "";
              const totalPagesInChapter = Math.max(1, chapterPages.length);
              const isFirstPage = pageIdx === 0;
              const isLastPage = pageIdx >= totalPagesInChapter - 1;

              const goNextPage = () => {
                if (isChapter && !isLastPage) {
                  setCurrentPageInChapter(p => p + 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else if (currentChapterIdx < readerUnits.length - 1) {
                  setCurrentChapterIdx(p => p + 1);
                  setCurrentPageInChapter(0);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              };

              const goPrevPage = () => {
                if (isChapter && !isFirstPage) {
                  setCurrentPageInChapter(p => p - 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else if (currentChapterIdx > 0) {
                  setCurrentChapterIdx(p => p - 1);
                  setCurrentPageInChapter(999); // clamps to last page of previous unit
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              };

              const isVeryFirst = currentChapterIdx === 0 && isFirstPage;
              const isVeryLast = currentChapterIdx >= readerUnits.length - 1 && isLastPage;

              // Shared page-shell styles used by both chapter and matter pages.
              const pageShell: React.CSSProperties = {
                background: "#faf7f2",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 4,
                padding: "40px clamp(16px, 5vw, 56px) 32px",
                marginTop: 32,
                boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
                direction: isRTL ? "rtl" : "ltr",
                minHeight: "60vh",
              };

              return (
                <div>
                  {isChapter ? (
                    <div id={`chapter-${ch!.id}`} style={pageShell}>
                      {/* Chapter header — only on first page of chapter */}
                      {isFirstPage && (
                        <div style={{ textAlign: "center", marginBottom: 36 }}>
                          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: "#b0a898", fontFamily: "Georgia, serif", marginBottom: showTitle ? 10 : 16 }}>
                            {chapterLabel}
                          </p>
                          {showTitle && (
                            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1c1410", fontFamily: fontFam, lineHeight: 1.3, margin: "0 0 16px" }}>
                              {ch!.title}
                            </h2>
                          )}
                          <div style={{ width: 36, height: 1, background: "#c8bfb3", margin: "0 auto" }} />
                        </div>
                      )}

                      {pageHtml ? (
                        <div
                          className="book-reader-content"
                          data-chapter-id={ch!.id}
                          style={{
                            fontFamily: fontFam, fontSize: 15, lineHeight: 1.9,
                            color: "#1c1410", textAlign: "justify",
                            letterSpacing: isRTL ? "0" : "0.01em",
                          }}
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(pageHtml) }}
                        />
                      ) : (
                        <p style={{ color: "#bbb", fontStyle: "italic", fontFamily: "Georgia, serif", textAlign: "center", padding: "32px 0", fontSize: 13 }}>
                          This chapter has no content yet.
                        </p>
                      )}

                      {/* Page footer */}
                      <div style={{ marginTop: 40, paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: "#b0a898", fontFamily: "Georgia, serif" }}>{book?.authorName || book?.title}</span>
                        <span style={{ fontSize: 10, color: "#b0a898", fontFamily: "Georgia, serif" }}>
                          {chapterLabel} · Page {pageIdx + 1} of {totalPagesInChapter}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <MatterPage unit={unit} fontFam={fontFam} authorName={authorName} pageShell={pageShell} />
                  )}

                  {/* Navigation */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "24px 0 40px", gap: 12 }}>
                    <button disabled={isVeryFirst} onClick={goPrevPage}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 10,
                        background: isVeryFirst ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.08)", color: isVeryFirst ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.6)",
                        fontSize: 13, fontWeight: 500, cursor: isVeryFirst ? "default" : "pointer", fontFamily: "Georgia, serif",
                      }}>
                      <ChevronLeft style={{ width: 16, height: 16 }} /> Previous
                    </button>

                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "Georgia, serif", textAlign: "center" }}>
                      {isChapter ? `${chapterLabel} · ${pageIdx + 1}/${totalPagesInChapter}` : chapterLabel}
                    </span>

                    <button disabled={isVeryLast} onClick={goNextPage}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 10,
                        background: isVeryLast ? "rgba(255,255,255,0.03)" : "#fff",
                        border: "none", color: isVeryLast ? "rgba(255,255,255,0.15)" : "#000",
                        fontSize: 13, fontWeight: 600, cursor: isVeryLast ? "default" : "pointer", fontFamily: "Georgia, serif",
                      }}>
                      Next <ChevronRight style={{ width: 16, height: 16 }} />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Rating & Comments */}
            <div style={{ maxWidth: 600, margin: "40px auto", paddingBottom: 64 }}>
              <div style={{ background: "#1a1815", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "28px 32px", textAlign: "center", marginBottom: 28 }}>
                <p style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#444", marginBottom: 8, fontFamily: "Georgia, serif" }}>You've reached the end</p>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: "#e0d8cc", fontFamily: "Georgia, serif", marginBottom: 6 }}>Did you enjoy this story?</h3>
                <p style={{ fontSize: 13, color: "#555", marginBottom: 22, fontFamily: "Georgia, serif" }}>Your rating helps other readers discover great books</p>
                <StarRating bookId={bookId} currentAvg={ratingStats?.avg ?? 0} count={ratingStats?.count ?? 0} />
              </div>
              <CommentsSection bookId={bookId} />
            </div>
          </>
        )}
      </div>

      {/* No sticky page navigator — using scroll layout */}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        div:hover > .page-nav-hint { opacity: 1 !important; }

        /* Book reader content styles — preserves formatting from the editor */
        .book-reader-content { user-select: none; -webkit-user-select: none; cursor: text; }
        .book-reader-content p { margin: 0 0 1.1em; text-indent: 1.8em; orphans: 2; widows: 2; }
        .book-reader-content p:first-child { text-indent: 0; }
        .book-reader-content p:first-child::first-letter { font-size: 1.8em; font-weight: 700; line-height: 1; float: left; margin-right: 0.08em; }
        .book-reader-content h1 { font-size: 1.5em; font-weight: 800; margin: 1.2em 0 0.5em; text-indent: 0; color: #1c1410; }
        .book-reader-content h2 { font-size: 1.3em; font-weight: 700; margin: 1.1em 0 0.4em; text-indent: 0; color: #1c1410; }
        .book-reader-content h3 { font-size: 1.15em; font-weight: 700; margin: 1em 0 0.35em; text-indent: 0; color: #1c1410; }
        .book-reader-content h4 { font-size: 1em; font-weight: 700; margin: 0.9em 0 0.3em; text-indent: 0; }
        .book-reader-content blockquote { border-left: 2px solid #c8bfb3; margin: 1.2em 0; padding: 0.3em 0 0.3em 1.2em; color: #5a4f42; font-style: italic; text-indent: 0; }
        .book-reader-content ul { list-style: disc; padding-left: 1.8em; margin: 0.8em 0; text-indent: 0; }
        .book-reader-content ol { list-style: decimal; padding-left: 1.8em; margin: 0.8em 0; text-indent: 0; }
        .book-reader-content li { margin: 0.2em 0; text-indent: 0; }
        .book-reader-content strong, .book-reader-content b { font-weight: 700; }
        .book-reader-content em, .book-reader-content i { font-style: italic; }
        .book-reader-content code { background: #f0ebe4; border-radius: 3px; padding: 1px 4px; font-family: 'Courier Prime', monospace; font-size: 0.9em; }
        .book-reader-content pre { background: #f0ebe4; border-radius: 6px; padding: 12px; margin: 1em 0; overflow-x: auto; text-indent: 0; }
        .book-reader-content hr { border: none; border-top: 1px solid #d4ccc2; margin: 2em auto; width: 40%; }
        .book-reader-content a { color: #4a5568; text-decoration: underline; }
        .book-reader-content img { max-width: 100%; height: auto; border-radius: 6px; margin: 1em 0; }
        .inline-comment-highlight { background: rgba(250, 204, 21, 0.25) !important; border-bottom: 2px solid rgba(250, 204, 21, 0.5); cursor: pointer; border-radius: 2px; padding: 0 1px; transition: background 0.15s; }
        .inline-comment-highlight:hover { background: rgba(250, 204, 21, 0.4) !important; }
      `}</style>

      {/* Inline Comments Layer */}
      {bookId > 0 && chapterRefs.size > 0 && (
        <InlineCommentsLayer bookId={bookId} chapterRefs={chapterRefs} chapterIds={chapterIds} onFirstSelection={() => setCommentHintDismissed(true)} />
      )}

      {/* Margin hint — select text to comment */}
      {sortedChapters.length > 0 && (
        <div
          style={{
            position: "fixed",
            right: 24,
            top: 80,
            opacity: commentHintDismissed ? 0 : 1,
            transition: "opacity 0.3s ease",
            pointerEvents: "none",
            background: "rgba(250,204,21,0.06)",
            border: "1px solid rgba(250,204,21,0.15)",
            borderRadius: 14,
            padding: "14px 18px",
            maxWidth: 170,
          }}
          className="hidden xl:block"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(250,204,21,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Highlighter style={{ width: 14, height: 14, color: "#facc15" }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#d4c89a", letterSpacing: "0.02em" }}>
              Reader Notes
            </span>
          </div>
          <p style={{ fontSize: 12, color: "#888", lineHeight: 1.5, margin: 0 }}>
            Select any text on the page to leave a note or comment.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Front / Back matter page renderer ───────────────────────────────────
// Copyright, Dedication, Epigraph, and About-the-Author each get their own
// full page. Typography is tuned per page type to match how these sections
// appear in a professionally typeset print book.
function MatterPage({
  unit,
  fontFam,
  authorName,
  pageShell,
}: {
  unit:
    | { kind: "front-copyright"; content: string }
    | { kind: "front-dedication"; content: string }
    | { kind: "front-epigraph"; content: string }
    | { kind: "back-about-author"; content: string };
  fontFam: string;
  authorName: string;
  pageShell: React.CSSProperties;
}) {
  const GEORGIA = "'Georgia', 'Palatino Linotype', 'Book Antiqua', serif";
  // Preserve line breaks but keep simple text-only rendering — these fields
  // are plain-text inputs.
  const lines = (unit.content || "").split("\n");

  if (unit.kind === "front-copyright") {
    return (
      <div style={{ ...pageShell, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          {lines.map((line, i) => (
            <p key={i} style={{ fontFamily: GEORGIA, fontSize: 11.5, color: "#6b5c4a", lineHeight: 1.85, margin: line.trim() ? "0 0 6px" : "0 0 14px" }}>
              {line || "\u00A0"}
            </p>
          ))}
        </div>
      </div>
    );
  }

  if (unit.kind === "front-dedication") {
    return (
      <div style={{ ...pageShell, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          {lines.map((line, i) => (
            <p key={i} style={{ fontFamily: fontFam, fontSize: 17, fontStyle: "italic", color: "#2a1e12", lineHeight: 1.75, margin: "0 0 6px", letterSpacing: "0.01em" }}>
              {line || "\u00A0"}
            </p>
          ))}
        </div>
      </div>
    );
  }

  if (unit.kind === "front-epigraph") {
    // Last line beginning with "—" / "--" is conventionally the citation.
    const nonEmpty = lines.filter(l => l.length > 0);
    const last = nonEmpty[nonEmpty.length - 1] || "";
    const isCitation = /^\s*(—|--)/.test(last);
    const body = isCitation ? nonEmpty.slice(0, -1) : nonEmpty;

    return (
      <div style={{ ...pageShell, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <div style={{ maxWidth: 460, textAlign: "center" }}>
          <span style={{ fontFamily: GEORGIA, fontSize: 38, color: "#c8bfb3", lineHeight: 1, display: "block", marginBottom: 12 }}>“</span>
          {body.map((line, i) => (
            <p key={i} style={{ fontFamily: fontFam, fontSize: 16, fontStyle: "italic", color: "#3a2b1c", lineHeight: 1.7, margin: "0 0 8px" }}>
              {line}
            </p>
          ))}
          {isCitation && (
            <p style={{ fontFamily: GEORGIA, fontSize: 12, color: "#7a6a55", marginTop: 18, letterSpacing: "0.04em" }}>
              {last.replace(/^\s*(—|--)\s*/, "— ")}
            </p>
          )}
        </div>
      </div>
    );
  }

  // back-about-author
  return (
    <div style={{ ...pageShell }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: "#b0a898", fontFamily: GEORGIA, marginBottom: 12 }}>
          About the Author
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1c1410", fontFamily: fontFam, lineHeight: 1.25, margin: "0 0 14px" }}>
          {authorName}
        </h2>
        <div style={{ width: 36, height: 1, background: "#c8bfb3", margin: "0 auto" }} />
      </div>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        {lines.map((line, i) => (
          <p key={i} style={{ fontFamily: fontFam, fontSize: 15, lineHeight: 1.85, color: "#2a1e12", margin: line.trim() ? "0 0 14px" : "0 0 8px", textAlign: "justify", letterSpacing: "0.01em" }}>
            {line || "\u00A0"}
          </p>
        ))}
      </div>
    </div>
  );
}
