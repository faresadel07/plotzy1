// The Apple-TV-style mobile home screen.
//
// Renders ONLY on phones (the caller in home.tsx gates on useIsPhone).
// Desktop/tablet keep the existing landing page untouched.
//
// Structure, top to bottom:
//   1. MobileHero — rotating collage banner (fades/scales as you scroll)
//   2. Continue Writing — the writer's own in-progress books (if any)
//   3. Featured Audiobooks — LibriVox
//   4. English Classics — Gutenberg
//   5. Arabic Library — Hindawi
//   6. AI Writing Studio banner (official model logos)
//   7. Community shelf placeholder → Community Library
//   8. Donate banner
//   9. bottom spacer so the floating tab bar never covers content

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { PenLine, Copy, Pencil, Trash2, X } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useBooks, useTrashBook, useDuplicateBook, useUpdateBook } from "@/hooks/use-books";
import { MobileHero } from "./MobileHero";
import { ContentRow } from "./ContentRow";
import { AiWriteBanner, DevicesBanner, BookJourneyGrid } from "./FeatureBanners";
import { CourseCoverMobile } from "./CourseCoverMobile";
import { TestimonialsMobile } from "@/components/testimonials/TestimonialsMobile";
import { AUDIO_BOOKS, ENGLISH_BOOKS, ARABIC_BOOKS, type MobileBook } from "./mobile-content";
import { COMICS, comicCover } from "@/lib/comics";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export function MobileHome({ onStartWriting }: { onStartWriting: () => void }) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [, navigate] = useLocation();
  const { data: books } = useBooks();
  const trashBook = useTrashBook();
  const duplicateBook = useDuplicateBook();
  const updateBook = useUpdateBook();

  // Long-press action sheet for the writer's own books (Continue
  // Writing row): continue / duplicate / rename / delete — the same
  // actions the desktop shelf shows on hover.
  const [bookSheet, setBookSheet] = useState<{ id: number; title: string } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const closeSheet = () => { setBookSheet(null); setRenaming(false); setConfirmDelete(false); };

  // Hero height captured ONCE in pixels. Using px (not vh) means the
  // mobile address bar showing/hiding never resizes the hero mid-scroll
  // — the root cause of the black gap / jumps. Only re-measure on a
  // real orientation change, never on scroll-driven viewport changes.
  const [heroH, setHeroH] = useState(() => (typeof window !== "undefined" ? window.innerHeight : 800));
  useEffect(() => {
    const onOrient = () => setHeroH(window.innerHeight);
    window.addEventListener("orientationchange", onOrient);
    return () => window.removeEventListener("orientationchange", onOrient);
  }, []);

  // The writer's own books → "Continue Writing" row.
  const myBooks: MobileBook[] = (books ?? [])
    .slice(0, 12)
    .map((b: any) => ({
      title: b.title || (ar ? "بدون عنوان" : "Untitled"),
      author: ar ? "متابعة" : "Continue",
      cover: b.coverImage || "",
      href: `/books/${b.id}`,
      genre: ar ? "كتابك" : "Your book",
      genreAr: "كتابك",
    }));

  return (
    <div
      style={{
        background: "#000",
        minHeight: "100vh",
        fontFamily: SF,
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 40px)",
      }}
    >
      {/* Hero wrapper — fixed PX height (never vh) = the sticky pin
          range. The MobileHero inside pins and collapses (fade + scale)
          as you scroll, while the content below slides up over it. */}
      <div style={{ position: "relative", height: heroH, zIndex: 1 }}>
        <MobileHero ar={ar} onStartWriting={onStartWriting} heroHeight={heroH} />
      </div>

      {/* Content rows — SOLID black background + higher z-index. Starts
          immediately after the hero (no empty black gap) and slides up
          to fully cover the pinned hero (no bleed-through, no overlap,
          correct stacking). */}
      <div style={{ position: "relative", zIndex: 2, background: "#000", paddingTop: 16 }}>
        {myBooks.length > 0 && (
          <ContentRow
            title={ar ? "تابع الكتابة" : "Continue Writing"}
            books={myBooks}
            ar={ar}
            onSeeAll={() => navigate("/dashboard")}
            onCardLongPress={(i) => {
              const b = (books ?? [])[i];
              if (!b) return;
              setRenaming(false);
              setConfirmDelete(false);
              setRenameValue(b.title || "");
              setBookSheet({ id: b.id, title: b.title || (ar ? "بدون عنوان" : "Untitled") });
            }}
          />
        )}

        <ContentRow
          title={ar ? "كتب صوتيّة مميّزة" : "Featured Audiobooks"}
          books={AUDIO_BOOKS}
          ar={ar}
          ranked
          onSeeAll={() => navigate("/audiolibrary")}
        />

        <ContentRow
          title={ar ? "كلاسيكيّات إنجليزيّة" : "English Classics"}
          books={ENGLISH_BOOKS}
          ar={ar}
          onSeeAll={() => navigate("/discover")}
        />

        <ContentRow
          title={ar ? "المكتبة العربيّة" : "Arabic Library"}
          books={ARABIC_BOOKS}
          ar={ar}
          onSeeAll={() => navigate("/discover?src=hindawi")}
        />

        {/* Classic comics teaser shelf — clearly labelled as comics. */}
        {COMICS.length > 0 && (
          <ContentRow
            title={ar ? "كوميكس كلاسيكيّة" : "Classic Comics"}
            books={COMICS.slice(0, 10).map((c): MobileBook => ({
              title: c.title,
              author: c.series,
              cover: comicCover(c.id),
              href: `/comics/${c.id}`,
              genre: ar ? "كوميكس" : "Comics",
              genreAr: "كوميكس",
            }))}
            ar={ar}
            cardWidth={108}
            onSeeAll={() => navigate("/comics")}
          />
        )}

        {/* AI writing studio banner with official model logos —
            opens the book-creation wizard directly. */}
        <AiWriteBanner ar={ar} onStart={onStartWriting} />

        {/* Everything your book needs — voice, publish, audiobook,
            co-writing, plus the Writer Protection trust line. */}
        <BookJourneyGrid ar={ar} onStartWriting={onStartWriting} />

        {/* Community shelf — reuse English + Arabic mix as a teaser row,
            linking to the real community library. */}
        <ContentRow
          title={ar ? "من المجتمع" : "From the Community"}
          books={[...ARABIC_BOOKS.slice(4), ...ENGLISH_BOOKS.slice(4)]}
          ar={ar}
          onSeeAll={() => navigate("/library")}
        />

        {/* Social proof — real early testers, in their own words */}
        <TestimonialsMobile ar={ar} />

        {/* Free writing course, presented as its own book cover */}
        <CourseCoverMobile ar={ar} />

        {/* Closing showcase — write anywhere (iPad + laptop) */}
        <DevicesBanner ar={ar} />
      </div>

      {/* ── Book action sheet (long-press on a Continue Writing card) ── */}
      {bookSheet && (
        <div style={{ position: "fixed", inset: 0, zIndex: 90 }} dir={ar ? "rtl" : "ltr"}>
          <div onClick={closeSheet} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
          <div style={{
            position: "absolute", left: 0, right: 0, bottom: 0,
            background: "#17171c", borderRadius: "24px 24px 0 0",
            padding: "10px 20px calc(env(safe-area-inset-bottom, 0px) + 22px)",
            boxShadow: "0 -20px 60px rgba(0,0,0,0.55)", fontFamily: SF,
          }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "4px 0 12px" }}>
              <div style={{ width: 40, height: 5, borderRadius: 999, background: "rgba(255,255,255,0.16)" }} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ flex: 1, fontSize: 16, fontWeight: 800, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {bookSheet.title}
              </span>
              <button onClick={closeSheet} aria-label={ar ? "إغلاق" : "Close"} style={{ width: 30, height: 30, borderRadius: 999, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.08)", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <X size={15} />
              </button>
            </div>

            {renaming ? (
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") setRenaming(false); }}
                  placeholder={ar ? "اسم الكتاب" : "Book title"}
                  style={{ flex: 1, minWidth: 0, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "12px 14px", color: "#fff", fontSize: 14.5, outline: "none", fontFamily: SF }}
                />
                <button
                  onClick={() => {
                    const v = renameValue.trim();
                    if (!v) { setRenaming(false); return; }
                    updateBook.mutate({ id: bookSheet.id, title: v }, { onSettled: closeSheet });
                  }}
                  style={{ flexShrink: 0, background: "#fff", color: "#000", border: "none", borderRadius: 12, padding: "0 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                >
                  {ar ? "حفظ" : "Save"}
                </button>
              </div>
            ) : (
              <>
                {[
                  {
                    icon: <PenLine size={17} />, danger: false, primary: true,
                    label: ar ? "متابعة الكتابة" : "Continue writing",
                    onTap: () => { closeSheet(); navigate(`/books/${bookSheet.id}`); },
                  },
                  {
                    icon: <Copy size={17} />, danger: false, primary: false,
                    label: ar ? "نسخ الكتاب" : "Duplicate",
                    onTap: () => { duplicateBook.mutate(bookSheet.id, { onSettled: closeSheet }); },
                  },
                  {
                    icon: <Pencil size={17} />, danger: false, primary: false,
                    label: ar ? "إعادة تسمية" : "Rename",
                    onTap: () => setRenaming(true),
                  },
                  {
                    icon: <Trash2 size={17} />, danger: true, primary: false,
                    label: confirmDelete
                      ? (ar ? "اضغط مرة أخرى للتأكيد" : "Tap again to confirm")
                      : (ar ? "نقل إلى المهملات" : "Move to trash"),
                    onTap: () => {
                      if (!confirmDelete) { setConfirmDelete(true); return; }
                      trashBook.mutate(bookSheet.id, { onSettled: closeSheet });
                    },
                  },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={item.onTap}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 12,
                      background: item.primary ? "#fff" : item.danger ? "rgba(239,68,68,0.10)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${item.danger ? "rgba(239,68,68,0.30)" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: 14, padding: "14px 16px", marginBottom: 8,
                      color: item.primary ? "#000" : item.danger ? "#f87171" : "#eee",
                      fontSize: 14.5, fontWeight: item.primary ? 700 : 600, cursor: "pointer", fontFamily: SF,
                    }}
                  >
                    {item.icon}
                    <span style={{ flex: 1, textAlign: "start" }}>{item.label}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
