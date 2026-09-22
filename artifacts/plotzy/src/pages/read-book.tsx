import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from "react";

// Share panel lazy-loaded — reader is public and often visited from
// social previews, so we don't want to ship the QR generator on
// first paint. Only spins up when the reader taps Share.
const ShareBookModal = lazy(() => import("@/components/ShareBookModal").then((m) => ({ default: m.ShareBookModal })));
import { useRoute, Link, useLocation } from "wouter";
import { sanitizeHtml } from "@/lib/sanitize";
import {
  usePublishedBook, usePublishedBookChapters, useIncrementBookView,
  useBookRatingStats, useRateBook, useBookComments, useAddBookComment,
  useBookInlineComments, useDeleteInlineComment, useResolveInlineComment,
  type InlineComment,
} from "@/hooks/use-public-library";
import { InlineCommentsLayer } from "@/components/InlineCommentsLayer";
import { SEO } from "@/components/SEO";
import { JsonLd } from "@/components/JsonLd";
import { buildBookSchema, buildBreadcrumbSchema } from "@/lib/seo-schema";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  BookOpen, ChevronLeft, ChevronRight, ArrowLeft, Eye,
  Loader2, Star, MessageSquare, MessageSquarePlus, Send, List, X, BookMarked, Check, Trash2, Highlighter,
  MoreHorizontal,
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useContentProtection } from "@/hooks/use-content-protection";
import { useLanguage } from "@/contexts/language-context";
import { useIsPhone } from "@/hooks/use-is-phone";
import { useReaderPrefs, useReadingPosition, THEME_COLORS, FONT_MIN, FONT_MAX, type ReaderTheme } from "@/hooks/use-reader-prefs";

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
  const { t, isRTL } = useLanguage();
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
                onSuccess: () => toast({ title: t("rbThanksRating") }),
                onError: () => toast({ title: t("rbFailed"), variant: "destructive" }),
              });
            }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
          >
            <Star style={{ width: 26, height: 26, transition: "all 0.15s", fill: s <= Math.round(display) ? "#555" : "none", color: s <= Math.round(display) ? "#555" : "#bbb" }} />
          </button>
        ))}
      </div>
      {count > 0
        ? <p style={{ fontSize: 13, color: "#888" }}><strong style={{ color: "#333" }}>{currentAvg.toFixed(1)}</strong> / 5 · {count} {count === 1 ? t("rbRating") : t("rbRatings")}</p>
        : <p style={{ fontSize: 13, color: "#888" }}>{t("rbBeFirstRate")}</p>
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
  const { t, isRTL } = useLanguage();
  const [content, setContent] = useState("");
  const [guestName, setGuestName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    addComment.mutate(
      { bookId, content, authorName: user ? undefined : guestName || t("rbAnonymous") },
      {
        onSuccess: () => { setContent(""); setGuestName(""); toast({ title: t("rbCommentPosted") }); },
        onError: () => toast({ title: t("rbCommentFailed"), variant: "destructive" }),
      }
    );
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <MessageSquare style={{ width: 16, height: 16, color: "#888" }} />
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#222", fontFamily: "Georgia, serif" }}>
          {t("rbReaderComments")} {comments && comments.length > 0 && <span style={{ fontWeight: 400, color: "#888" }}>({comments.length})</span>}
        </h3>
      </div>
      <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <div style={{ background: "#f9f7f4", border: "1px solid #e4ddd4", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {!user && <Input placeholder={t("rbYourNameOptional")} value={guestName} onChange={e => setGuestName(e.target.value)} style={{ borderColor: "#ddd5c8", background: "#fff", fontFamily: "Georgia, serif", fontSize: 14 }} maxLength={50} />}
          <Textarea placeholder={t("rbShareThoughts")} value={content} onChange={e => setContent(e.target.value)} style={{ borderColor: "rgba(255,255,255,0.1)", background: "#111", color: "#fff", fontFamily: "Georgia, serif", fontSize: 14, minHeight: 88, resize: "none" }} maxLength={1000} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#aaa" }}>{content.length}/1000</span>
            <button type="submit" disabled={!content.trim() || addComment.isPending}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#1c1410", color: "#fff", border: "none", cursor: "pointer", opacity: !content.trim() ? 0.5 : 1 }}>
              {addComment.isPending ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 14, height: 14 }} />}
              {t("rbPost")}
            </button>
          </div>
        </div>
      </form>
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "32px 0" }}><Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite", color: "#aaa", margin: "0 auto" }} /></div>
      ) : !comments || comments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#aaa", border: "1px dashed #ddd", borderRadius: 12 }}>
          <MessageSquare style={{ width: 28, height: 28, margin: "0 auto 8px", opacity: 0.4 }} />
          <p style={{ fontSize: 13 }}>{t("rbNoComments")}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {comments.map(c => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: "#f9f7f4", border: "1px solid #e4ddd4", borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e4ddd4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#555" }}>
                  {(c.authorName || "?").charAt(0).toUpperCase()}
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
/** Margin on each side of the text block, inside every page. */
const PAGE_MARGIN = 34;
const SPINE_W = 4;
const FOOTER_H = 40;

interface BookSpreadProps {
  /** Reader-chosen body size in px. */
  fontSize: number;
  theme: ReaderTheme;
  chapters: any[];
  spreadIndex: number;
  totalSpreads: number;
  onTotalSpreads: (n: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

function BookSpread({ chapters, spreadIndex, totalSpreads, onTotalSpreads, onPrev, onNext, fontSize, theme }: BookSpreadProps) {
  const colors = THEME_COLORS[theme];
  const { t, isRTL } = useLanguage();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);
  const [containerH, setContainerH] = useState(620);
  const [measured, setMeasured] = useState(false);

  /* Build full book content as React nodes with chapter breaks */
  const bookContent = useMemo(() => chapters.map((ch, i) => {
    const html = parseContentAsHtml(ch?.content);
    const plainText = parseContent(ch?.content);
    // The direction of THIS chapter's prose, which is not necessarily the
    // UI direction — an Arabic reader can open an English book.
    const contentRTL = isArabicText(plainText);
    const fontFam = contentRTL
      ? "'Amiri', 'Scheherazade New', 'Traditional Arabic', serif"
      : "'Georgia', 'Palatino Linotype', 'Book Antiqua', serif";
    // Determine if title is just a number (like "1", "2") -- skip showing it separately
    const titleIsNumber = ch?.title && /^\d+$/.test(ch.title.trim());
    const chapterLabel = titleIsNumber ? `${t("rbChapter")} ${ch.title}` : `${t("rbChapter")} ${i + 1}`;
    const showTitle = ch?.title && !titleIsNumber;

    return (
      <div key={ch.id} id={`spread-chapter-${ch.id}`} style={{ direction: contentRTL ? "rtl" : "ltr" }}>
        {/* Chapter header */}
        <div style={{ textAlign: "center", marginBottom: 28, marginTop: i === 0 ? 0 : 48, breakInside: "avoid" as any, breakAfter: "avoid-column" as any }}>
          <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: colors.muted, fontFamily: "Georgia, serif", marginBottom: showTitle ? 10 : 16 }}>
            {chapterLabel}
          </p>
          {showTitle && (
            <h2 style={{ fontSize: Math.round(fontSize * 1.28), fontWeight: 700, color: colors.ink, fontFamily: "'Georgia', 'Palatino Linotype', serif", lineHeight: 1.3, margin: "0 0 16px", direction: contentRTL ? "rtl" : "ltr" }}>
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
            style={{ fontFamily: fontFam, fontSize, lineHeight: 1.85, color: colors.ink, textAlign: "justify", letterSpacing: contentRTL ? "0" : "0.008em", hyphens: "auto" as any }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
          />
        ) : (
          <p style={{ color: "#bbb", fontStyle: "italic", fontFamily: "Georgia, serif", textAlign: "center", padding: "32px 0", fontSize: 13 }}>
            {t("rbNoContent")}
          </p>
        )}
      </div>
    );
  }), [chapters, t, fontSize, colors]);

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
        // ceil, not round: with round, a book needing 2.4 spreads reported
        // 2 and the final 40% could not be reached by any control.
        const spreads = Math.max(1, Math.ceil(scrollW / w - 0.02));
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
  }, [chapters, fontSize]);

  // In an RTL document the multicol overflow extends to the LEFT of the
  // origin, so the page turn has to slide the other way. Without this the
  // Arabic UI showed blank pages from spread 1 onwards.
  const translateX = containerW > 0 ? (isRTL ? 1 : -1) * spreadIndex * containerW : 0;

  /* Page numbers for footer */
  const leftPage = spreadIndex * 2 + 1;
  const rightPage = spreadIndex * 2 + 2;

  return (
    <div
      ref={wrapperRef}
      id="spread-viewport"
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
        background: `linear-gradient(to left, ${colors.pageAlt} 0%, ${colors.page} 100%)`,
      }} />
      {/* Right page background */}
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        width: `calc(50% - ${SPINE_W / 2}px)`,
        background: `linear-gradient(to right, ${colors.pageAlt} 0%, ${colors.page} 100%)`,
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
          insetInlineStart: 0,
          height: "100%",
          /* Exactly two columns per box; the gap is twice the margin so the
             page grid repeats cleanly across every spread. */
          columnCount: 2,
          columnGap: PAGE_MARGIN * 2,
          columnFill: "auto",
          /* Animate page turns */
          transform: `translateX(${translateX}px)`,
          transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
          padding: `${PAGE_PADDING_V}px ${PAGE_MARGIN}px ${FOOTER_H + 8}px`,
          opacity: measured ? 1 : 0,
          /* Exactly one spread wide. The extra columns overflow sideways,
             which is what makes a whole-box translate land on a page every
             time. */
          width: containerW > 0 ? containerW : "100%",
          boxSizing: "border-box",
        }}
      >
        {/* No per-child padding: in a multicol box a fragmented element
            only gets padding on its first and last fragment, which is why
            the right-hand page used to run flush into the book's edge.
            The margins come from the column geometry instead. */}
        <div
          className="book-col-inner"
          style={{ columnWidth: "inherit", columnGap: "inherit", display: "contents" }}
        >
          {bookContent}
        </div>
      </div>

      {/* ── Outer-start tap area: previous spread (mirrors in RTL) ── */}
      {spreadIndex > 0 && (
        <div
          onClick={onPrev}
          title={t("rbPrevPages")}
          style={{
            position: "absolute", insetInlineStart: 0, top: 0, bottom: FOOTER_H,
            width: "22%", zIndex: 5, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "flex-start",
            paddingInlineStart: 8,
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
          title={t("rbNextPages")}
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
            flex: 1, display: "flex", alignItems: "center", paddingInlineStart: PAGE_MARGIN,
            borderTop: "1px solid rgba(180,170,155,0.3)",
            background: `linear-gradient(to left, ${colors.pageAlt} 0%, ${colors.page} 100%)`,
          }}>
            <span style={{ fontSize: 10, color: "#c0b8ae", fontFamily: "Georgia, serif", letterSpacing: "0.1em" }}>{leftPage}</span>
          </div>
          <div style={{ width: SPINE_W, background: "linear-gradient(180deg, #c2b9ae 0%, #a89d92 40%, #c2b9ae 100%)" }} />
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingInlineEnd: PAGE_MARGIN,
            borderTop: "1px solid rgba(180,170,155,0.3)",
            background: `linear-gradient(to right, ${colors.pageAlt} 0%, ${colors.page} 100%)`,
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

  // Friction-grade IP protection on rendered chapter HTML. Pairs with
  // the user-select:none CSS rule below; see hook source for what
  // is/isn't covered.
  useContentProtection(".book-reader-content");

  const { data: book, isLoading: bookLoading } = usePublishedBook(bookId);
  const { data: chapters, isLoading: chaptersLoading } = usePublishedBookChapters(bookId);
  const { data: ratingStats } = useBookRatingStats(bookId);
  const incrementView = useIncrementBookView();

  const [spreadIndex, setSpreadIndex] = useState(0);
  const [totalSpreads, setTotalSpreads] = useState(1);
  // Phone gets a single stacked page — the two-page book spread is
  // beautiful on tablet/desktop but would compress each column into a
  // 150-px sliver on a 375 px iPhone screen.
  const isPhone = useIsPhone();
  // Type size, page theme, and where this reader stopped last time.
  const { prefs, setFontSize, setTheme } = useReaderPrefs();
  const { load: loadPos, save: savePos } = useReadingPosition(bookId);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  // Swipe bookkeeping + the current page's nav functions, published by
  // the phone branch so the container's touch handler can call them.
  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const phoneNextRef = useRef<(() => void) | null>(null);
  const phonePrevRef = useRef<(() => void) | null>(null);
  const [restored, setRestored] = useState(false);
  const [showToc, setShowToc] = useState(false);
  // Phone-only: the top bar collapses Share / Notes / meta into one
  // "More" sheet so the 52px bar never crams six controls.
  const [phoneMoreOpen, setPhoneMoreOpen] = useState(false);
  // Share panel — visible to everyone (readers, not just the author),
  // because the whole point of a public link is that readers pass it
  // along too.
  const [showShare, setShowShare] = useState(false);
  const [viewCounted, setViewCounted] = useState(false);
  const [currentChapterIdx, setCurrentChapterIdx] = useState(0);
  const [currentPageInChapter, setCurrentPageInChapter] = useState(0);
  // (the old scrubber / jump-to-page state was never wired to anything)
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);
  const [commentHintDismissed, setCommentHintDismissed] = useState(false);
  const { data: inlineComments = [] } = useBookInlineComments(bookId);
  const deleteInlineComment = useDeleteInlineComment();
  const resolveInlineComment = useResolveInlineComment();

  const [, navigate] = useLocation();
  const { t, isRTL } = useLanguage();

  // Redirect articles to /blog/:id
  useEffect(() => {
    if (book && (book as any).contentType === "article") {
      navigate(`/blog/${bookId}`, { replace: true });
    }
  }, [book, bookId, navigate]);

  useEffect(() => {
    if (book && !viewCounted) { incrementView.mutate(bookId); setViewCounted(true); }
  }, [book, bookId, viewCounted]);

  // Memoised: these used to be plain consts, so every render produced a
  // new array identity. That fed the effect below, which set state, which
  // re-rendered — a permanent ~2 Hz loop that re-sanitised the entire book
  // (DOMPurify over every chapter) twice a second.
  const sortedChapters = useMemo(
    () => (chapters ? [...chapters].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : []),
    [chapters],
  );

  const authorName = book?.authorName || (book as any)?.authorDisplayName || t("rbAnonymous");

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

  const readerUnits: ReaderUnit[] = useMemo(() => {
    const units: ReaderUnit[] = [];
    if (bookPages.copyright?.trim())   units.push({ kind: "front-copyright",   content: bookPages.copyright });
    if (bookPages.dedication?.trim())  units.push({ kind: "front-dedication",  content: bookPages.dedication });
    if (bookPages.epigraph?.trim())    units.push({ kind: "front-epigraph",    content: bookPages.epigraph });
    sortedChapters.forEach((ch, i) => units.push({ kind: "chapter", chapter: ch, chapterIndex: i }));
    if (bookPages.aboutAuthor?.trim()) units.push({ kind: "back-about-author", content: bookPages.aboutAuthor });
    return units;
  }, [sortedChapters, bookPages.copyright, bookPages.dedication, bookPages.epigraph, bookPages.aboutAuthor]);

  // Labels used in both the TOC and the current-chapter footer line.
  const unitLabel = (unit: ReaderUnit): string => {
    if (unit.kind === "chapter") {
      const ch = unit.chapter;
      const titleIsNumber = ch.title && /^\d+$/.test(ch.title.trim());
      if (titleIsNumber) return `${t("rbChapter")} ${ch.title}`;
      return ch.title?.trim() || `${t("rbChapter")} ${unit.chapterIndex + 1}`;
    }
    if (unit.kind === "front-copyright")   return t("rbCopyright");
    if (unit.kind === "front-dedication")  return t("rbDedication");
    if (unit.kind === "front-epigraph")    return t("rbEpigraph");
    return t("rbAboutAuthor");
  };

  // Jump the desktop spread to whichever page a chapter starts on. The
  // Contents panel used to only set phone state, so on a laptop clicking
  // a chapter closed the drawer and did nothing at all.
  const goToChapter = useCallback((chapterId: number) => {
    const el = document.getElementById(`spread-chapter-${chapterId}`);
    const box = document.getElementById("spread-viewport");
    if (!el || !box) return false;
    const boxRect = box.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    // Where the chapter sits relative to the current scroll offset.
    const offsetWithin = (isRTL ? boxRect.right - elRect.right : elRect.left - boxRect.left);
    const target = spreadIndex + Math.floor(offsetWithin / boxRect.width + 0.001);
    setSpreadIndex(Math.max(0, Math.min(target, totalSpreads - 1)));
    return true;
  }, [isRTL, spreadIndex, totalSpreads]);

  const goSpread = useCallback((idx: number) => {
    setSpreadIndex(Math.max(0, Math.min(idx, totalSpreads - 1)));
    window.scrollTo({ top: 0, behavior: "smooth" });
    setShowToc(false);
  }, [totalSpreads]);

  /* Keyboard navigation */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      // Never steal keys from a comment box.
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      // In Arabic the book turns the other way, so the arrows swap.
      const forward = isRTL ? "ArrowLeft" : "ArrowRight";
      const back = isRTL ? "ArrowRight" : "ArrowLeft";
      if (e.key === forward || e.key === "PageDown") { e.preventDefault(); goSpread(spreadIndex + 1); }
      if (e.key === back || e.key === "PageUp") { e.preventDefault(); goSpread(spreadIndex - 1); }
      if (e.key === "Home") { e.preventDefault(); goSpread(0); }
      if (e.key === "End") { e.preventDefault(); goSpread(totalSpreads - 1); }
      if (e.key === "Escape") setShowToc(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [spreadIndex, goSpread, isRTL, totalSpreads]);

  const pct = totalSpreads > 1 ? Math.round((spreadIndex / (totalSpreads - 1)) * 100) : 100;

  // Pick the reader back up where they stopped. Desktop restores the
  // spread once the book has been measured; phone restores the unit and
  // page as soon as the units exist.
  useEffect(() => {
    if (restored) return;
    const pos = loadPos();
    if (!pos) { setRestored(true); return; }
    if (isPhone) {
      if (readerUnits.length === 0) return;
      if (typeof pos.unit === "number") setCurrentChapterIdx(Math.min(pos.unit, readerUnits.length - 1));
      if (typeof pos.page === "number") setCurrentPageInChapter(Math.max(0, pos.page));
      setRestored(true);
    } else {
      if (totalSpreads <= 1) return;
      if (typeof pos.spread === "number") setSpreadIndex(Math.min(Math.max(0, pos.spread), totalSpreads - 1));
      setRestored(true);
    }
  }, [restored, isPhone, readerUnits.length, totalSpreads, loadPos]);

  // Remember the position as the reader moves (only after the restore
  // pass, so we never overwrite a saved spot with the initial 0).
  useEffect(() => {
    if (!restored) return;
    savePos(isPhone
      ? { unit: currentChapterIdx, page: currentPageInChapter }
      : { spread: spreadIndex });
  }, [restored, isPhone, spreadIndex, currentChapterIdx, currentPageInChapter, savePos]);

  /* The notes layer anchors to the DOM itself, so the old 500 ms timer
     that collected chapter elements into state served nothing except to
     re-render the page forever. Gone. */
  const chapterIds = useMemo(() => sortedChapters.map(ch => ch.id), [sortedChapters]);
  const hasChapters = sortedChapters.length > 0;

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
        <SEO title={t("rbBookNotFound")} noindex />
        <BookOpen style={{ width: 48, height: 48, opacity: 0.4 }} />
        <p style={{ fontSize: 20, fontWeight: 600, fontFamily: "Georgia, serif" }}>{t("rbBookNotFound")}</p>
        <Link href="/library">
          <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#888", cursor: "pointer", fontSize: 14 }}>
            <ArrowLeft style={{ width: 16, height: 16 }} /> {t("rbBackToLibrary")}
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#181614" }}>
      <SEO
        title={book.title}
        description={book.summary || `${book.title} ${t("rbBy")} ${book.authorName || t("rbAnonAuthor")}. ${t("rbReadFreeOn")}`}
        ogType="book"
        ogImage={book.coverImage || undefined}
      />
      <JsonLd data={buildBookSchema(book, ratingStats)} />
      <JsonLd data={buildBreadcrumbSchema([
        { name: t("rbLibrary"), path: "/library" },
        { name: book.title, path: `/read/${book.id}` },
      ])} />

      {/* ── Top bar ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(24,22,20,0.97)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        // Respect the notch / Dynamic Island in standalone (PWA) mode.
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: isPhone ? "0 12px" : "0 20px", height: 52, display: "flex", alignItems: "center", gap: isPhone ? 6 : 14 }}>
          <Link href="/library">
            <button
              aria-label={t("rbLibrary")}
              style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "#777", cursor: "pointer", fontSize: 13, padding: isPhone ? "8px" : "4px 8px", borderRadius: 6 }}
              onMouseEnter={e => (e.currentTarget.style.color = "#ccc")}
              onMouseLeave={e => (e.currentTarget.style.color = "#777")}
            >
              <ArrowLeft style={{ width: isPhone ? 18 : 15, height: isPhone ? 18 : 15 }} />
              {!isPhone && <span>{t("rbLibrary")}</span>}
            </button>
          </Link>

          {!isPhone && <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />}

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#ddd", fontFamily: "Georgia, serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {book.title}
            </p>
            <p style={{ fontSize: 11, color: "#555", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t("rbBy")} {authorName}</p>
          </div>

          {!isPhone && ratingStats && ratingStats.count > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#666" }}>
              <Star style={{ width: 11, height: 11, fill: "#888", color: "#888" }} />
              <span style={{ fontWeight: 700, color: "#aaa" }}>{Number(ratingStats.avg ?? 0).toFixed(1)}</span>
            </div>
          )}

          {!isPhone && sortedChapters.length > 0 && (
            <span style={{ fontSize: 11, color: "#444", fontFamily: "Georgia, serif", flexShrink: 0 }}>
              {sortedChapters.length} {sortedChapters.length === 1 ? t("rbChapterWord") : t("rbChaptersWord")}
            </span>
          )}

          {/* Share — every reader gets to spread the book, not just
              the author. The modal handles WhatsApp / X / QR / copy.
              On phones this lives in the More sheet. */}
          {!isPhone && (
          <button onClick={() => setShowShare(true)}
            aria-label={t("rbShare") || "Share"}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 12, padding: "5px 10px", borderRadius: 6, flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = "#bbb")}
            onMouseLeave={e => (e.currentTarget.style.color = "#666")}
          >
            <Send style={{ width: 15, height: 15 }} />
            <span>{t("rbShare") || (t("rbBy") === "بقلم" ? "شارك" : "Share")}</span>
          </button>
          )}

          {/* Type size + page theme. A reader who needs bigger text
              should not have to zoom the whole browser. */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={() => setShowTypeMenu(v => !v)}
              aria-label={t("rbTypeSettings")}
              title={t("rbTypeSettings")}
              style={{ display: "flex", alignItems: "center", gap: 5, background: showTypeMenu ? "rgba(255,255,255,0.08)" : "none", border: "none", color: showTypeMenu ? "#ddd" : "#666", cursor: "pointer", fontSize: 12, padding: isPhone ? "8px" : "5px 10px", borderRadius: 6 }}
            >
              <span style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: isPhone ? 17 : 15, lineHeight: 1 }}>Aa</span>
            </button>
            {showTypeMenu && (
              <>
                <div onClick={() => setShowTypeMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 70 }} />
                <div
                  style={{
                    position: "absolute", top: "calc(100% + 8px)", insetInlineEnd: 0, zIndex: 71,
                    width: 232, background: "#211f1c", border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 12, padding: 14, boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
                  }}
                >
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b645a", marginBottom: 8 }}>
                    {t("rbTextSize")}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <button
                      onClick={() => setFontSize(prefs.fontSize - 1)}
                      disabled={prefs.fontSize <= FONT_MIN}
                      aria-label={t("rbSmaller")}
                      style={{ flex: 1, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", color: prefs.fontSize <= FONT_MIN ? "#4a453e" : "#ddd", cursor: prefs.fontSize <= FONT_MIN ? "default" : "pointer", fontFamily: "Georgia, serif", fontSize: 13 }}
                    >A−</button>
                    <span style={{ minWidth: 34, textAlign: "center", fontSize: 12.5, color: "#aaa", fontVariantNumeric: "tabular-nums" }}>{prefs.fontSize}</span>
                    <button
                      onClick={() => setFontSize(prefs.fontSize + 1)}
                      disabled={prefs.fontSize >= FONT_MAX}
                      aria-label={t("rbLarger")}
                      style={{ flex: 1, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", color: prefs.fontSize >= FONT_MAX ? "#4a453e" : "#ddd", cursor: prefs.fontSize >= FONT_MAX ? "default" : "pointer", fontFamily: "Georgia, serif", fontSize: 19 }}
                    >A+</button>
                  </div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b645a", marginBottom: 8 }}>
                    {t("rbPageTheme")}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {([["paper", t("rbThemePaper")], ["sepia", t("rbThemeSepia")], ["night", t("rbThemeNight")]] as const).map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => setTheme(id)}
                        style={{
                          flex: 1, padding: "9px 4px", borderRadius: 8, cursor: "pointer",
                          background: THEME_COLORS[id].page,
                          color: THEME_COLORS[id].ink,
                          border: prefs.theme === id ? "2px solid #d9cdb8" : "1px solid rgba(255,255,255,0.12)",
                          fontSize: 11, fontWeight: 600, fontFamily: "Georgia, serif",
                        }}
                      >{label}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <button onClick={() => setShowToc(!showToc)}
            aria-label={t("rbContents")}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 12, padding: isPhone ? "8px" : "5px 10px", borderRadius: 6, flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = "#bbb")}
            onMouseLeave={e => (e.currentTarget.style.color = "#666")}
          >
            {showToc ? <X style={{ width: isPhone ? 18 : 15, height: isPhone ? 18 : 15 }} /> : <List style={{ width: isPhone ? 18 : 15, height: isPhone ? 18 : 15 }} />}
            {!isPhone && <span>{t("rbContents")}</span>}
          </button>

          {/* Inline comments sidebar toggle (desktop; phones use More) */}
          {!isPhone && (
          <button onClick={() => setShowCommentsSidebar(!showCommentsSidebar)}
            style={{ position: "relative", display: "flex", alignItems: "center", gap: 5, background: showCommentsSidebar ? "rgba(250,204,21,0.12)" : "none", border: "none", color: showCommentsSidebar ? "#facc15" : "#666", cursor: "pointer", fontSize: 12, padding: "5px 10px", borderRadius: 6, flexShrink: 0 }}
            onMouseEnter={e => { if (!showCommentsSidebar) e.currentTarget.style.color = "#bbb"; }}
            onMouseLeave={e => { if (!showCommentsSidebar) e.currentTarget.style.color = "#666"; }}
          >
            <MessageSquarePlus style={{ width: 15, height: 15 }} />
            <span>{t("rbNotes")}</span>
            {inlineComments.length > 0 && (
              <span style={{ background: "#facc15", color: "#000", fontSize: 9, fontWeight: 700, borderRadius: 10, padding: "1px 5px", minWidth: 16, textAlign: "center" }}>
                {inlineComments.length}
              </span>
            )}
          </button>
          )}

          {/* Phone: one More button gathers Share / Notes / meta. */}
          {isPhone && (
            <button onClick={() => setPhoneMoreOpen(true)}
              aria-label="More"
              style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "#888", cursor: "pointer", padding: 8, borderRadius: 6, flexShrink: 0 }}
            >
              <MoreHorizontal style={{ width: 20, height: 20 }} />
              {inlineComments.length > 0 && (
                <span style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: 999, background: "#facc15" }} />
              )}
            </button>
          )}
        </div>
      </header>

      {/* ── Phone "More" sheet: share, notes, and the book meta ── */}
      {isPhone && phoneMoreOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80 }}>
          <div onClick={() => setPhoneMoreOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }} />
          <div style={{
            position: "absolute", left: 0, right: 0, bottom: 0,
            background: "#1f1c19", borderRadius: "24px 24px 0 0",
            padding: "10px 20px calc(env(safe-area-inset-bottom, 0px) + 22px)",
            boxShadow: "0 -20px 60px rgba(0,0,0,0.55)",
          }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "4px 0 12px" }}>
              <div style={{ width: 40, height: 5, borderRadius: 999, background: "rgba(255,255,255,0.16)" }} />
            </div>

            {/* Meta line: rating + chapter count */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, color: "#888", fontSize: 12.5 }}>
              <span style={{ fontFamily: "Georgia, serif", color: "#ccc", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{book.title}</span>
              {ratingStats && ratingStats.count > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <Star style={{ width: 11, height: 11, fill: "#888", color: "#888" }} />
                  <span style={{ fontWeight: 700, color: "#aaa" }}>{Number(ratingStats.avg ?? 0).toFixed(1)}</span>
                </span>
              )}
              {sortedChapters.length > 0 && (
                <span style={{ flexShrink: 0 }}>
                  {sortedChapters.length} {sortedChapters.length === 1 ? t("rbChapterWord") : t("rbChaptersWord")}
                </span>
              )}
            </div>

            {[
              {
                icon: <Send style={{ width: 17, height: 17 }} />,
                label: t("rbShare") || (t("rbBy") === "بقلم" ? "شارك" : "Share"),
                onTap: () => { setPhoneMoreOpen(false); setShowShare(true); },
                badge: null as number | null,
              },
              {
                icon: <MessageSquarePlus style={{ width: 17, height: 17 }} />,
                label: t("rbNotes"),
                onTap: () => { setPhoneMoreOpen(false); setShowCommentsSidebar(true); },
                badge: inlineComments.length > 0 ? inlineComments.length : null,
              },
            ].map((item, i) => (
              <button key={i} onClick={item.onTap}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 14, padding: "14px 16px", marginBottom: 8,
                  color: "#ddd", fontSize: 14.5, fontWeight: 600, cursor: "pointer",
                }}
              >
                {item.icon}
                <span style={{ flex: 1, textAlign: "start" }}>{item.label}</span>
                {item.badge !== null && (
                  <span style={{ background: "#facc15", color: "#000", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "2px 7px" }}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

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
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: "#444", textTransform: "uppercase", marginBottom: 10, fontFamily: "Georgia, serif" }}>{t("rbContents")}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {readerUnits.map((unit, i) => {
                    const isActive = currentChapterIdx === i;
                    const isMatter = unit.kind !== "chapter";
                    // For chapter units keep the running number; for front/back matter show a dash.
                    const numberCell = unit.kind === "chapter" ? String(unit.chapterIndex + 1) : "·";
                    return (
                      <button key={i} onClick={() => {
                        setCurrentChapterIdx(i);
                        setCurrentPageInChapter(0);
                        setShowToc(false);
                        // On a laptop the spread is driven by spreadIndex, so jump
                        // it to where this chapter begins — the panel used to set
                        // phone-only state and do nothing here.
                        if (!isPhone && unit.kind === "chapter") {
                          requestAnimationFrame(() => goToChapter(unit.chapter.id));
                        }
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
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
                    {t("rbReaderNotes")}
                  </span>
                  <span style={{ fontSize: 11, color: "#555", fontWeight: 600 }}>({inlineComments.length})</span>
                </div>
                <button onClick={() => setShowCommentsSidebar(false)}
                  aria-label={t("rbCloseComments")}
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
                      {t("rbNoNotes")}<br />{t("rbSelectToComment")}
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
                                <img src={c.authorAvatarUrl} alt={c.authorName || ""} style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} />
                              ) : (
                                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(250,204,21,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#facc15" }}>
                                  {(c.authorName || "?").charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span style={{ fontSize: 11, fontWeight: 600, color: "#bbb" }}>{c.authorName}</span>
                            </div>
                            {chapter && (
                              <span style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                {t("rbCh")} {sortedChapters.indexOf(chapter) + 1}
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
                                title={t("rbResolve")}
                                aria-label={t("rbResolveComment")}
                                style={{ background: "none", border: "none", color: "rgba(34,197,94,0.5)", cursor: "pointer", padding: 3, borderRadius: 4 }}
                                onMouseEnter={e => (e.currentTarget.style.color = "#22c55e")}
                                onMouseLeave={e => (e.currentTarget.style.color = "rgba(34,197,94,0.5)")}
                              >
                                <Check style={{ width: 13, height: 13 }} />
                              </button>
                              <button onClick={() => deleteInlineComment.mutate({ bookId, commentId: c.id })}
                                title={t("rbDelete")}
                                aria-label={t("rbDeleteComment")}
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

      {/* ── Reading area — two-page book spread on desktop, single
           stacked page on phone. Desktop uses the BookSpread renderer
           (CSS-columned continuous flow, spine effect, 2:3 page
           proportions) — phones would compress each column into an
           unreadable sliver so they stay on the classic paginated
           layout. ── */}
      <div
        className="read-book-container"
        // Swipe to turn pages on touch. Horizontal intent only — a
        // vertical drag is a scroll and must stay one.
        onTouchStart={isPhone ? (e) => {
          const tch = e.touches[0];
          touchRef.current = { x: tch.clientX, y: tch.clientY, t: Date.now() };
        } : undefined}
        onTouchEnd={isPhone ? (e) => {
          const start = touchRef.current;
          touchRef.current = null;
          if (!start) return;
          const tch = e.changedTouches[0];
          const dx = tch.clientX - start.x;
          const dy = tch.clientY - start.y;
          if (Date.now() - start.t > 800) return;          // a slow drag is not a swipe
          if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
          // Swiping left goes forward in LTR, backward in RTL.
          const forward = isRTL ? dx > 0 : dx < 0;
          (forward ? phoneNextRef : phonePrevRef).current?.();
        } : undefined}
        style={{
          maxWidth: isPhone ? 700 : 1120,
          margin: "0 auto",
          padding: isPhone ? "0 24px" : "28px 24px 0",
        }}
      >

        {!readerUnits.length ? (
          <div style={{ textAlign: "center", padding: "100px 0", color: "#555" }}>
            <BookOpen style={{ width: 48, height: 48, margin: "0 auto 16px", opacity: 0.3 }} />
            <p style={{ fontFamily: "Georgia, serif", fontSize: 16 }}>{t("rbNoChapters")}</p>
          </div>
        ) : !isPhone && sortedChapters.length > 0 ? (
          <>
            {/* Two-page book spread — the whole book flows across
                CSS columns, page-turn animation, keyboard nav via
                the goSpread effect above. */}
            <BookSpread
              fontSize={prefs.fontSize}
              theme={prefs.theme}
              chapters={sortedChapters}
              spreadIndex={spreadIndex}
              totalSpreads={totalSpreads}
              onTotalSpreads={setTotalSpreads}
              onPrev={() => goSpread(spreadIndex - 1)}
              onNext={() => goSpread(spreadIndex + 1)}
            />
            {/* Compact spread controls — a slim strip below the book
                with prev/next + a "N of M" indicator. */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "24px auto 40px", gap: 12, maxWidth: 700 }}>
              <button
                disabled={spreadIndex === 0}
                onClick={() => goSpread(spreadIndex - 1)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 10,
                  background: spreadIndex === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: spreadIndex === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.6)",
                  fontSize: 13, fontWeight: 500, cursor: spreadIndex === 0 ? "default" : "pointer",
                  fontFamily: "Georgia, serif",
                }}
              >
                <ChevronLeft style={{ width: 16, height: 16 }} /> {t("rbPrevious")}
              </button>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", fontFamily: "Georgia, serif" }}>
                {t("rbPage")} {spreadIndex * 2 + 1}–{Math.min(spreadIndex * 2 + 2, totalSpreads * 2)} {t("rbOf")} {totalSpreads * 2}
              </span>
              <button
                disabled={spreadIndex >= totalSpreads - 1}
                onClick={() => goSpread(spreadIndex + 1)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 10,
                  background: spreadIndex >= totalSpreads - 1 ? "rgba(255,255,255,0.03)" : "#fff",
                  border: "none",
                  color: spreadIndex >= totalSpreads - 1 ? "rgba(255,255,255,0.15)" : "#000",
                  fontSize: 13, fontWeight: 600, cursor: spreadIndex >= totalSpreads - 1 ? "default" : "pointer",
                  fontFamily: "Georgia, serif",
                }}
              >
                {t("rbNext")} <ChevronRight style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Phone / matter-only fallback — single page at a time. */}
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
                ? (titleIsNumber ? `${t("rbChapter")} ${ch!.title}` : `${t("rbChapter")} ${unit.chapterIndex + 1}`)
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
                  // Land on the LAST page of the previous unit. This used
                  // to set 999 and rely on a clamp at render time, so the
                  // state stayed 999 and Previous then had to be pressed
                  // ~997 times before anything moved.
                  const prevIdx = currentChapterIdx - 1;
                  const prevUnit = readerUnits[prevIdx];
                  const prevPages = prevUnit && prevUnit.kind === "chapter"
                    ? splitHtmlIntoPages(parseContentAsHtml(prevUnit.chapter.content), 250).length
                    : 1;
                  setCurrentChapterIdx(prevIdx);
                  setCurrentPageInChapter(Math.max(0, prevPages - 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              };

              const isVeryFirst = currentChapterIdx === 0 && isFirstPage;
              const isVeryLast = currentChapterIdx >= readerUnits.length - 1 && isLastPage;
              // Hand the current page's navigation to the swipe handler.
              phoneNextRef.current = isVeryLast ? null : goNextPage;
              phonePrevRef.current = isVeryFirst ? null : goPrevPage;

              // Shared page-shell styles used by both chapter and matter pages.
              const pageShell: React.CSSProperties = {
                background: THEME_COLORS[prefs.theme].page,
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
                    <div id={`chapter-${ch!.id}`} className="read-book-phone-page" style={pageShell}>
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
                            fontFamily: fontFam, fontSize: prefs.fontSize, lineHeight: 1.9,
                            color: "#1c1410", textAlign: "justify",
                            letterSpacing: isRTL ? "0" : "0.01em",
                          }}
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(pageHtml) }}
                        />
                      ) : (
                        <p style={{ color: "#bbb", fontStyle: "italic", fontFamily: "Georgia, serif", textAlign: "center", padding: "32px 0", fontSize: 13 }}>
                          {t("rbNoContent")}
                        </p>
                      )}

                      {/* Page footer */}
                      <div style={{ marginTop: 40, paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: "#b0a898", fontFamily: "Georgia, serif" }}>{book?.authorName || book?.title}</span>
                        <span style={{ fontSize: 10, color: "#b0a898", fontFamily: "Georgia, serif" }}>
                          {chapterLabel} · {t("rbPage")} {pageIdx + 1} {t("rbOf")} {totalPagesInChapter}
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
                      <ChevronLeft style={{ width: 16, height: 16 }} /> {t("rbPrevious")}
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
                      {t("rbNext")} <ChevronRight style={{ width: 16, height: 16 }} />
                    </button>
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* Rating & Comments — shown at the end regardless of the
            spread/phone rendering choice. */}
        {readerUnits.length > 0 && (
          <div style={{ maxWidth: 600, margin: "40px auto", paddingBottom: 64 }}>
            <div style={{ background: "#1a1815", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "28px 32px", textAlign: "center", marginBottom: 28 }}>
              <p style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#444", marginBottom: 8, fontFamily: "Georgia, serif" }}>{t("rbReachedEnd")}</p>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "#e0d8cc", fontFamily: "Georgia, serif", marginBottom: 6 }}>{t("rbEnjoyStory")}</h3>
              <p style={{ fontSize: 13, color: "#555", marginBottom: 22, fontFamily: "Georgia, serif" }}>{t("rbRatingHelps")}</p>
              <StarRating bookId={bookId} currentAvg={ratingStats?.avg ?? 0} count={ratingStats?.count ?? 0} />
            </div>
            <CommentsSection bookId={bookId} />
          </div>
        )}
      </div>

      {/* No sticky page navigator — using scroll layout */}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        div:hover > .page-nav-hint { opacity: 1 !important; }

        /* Book reader content styles — preserves formatting from the editor */
        .book-reader-content { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: text; }
        .book-reader-content img { -webkit-user-drag: none; user-drag: none; }
        .book-reader-content p { margin: 0 0 1.1em; text-indent: 1.8em; orphans: 2; widows: 2; }
        .book-reader-content p:first-child { text-indent: 0; }
        /* Logical float/margin so the drop cap sits on the correct side
           in RTL Arabic books (the content wrapper carries an inline
           direction: rtl, which inline-start / inline-end follow). */
        .book-reader-content p:first-child::first-letter { font-size: 1.8em; font-weight: 700; line-height: 1; float: inline-start; margin-inline-end: 0.08em; }
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

      {/* Inline Comments Layer — it anchors to the DOM by itself, so it no
          longer waits on a 500 ms ref-collection pass that also happened to
          re-render the page forever. */}
      {bookId > 0 && hasChapters && (
        <InlineCommentsLayer bookId={bookId} chapterIds={chapterIds} onFirstSelection={() => setCommentHintDismissed(true)} />
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
              {t("rbReaderNotes")}
            </span>
          </div>
          <p style={{ fontSize: 12, color: "#888", lineHeight: 1.5, margin: 0 }}>
            {t("rbSelectNoteLong")}
          </p>
        </div>
      )}

      {/* Share panel — mounted at the reader root so it overlays
          both the content and the inline-comments sidebar. */}
      <Suspense fallback={null}>
        <ShareBookModal
          open={showShare}
          onClose={() => setShowShare(false)}
          bookId={book.id}
          title={book.title}
          author={authorName}
          coverImage={book.coverImage || null}
          summary={(book as any).summary || (book as any).blurb || null}
        />
      </Suspense>
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
  const { t, isRTL } = useLanguage();
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
          {t("rbAboutAuthor")}
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
