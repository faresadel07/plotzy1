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

import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/language-context";
import { useBooks } from "@/hooks/use-books";
import { MobileHero } from "./MobileHero";
import { ContentRow } from "./ContentRow";
import { AiWriteBanner, DonateBanner, CourseBanner } from "./FeatureBanners";
import { AUDIO_BOOKS, ENGLISH_BOOKS, ARABIC_BOOKS, type MobileBook } from "./mobile-content";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export function MobileHome({ onStartWriting }: { onStartWriting: () => void }) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [, navigate] = useLocation();
  const { data: books } = useBooks();

  // Fade + gently scale the hero as the page scrolls, so it recedes
  // into the collage — the "transform on scroll" the writer asked for.
  const [scrollY, setScrollY] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const heroOpacity = Math.max(0, 1 - scrollY / 260);
  const heroScale = Math.max(0.9, 1 - scrollY / 2600);

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
      ref={rootRef}
      style={{
        background: "#000",
        minHeight: "100vh",
        fontFamily: SF,
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 40px)",
      }}
    >
      {/* Hero (transforms on scroll) */}
      <div
        style={{
          transform: `scale(${heroScale})`,
          opacity: heroOpacity,
          transformOrigin: "top center",
          transition: "opacity 60ms linear",
          pointerEvents: heroOpacity < 0.15 ? "none" : "auto",
        }}
      >
        <MobileHero ar={ar} onStartWriting={onStartWriting} />
      </div>

      {/* Content rows */}
      <div style={{ marginTop: 8 }}>
        {myBooks.length > 0 && (
          <ContentRow
            title={ar ? "تابع الكتابة" : "Continue Writing"}
            books={myBooks}
            ar={ar}
            onSeeAll={() => navigate("/dashboard")}
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

        {/* AI writing studio banner with official model logos —
            opens the book-creation wizard directly. */}
        <AiWriteBanner ar={ar} onStart={onStartWriting} />

        {/* Free writing course */}
        <CourseBanner ar={ar} />

        {/* Community shelf — reuse English + Arabic mix as a teaser row,
            linking to the real community library. */}
        <ContentRow
          title={ar ? "من المجتمع" : "From the Community"}
          books={[...ARABIC_BOOKS.slice(4), ...ENGLISH_BOOKS.slice(4)]}
          ar={ar}
          onSeeAll={() => navigate("/library")}
        />

        {/* Donate */}
        <DonateBanner ar={ar} />
      </div>
    </div>
  );
}
