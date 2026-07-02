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

import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/language-context";
import { useBooks } from "@/hooks/use-books";
import { MobileHero } from "./MobileHero";
import { ContentRow } from "./ContentRow";
import { AiWriteBanner, DonateBanner, CourseBanner, DevicesBanner } from "./FeatureBanners";
import { AUDIO_BOOKS, ENGLISH_BOOKS, ARABIC_BOOKS, type MobileBook } from "./mobile-content";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export function MobileHome({ onStartWriting }: { onStartWriting: () => void }) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [, navigate] = useLocation();
  const { data: books } = useBooks();

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
      {/* Hero — scrolls up naturally with the content, exactly like
          Apple TV. No fade/transform (that left an empty black gap). */}
      <MobileHero ar={ar} onStartWriting={onStartWriting} />

      {/* Content rows — a small gap so the first row's header + card
          tops peek below the hero, inviting the scroll (Apple TV). */}
      <div style={{ marginTop: 14 }}>
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

        {/* Closing showcase — write anywhere (iPad + laptop) */}
        <DevicesBanner ar={ar} />
      </div>
    </div>
  );
}
