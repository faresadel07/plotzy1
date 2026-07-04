// Apple-TV-style horizontal content row for the mobile home.
//
// A section header (title + chevron) above a horizontally scrolling
// strip of poster cards. The last card peeks off the right edge to
// signal "there's more" — the hallmark of the Apple TV / App Store
// content shelf.
//
// Two card shapes:
//   - PosterCard: a 2:3 book/audiobook poster with title + author.
//   - RankedPosterCard: same, but with a giant rank numeral (1,2,3…)
//     bleeding off the left for "Top 10"-style rows.

import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, BookAudio } from "lucide-react";
import type { MobileBook } from "./mobile-content";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

// ─── One poster card ───────────────────────────────────────────────

export function PosterCard({
  book, ar, width = 96, rank, onLongPress,
}: {
  book: MobileBook;
  ar: boolean;
  width?: number;
  rank?: number;
  /** When provided, holding the card (~450ms) fires this instead of
   *  navigating — used for the writer's own books to open the
   *  Continue / Duplicate / Rename / Delete action sheet. */
  onLongPress?: () => void;
}) {
  const [, navigate] = useLocation();
  const [imgError, setImgError] = useState(false);
  const genre = ar ? (book.genreAr || book.genre) : book.genre;

  // Long-press plumbing: a timer armed on touchstart; if it fires, the
  // click that follows is swallowed so the tap doesn't also navigate.
  const pressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const clearPress = () => {
    if (pressTimer.current !== null) { window.clearTimeout(pressTimer.current); pressTimer.current = null; }
  };

  return (
    <button
      onClick={() => {
        if (longPressFired.current) { longPressFired.current = false; return; }
        navigate(book.href);
      }}
      onTouchStart={onLongPress ? () => {
        longPressFired.current = false;
        clearPress();
        pressTimer.current = window.setTimeout(() => {
          longPressFired.current = true;
          try { (navigator as any).vibrate?.(12); } catch { /* no haptics */ }
          onLongPress();
        }, 450);
      } : undefined}
      onTouchEnd={onLongPress ? clearPress : undefined}
      onTouchMove={onLongPress ? clearPress : undefined}
      onTouchCancel={onLongPress ? clearPress : undefined}
      onContextMenu={onLongPress ? (e) => { e.preventDefault(); onLongPress(); } : undefined}
      style={{
        ...(onLongPress ? { WebkitTouchCallout: "none" as const, WebkitUserSelect: "none" as const, userSelect: "none" as const } : {}),
        flex: "0 0 auto",
        width,
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        textAlign: ar ? "right" : "left",
        fontFamily: SF,
        display: "flex",
        flexDirection: "column",
        // Rank numerals need room to bleed off the left.
        paddingInlineStart: rank ? 16 : 0,
        position: "relative",
      }}
    >
      {/* Rank numeral */}
      {rank ? (
        <span
          style={{
            position: "absolute",
            insetInlineStart: -4,
            bottom: 40,
            fontSize: 48,
            fontWeight: 800,
            lineHeight: 1,
            color: "rgba(255,255,255,0.92)",
            fontFamily: SF,
            letterSpacing: "-0.04em",
            textShadow: "0 2px 12px rgba(0,0,0,0.6)",
            zIndex: 2,
            pointerEvents: "none",
          }}
        >
          {rank}
        </span>
      ) : null}

      {/* Cover */}
      <div
        style={{
          width: "100%",
          aspectRatio: "2 / 3",
          borderRadius: 12,
          overflow: "hidden",
          background: imgError
            ? "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))"
            : "#111",
          boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
          position: "relative",
        }}
      >
        {!imgError ? (
          <img
            src={book.cover}
            alt={book.title}
            loading="lazy"
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            <BookAudio size={30} color="rgba(255,255,255,0.35)" />
          </div>
        )}
      </div>

      {/* Title + author */}
      <div style={{ marginTop: 8, paddingInlineStart: 2 }}>
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: "#f0efe8",
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {book.title}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.45)",
            marginTop: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {genre || book.author}
        </div>
      </div>
    </button>
  );
}

// ─── The row ───────────────────────────────────────────────────────

export function ContentRow({
  title, books, ar, onSeeAll, ranked = false, cardWidth, onCardLongPress,
}: {
  title: string;
  books: MobileBook[];
  ar: boolean;
  onSeeAll?: () => void;
  ranked?: boolean;
  cardWidth?: number;
  /** Long-press handler per card index (writer's own books row). */
  onCardLongPress?: (index: number) => void;
}) {
  const Chevron = ar ? ChevronLeft : ChevronRight;
  return (
    <section style={{ marginBottom: 26 }}>
      {/* Header */}
      <button
        onClick={onSeeAll}
        disabled={!onSeeAll}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "transparent",
          border: "none",
          padding: "0 16px",
          marginBottom: 12,
          cursor: onSeeAll ? "pointer" : "default",
          fontFamily: SF,
          color: "#fff",
          width: "100%",
          justifyContent: ar ? "flex-end" : "flex-start",
          flexDirection: ar ? "row-reverse" : "row",
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</span>
        {onSeeAll && <Chevron size={20} strokeWidth={2.5} style={{ opacity: 0.7 }} />}
      </button>

      {/* Scroll strip */}
      <div
        dir={ar ? "rtl" : "ltr"}
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          overflowY: "hidden",
          padding: "0 16px 4px",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          scrollSnapType: "x proximity",
        }}
      >
        {books.map((b, i) => (
          <div key={b.href + i} style={{ scrollSnapAlign: "start" }}>
            <PosterCard
              book={b}
              ar={ar}
              rank={ranked ? i + 1 : undefined}
              width={cardWidth}
              onLongPress={onCardLongPress ? () => onCardLongPress(i) : undefined}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
