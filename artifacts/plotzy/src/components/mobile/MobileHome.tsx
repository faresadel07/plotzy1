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

import { useState } from "react";
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
import { PAPER, ESPRESSO, PAPER_ON_DARK, BORDER_PAPER, SPECKLE } from "./palette";
import { LibraryShowcase } from "./LibraryShowcase";
import { SnippetsFan } from "./SnippetsFan";
import { ensureHomeFonts } from "./fonts";
import { useEffect } from "react";

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
  useEffect(() => { ensureHomeFonts(); }, []);

  const [bookSheet, setBookSheet] = useState<{ id: number; title: string } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const closeSheet = () => { setBookSheet(null); setRenaming(false); setConfirmDelete(false); };

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
        background: PAPER,
        minHeight: "100vh",
        fontFamily: SF,
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 40px)",
        ...SPECKLE,
      }}
    >
      {/* Tidy paper hero: headline, actions, contained collage card,
          stats. No pinning, no scroll choreography. */}
      <MobileHero ar={ar} onStartWriting={onStartWriting} onOpenCourse={() => navigate("/course")} />

      {/* Quick destinations — app-style chips under the hero */}
      <div
        dir={ar ? "rtl" : "ltr"}
        style={{ display: "flex", gap: 8, overflowX: "auto", padding: "16px 16px 4px", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {(ar
          ? [["الكورس المجاني", "/course"], ["كتب صوتية", "/audiolibrary"], ["كوميكس", "/comics"], ["المكتبة العربية", "/discover?src=hindawi"], ["مكتبة المجتمع", "/library"]]
          : [["Free course", "/course"], ["Audiobooks", "/audiolibrary"], ["Comics", "/comics"], ["Arabic library", "/discover?src=hindawi"], ["Community", "/library"]]
        ).map(([label, href]) => (
          <button
            key={href}
            onClick={() => navigate(href)}
            style={{
              flex: "0 0 auto", padding: "9px 16px", borderRadius: 999,
              background: "#fffdf7", border: "1px solid rgba(66,53,33,0.18)",
              color: "#423521", fontSize: 12.5, fontWeight: 600, fontFamily: SF,
              cursor: "pointer", boxShadow: "0 1px 2px rgba(66,53,33,0.05)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content rows on the same paper surface */}
      <div style={{ position: "relative", paddingTop: 18 }}>
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

        {/* ── Library showcases, Sudowrite-plugins style: tilted cover
            fans + serif headline + green CTA, alternating espresso and
            deep paper for rhythm. ── */}
        <LibraryShowcase
          ar={ar}
          dark
          kicker="Audio Library"
          kickerAr="المكتبة الصوتية"
          title="19,000 audiobooks, free"
          titleAr="19 ألف كتاب مسموع، ببلاش"
          sub="Novels and classics read aloud by real voices from LibriVox. Listen while you walk, drive, or close your eyes."
          subAr="روايات وكلاسيكيات مقروءة بأصوات حقيقية من LibriVox. اسمع وأنت ماشي، سايق، أو مغمّض عينيك."
          cta="Open the audio library"
          ctaAr="افتح المكتبة الصوتية"
          href="/audiolibrary"
          covers={[AUDIO_BOOKS[1].cover, AUDIO_BOOKS[0].cover, AUDIO_BOOKS[3].cover]}
        />

        <LibraryShowcase
          ar={ar}
          kicker="English Classics"
          kickerAr="كلاسيكيات إنجليزية"
          title="Every classic you postponed"
          titleAr="كل كلاسيكية أجّلت قراءتها"
          sub="Pride and Prejudice, Frankenstein, Dracula and more. Complete, free, and in a reader that is easy on the eyes."
          subAr="كبرياء وهوى، فرانكنشتاين، دراكولا وغيرها. كاملة ومجانية وبقارئ مريح للعين."
          cta="Browse the classics"
          ctaAr="تصفح الكلاسيكيات"
          href="/discover"
          covers={[ENGLISH_BOOKS[2].cover, ENGLISH_BOOKS[0].cover, ENGLISH_BOOKS[3].cover]}
        />

        {COMICS.length > 2 && (
          <LibraryShowcase
            ar={ar}
            dark
            kicker="Classic Comics"
            kickerAr="كوميكس كلاسيكية"
            title="1,300 comics from the golden age"
            titleAr="1300 كوميكس من العصر الذهبي"
            sub="Adventure, sci-fi, and heroes from the fifties, in full color pages, page by page."
            subAr="مغامرات وخيال علمي وأبطال من الخمسينات، بصفحات ملونة كاملة، صفحة صفحة."
            cta="Open the comics"
            ctaAr="افتح الكوميكس"
            href="/comics"
            covers={[comicCover(COMICS[1].id), comicCover(COMICS[0].id), comicCover(COMICS[2].id)]}
          />
        )}

        <LibraryShowcase
          ar={ar}
          kicker="Arabic Library"
          kickerAr="المكتبة العربية"
          title="A full Arabic heritage library"
          titleAr="تراث عربي كامل، بين إيديك"
          sub="Taha Hussein, Jurji Zaydan, al-Maalouf and more. The full Hindawi library inside Plotzy."
          subAr="طه حسين، جرجي زيدان، والمعلوف وغيرهم. مكتبة هنداوي كاملة داخل بلوتزي."
          cta="Open the Arabic library"
          ctaAr="افتح المكتبة العربية"
          href="/discover?src=hindawi"
          covers={[ARABIC_BOOKS[1].cover, ARABIC_BOOKS[0].cover, ARABIC_BOOKS[4].cover]}
        />

        {/* AI writing studio banner with official model logos —
            opens the book-creation wizard directly. */}
        <AiWriteBanner ar={ar} onStart={onStartWriting} />

        {/* Proof: scattered prose slips Claude actually helped write */}
        <SnippetsFan ar={ar} />

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
            background: ESPRESSO, borderRadius: "24px 24px 0 0",
            padding: "10px 20px calc(env(safe-area-inset-bottom, 0px) + 22px)",
            boxShadow: "0 -20px 60px rgba(41,33,21,0.55)", fontFamily: SF,
          }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "4px 0 12px" }}>
              <div style={{ width: 40, height: 5, borderRadius: 999, background: "rgba(244,239,226,0.18)" }} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ flex: 1, fontSize: 16, fontWeight: 800, color: PAPER_ON_DARK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {bookSheet.title}
              </span>
              <button onClick={closeSheet} aria-label={ar ? "إغلاق" : "Close"} style={{ width: 30, height: 30, borderRadius: 999, border: "none", cursor: "pointer", background: "rgba(244,239,226,0.1)", color: PAPER_ON_DARK, display: "grid", placeItems: "center", flexShrink: 0 }}>
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
                  style={{ flex: 1, minWidth: 0, background: "rgba(244,239,226,0.07)", border: `1px solid ${BORDER_PAPER}`, borderRadius: 12, padding: "12px 14px", color: PAPER_ON_DARK, fontSize: 14.5, outline: "none", fontFamily: SF }}
                />
                <button
                  onClick={() => {
                    const v = renameValue.trim();
                    if (!v) { setRenaming(false); return; }
                    updateBook.mutate({ id: bookSheet.id, title: v }, { onSettled: closeSheet });
                  }}
                  style={{ flexShrink: 0, background: PAPER, color: "#2f2618", border: "none", borderRadius: 12, padding: "0 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
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
                      background: item.primary ? PAPER : item.danger ? "rgba(239,68,68,0.10)" : "rgba(244,239,226,0.06)",
                      border: `1px solid ${item.danger ? "rgba(239,68,68,0.30)" : BORDER_PAPER}`,
                      borderRadius: 14, padding: "14px 16px", marginBottom: 8,
                      color: item.primary ? "#2f2618" : item.danger ? "#f8a4a4" : PAPER_ON_DARK,
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
