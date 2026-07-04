// Classic Comics library. Two deliberately different layouts:
//   Phone   — Apple-TV shelf rows per genre (reuses the mobile
//             ContentRow / PosterCard language of the home screen).
//   Desktop — a poster wall: genre filter chips + search over a
//             responsive grid of large covers with hover lift.
//
// All issues are golden-age public domain, streamed from the Internet
// Archive; the covers use the real first-page scan (crisp 400px) with
// the IA thumbnail as an automatic fallback.

import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Search } from "lucide-react";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/language-context";
import { useIsPhone } from "@/hooks/use-is-phone";
import { ContentRow } from "@/components/mobile/ContentRow";
import type { MobileBook } from "@/components/mobile/mobile-content";
import {
  COMICS, COMIC_GENRES, comicCover, comicCoverFallback, type ComicGenre,
} from "@/lib/comics";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export default function ComicsPage() {
  const { lang, isRTL } = useLanguage();
  const ar = lang === "ar";
  const isPhone = useIsPhone();

  return (
    <Layout isLanding darkNav>
      <SEO
        titleOverride={ar ? "كوميكس كلاسيكيّة · بلوتزي" : "Classic Comics · Plotzy"}
        description="Golden age comic books from the public domain, free to read on Plotzy."
      />
      <div dir={isRTL ? "rtl" : "ltr"} style={{ background: "#000", minHeight: "100vh", fontFamily: SF, paddingBottom: 40 }}>
        {/* Header */}
        <header style={{ padding: isPhone ? "28px 16px 22px" : "56px 24px 36px", textAlign: isPhone ? "start" : "center", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>
            {ar ? "من العصر الذهبي" : "From the golden age"}
          </div>
          <h1 style={{ fontSize: isPhone ? 28 : "clamp(2rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "#fff", lineHeight: 1.1, margin: "0 0 10px" }}>
            {ar ? "كوميكس كلاسيكيّة" : "Classic Comics"}
          </h1>
          <p style={{ fontSize: isPhone ? 13.5 : 15.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.55, maxWidth: 520, margin: isPhone ? "0" : "0 auto" }}>
            {ar
              ? "قصص مصوّرة أصليّة من الأربعينات والخمسينات، ملكيّة عامّة ومجّانيّة بالكامل. اختر عدداً وابدأ التقليب."
              : "Original comic books from the 1940s and 1950s, fully public domain and free. Pick an issue and start flipping."}
          </p>
        </header>

        {isPhone ? <PhoneShelves ar={ar} /> : <DesktopWall ar={ar} />}

        {/* Source note */}
        <p style={{ textAlign: "center", fontSize: 11.5, color: "rgba(255,255,255,0.3)", padding: "26px 20px 0" }}>
          {ar
            ? "الأعداد ملكيّة عامّة وتُعرض من أرشيف الإنترنت."
            : "All issues are public domain, served from the Internet Archive."}
        </p>
      </div>
    </Layout>
  );
}

// ─── Phone: genre shelf rows ────────────────────────────────────────

function PhoneShelves({ ar }: { ar: boolean }) {
  const [, navigate] = useLocation();
  return (
    <div>
      {COMIC_GENRES.map((g) => {
        const items = COMICS.filter((c) => c.genre === g.id);
        if (items.length === 0) return null;
        const books: MobileBook[] = items.map((c) => ({
          title: c.title,
          author: c.series,
          cover: comicCover(c.id),
          href: `/comics/${c.id}`,
          genre: c.year || (ar ? "كوميكس" : "Comics"),
          genreAr: c.year || "كوميكس",
        }));
        return (
          <ContentRow
            key={g.id}
            title={ar ? g.ar : g.en}
            books={books}
            ar={ar}
            cardWidth={108}
            onSeeAll={() => navigate("/comics")}
          />
        );
      })}
    </div>
  );
}

// ─── Desktop: filter chips + poster wall ────────────────────────────

function DesktopWall({ ar }: { ar: boolean }) {
  const [, navigate] = useLocation();
  const [genre, setGenre] = useState<ComicGenre | "all">("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return COMICS.filter((c) =>
      (genre === "all" || c.genre === genre) &&
      (!query || c.title.toLowerCase().includes(query) || c.series.toLowerCase().includes(query)),
    );
  }, [genre, q]);

  const chip = (active: boolean): React.CSSProperties => ({
    padding: "8px 16px", borderRadius: 999, cursor: "pointer",
    fontFamily: SF, fontSize: 13, fontWeight: 600,
    background: active ? "#fff" : "rgba(255,255,255,0.06)",
    color: active ? "#000" : "rgba(255,255,255,0.75)",
    border: `1px solid ${active ? "#fff" : "rgba(255,255,255,0.12)"}`,
    transition: "all 140ms ease",
    whiteSpace: "nowrap",
  });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 28 }}>
        <button style={chip(genre === "all")} onClick={() => setGenre("all")}>
          {ar ? "الكل" : "All"}
        </button>
        {COMIC_GENRES.map((g) => (
          <button key={g.id} style={chip(genre === g.id)} onClick={() => setGenre(g.id)}>
            {ar ? g.ar : g.en}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ position: "relative" }}>
          <Search size={14} color="rgba(255,255,255,0.35)" style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={ar ? "ابحث في الأعداد" : "Search issues"}
            style={{
              fontFamily: SF, fontSize: 13, color: "#fff",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 999, padding: "9px 14px", paddingInlineStart: 34,
              outline: "none", width: 220,
            }}
          />
        </div>
      </div>

      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>
        {filtered.length} {ar ? "عدداً" : filtered.length === 1 ? "issue" : "issues"}
      </div>

      {/* Poster wall */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(178px, 1fr))", gap: "26px 20px" }}>
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate(`/comics/${c.id}`)}
            className="comic-card"
            style={{
              background: "transparent", border: "none", padding: 0, cursor: "pointer",
              textAlign: "start", fontFamily: SF, display: "flex", flexDirection: "column", gap: 9,
            }}
          >
            <div style={{
              width: "100%", aspectRatio: "2 / 3", borderRadius: 10, overflow: "hidden",
              background: "#141416", boxShadow: "0 8px 26px rgba(0,0,0,0.5)",
              transition: "transform 200ms cubic-bezier(0.2, 0.8, 0.4, 1), box-shadow 200ms ease",
            }} className="comic-cover">
              <ComicCoverImg id={c.id} alt={c.title} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 650, color: "#f0efe8", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
                {c.title}
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.42)", marginTop: 2 }}>
                {c.year ? `${c.year} · ` : ""}{c.pages} {ar ? "صفحة" : "pages"}
              </div>
            </div>
          </button>
        ))}
      </div>

      <style>{`
        .comic-card:hover .comic-cover {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 18px 44px rgba(0,0,0,0.65);
        }
      `}</style>
    </div>
  );
}

// Cover with automatic fallback: crisp first-page scan first, IA
// thumbnail if that ever fails.
function ComicCoverImg({ id, alt }: { id: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      src={failed ? comicCoverFallback(id) : comicCover(id)}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
  );
}
