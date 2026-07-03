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
import { useLanguage } from "@/contexts/language-context";
import { useBooks } from "@/hooks/use-books";
import { MobileHero } from "./MobileHero";
import { ContentRow } from "./ContentRow";
import { AiWriteBanner, DevicesBanner } from "./FeatureBanners";
import { CourseCoverMobile } from "./CourseCoverMobile";
import { TestimonialsMobile } from "@/components/testimonials/TestimonialsMobile";
import { AUDIO_BOOKS, ENGLISH_BOOKS, ARABIC_BOOKS, type MobileBook } from "./mobile-content";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export function MobileHome({ onStartWriting }: { onStartWriting: () => void }) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [, navigate] = useLocation();
  const { data: books } = useBooks();

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
    </div>
  );
}
