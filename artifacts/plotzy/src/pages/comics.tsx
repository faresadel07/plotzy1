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
import { StickyNote } from "@/components/mobile/StickyNote";
import { useLanguage } from "@/contexts/language-context";
import { useIsPhone } from "@/hooks/use-is-phone";
import { ContentRow } from "@/components/mobile/ContentRow";
import type { MobileBook } from "@/components/mobile/mobile-content";
import {
  COMICS, COMIC_GENRES, comicCover, comicCoverRemote, comicCoverFallback, type ComicGenre, type ComicIssue,
} from "@/lib/comics";
import { searchComics } from "@/lib/comics-search";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

export default function ComicsPage() {
  const { lang, isRTL } = useLanguage();
  const ar = lang === "ar";
  const isPhone = useIsPhone();

  return (
    <Layout isLanding>
      <SEO
        titleOverride={ar ? "كوميكس كلاسيكيّة · بلوتزي" : "Classic Comics · Plotzy"}
        description="Golden age comic books from the public domain, free to read on Plotzy."
      />
      <div dir={isRTL ? "rtl" : "ltr"} style={{ background: "#f4efe2", minHeight: "100vh", fontFamily: SF, paddingBottom: 40 }}>
        {/* Header */}
        <header style={{ padding: isPhone ? "28px 16px 22px" : "56px 24px 36px", textAlign: isPhone ? "start" : "center", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b7366", marginBottom: 8 }}>
            {ar ? "من العصر الذهبي" : "From the golden age"}
          </div>
          <h1 style={{ fontSize: isPhone ? 28 : "clamp(2rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "#2f2618", lineHeight: 1.1, margin: "0 0 10px" }}>
            {ar ? "كوميكس كلاسيكيّة" : "Classic Comics"}
          </h1>
          <p style={{ fontSize: isPhone ? 13.5 : 15.5, color: "#6d6354", lineHeight: 1.55, maxWidth: 520, margin: isPhone ? "0" : "0 auto" }}>
            {ar
              ? "قصص مصوّرة أصليّة من الأربعينات والخمسينات، ملكيّة عامّة ومجّانيّة بالكامل. اختر عدداً وابدأ التقليب."
              : "Original comic books from the 1940s and 1950s, fully public domain and free. Pick an issue and start flipping."}
          </p>
          <p style={{ fontFamily: ar ? "'Aref Ruqaa', 'Amiri', serif" : "'Caveat', cursive", fontSize: ar ? 15 : 19, color: "#8a8070", margin: "8px 0 0", transform: "rotate(-1deg)", display: "inline-block" }}>
            {ar ? "(ولّع مع أبطال الخمسينات)" : "(heroes from the fifties, still flying)"}
          </p>

          <div aria-hidden style={{ display: "flex", justifyContent: "flex-end", pointerEvents: "none", margin: "-6px 0 0" }}>
            <StickyNote ar={ar} size={90} rot={-5} text={ar ? "اقلب الصفحات بالأسهم أو بالسحب" : "flip pages with arrows or a swipe"} />
          </div>
        </header>

        {isPhone ? <PhoneShelves ar={ar} /> : <DesktopWall ar={ar} />}

        {/* Source note */}
        <p style={{ textAlign: "center", fontSize: 11.5, color: "#8a8070", padding: "26px 20px 0" }}>
          {ar
            ? "الأعداد ملكيّة عامّة وتُعرض من أرشيف الإنترنت."
            : "All issues are public domain, served from the Internet Archive."}
        </p>
      </div>
    </Layout>
  );
}

// ─── Smart search box (shared by both layouts) ─────────────────────

function ComicsSearchBox({ ar, value, onChange, autoFocusable }: {
  ar: boolean;
  value: string;
  onChange: (v: string) => void;
  autoFocusable?: boolean;
}) {
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <Search size={15} color="#7b7366" style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={ar ? "ابحث عن عدد أو سلسلة أو نوع" : "Search issues, series, or genres"}
        inputMode="search"
        enterKeyHint="search"
        autoFocus={autoFocusable}
        style={{
          fontFamily: SF, fontSize: 14.5, color: "#2f2618", width: "100%",
          background: "rgba(66,53,33,0.06)", border: "1px solid rgba(66,53,33,0.15)",
          borderRadius: 14, padding: "12px 40px 12px 40px",
          outline: "none",
        }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label={ar ? "مسح" : "Clear"}
          style={{
            position: "absolute", insetInlineEnd: 8, top: "50%", transform: "translateY(-50%)",
            width: 26, height: 26, borderRadius: 999, border: "none", cursor: "pointer",
            background: "rgba(66,53,33,0.15)", color: "#2f2618", fontSize: 13, lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

// Series suggestion chips: one tap narrows to exactly what you meant.
function SeriesSuggestions({ ar, series, onPick }: {
  ar: boolean;
  series: Array<{ series: string; count: number }>;
  onPick: (s: string) => void;
}) {
  if (series.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "12px 0 2px", scrollbarWidth: "none" }}>
      {series.map((s) => (
        <button
          key={s.series}
          onClick={() => onPick(s.series)}
          style={{
            flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 7,
            padding: "8px 14px", borderRadius: 999, cursor: "pointer",
            background: "rgba(66,53,33,0.10)", border: "1px solid rgba(66,53,33,0.18)",
            color: "#2f2618", fontFamily: SF, fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap",
          }}
        >
          {s.series}
          <span style={{ fontSize: 10.5, color: "#6d6354", fontVariantNumeric: "tabular-nums" }}>
            {s.count} {ar ? "عدداً" : s.count === 1 ? "issue" : "issues"}
          </span>
        </button>
      ))}
    </div>
  );
}

// Compact result card grid shared by the phone results view.
function ResultsGrid({ issues, ar, columns }: { issues: ComicIssue[]; ar: boolean; columns: number }) {
  const [, navigate] = useLocation();
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: "18px 12px" }}>
      {issues.map((c) => (
        <button
          key={c.id}
          onClick={() => navigate(`/comics/${c.id}`)}
          style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "start", fontFamily: SF }}
        >
          <div style={{ width: "100%", aspectRatio: "2 / 3", borderRadius: 9, overflow: "hidden", background: "#fffdf7", boxShadow: "0 6px 18px rgba(0,0,0,0.45)" }}>
            <ComicCoverImg id={c.id} alt={c.title} />
          </div>
          <div style={{ marginTop: 7, fontSize: 12, fontWeight: 600, color: "#2f2618", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
            {c.title}
          </div>
          <div style={{ fontSize: 10.5, color: "#8a8070", marginTop: 1 }}>
            {c.year || c.series}
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Phone: search + genre shelf rows ───────────────────────────────

function PhoneShelves({ ar }: { ar: boolean }) {
  const [, navigate] = useLocation();
  const [q, setQ] = useState("");
  const results = useMemo(() => searchComics(q, 60), [q]);
  const searching = q.trim().length > 0;

  return (
    <div>
      {/* Search bar */}
      <div style={{ padding: "0 16px 6px" }}>
        <ComicsSearchBox ar={ar} value={q} onChange={setQ} />
        {searching && (
          <>
            <SeriesSuggestions ar={ar} series={results.series} onPick={(s) => setQ(s)} />
            <div style={{ fontSize: 11.5, color: "#7b7366", padding: "8px 2px 2px", fontFamily: SF }}>
              {results.total > 0
                ? `${results.total} ${ar ? "نتيجة" : results.total === 1 ? "result" : "results"}`
                : ar ? "لا نتائج. جرّب اسم سلسلة أو نوعاً مثل رعب أو جريمة" : "No results. Try a series name or a genre like horror or crime"}
            </div>
          </>
        )}
      </div>

      {searching ? (
        <div style={{ padding: "10px 16px 0" }}>
          <ResultsGrid issues={results.issues} ar={ar} columns={3} />
        </div>
      ) : (
        COMIC_GENRES.map((g) => {
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
        })
      )}
    </div>
  );
}

// ─── Desktop: filter chips + poster wall ────────────────────────────

function DesktopWall({ ar }: { ar: boolean }) {
  const [, navigate] = useLocation();
  const [genre, setGenre] = useState<ComicGenre | "all">("all");
  const [q, setQ] = useState("");
  const searching = q.trim().length > 0;

  // Ranked, typo-tolerant search over the whole catalogue; the genre
  // chips then narrow whatever the search returned.
  const searchRes = useMemo(() => searchComics(q, 400), [q]);
  const filtered = useMemo(() => {
    const base = searching ? searchRes.issues : COMICS;
    return genre === "all" ? base : base.filter((c) => c.genre === genre);
  }, [searching, searchRes, genre]);

  const chip = (active: boolean): React.CSSProperties => ({
    padding: "8px 16px", borderRadius: 999, cursor: "pointer",
    fontFamily: SF, fontSize: 13, fontWeight: 600,
    background: active ? "#292115" : "rgba(66,53,33,0.06)",
    color: active ? "#f7f2e4" : "#423521",
    border: `1px solid ${active ? "#292115" : "rgba(66,53,33,0.15)"}`,
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
        {COMIC_GENRES.filter((g) => COMICS.some((c) => c.genre === g.id)).map((g) => (
          <button key={g.id} style={chip(genre === g.id)} onClick={() => setGenre(g.id)}>
            {ar ? g.ar : g.en}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ width: 300 }}>
          <ComicsSearchBox ar={ar} value={q} onChange={setQ} />
        </div>
      </div>

      {searching && (
        <SeriesSuggestions ar={ar} series={searchRes.series} onPick={(s) => setQ(s)} />
      )}

      <div style={{ fontSize: 12, color: "#8a8070", margin: "10px 0 16px" }}>
        {filtered.length > 0
          ? `${filtered.length} ${ar ? "عدداً" : filtered.length === 1 ? "issue" : "issues"}`
          : ar ? "لا نتائج. جرّب اسم سلسلة أو نوعاً مثل رعب أو جريمة" : "No results. Try a series name or a genre like horror or crime"}
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
              background: "#fffdf7", boxShadow: "0 8px 26px rgba(0,0,0,0.5)",
              transition: "transform 200ms cubic-bezier(0.2, 0.8, 0.4, 1), box-shadow 200ms ease",
              position: "relative",
            }} className="comic-cover">
              <ComicCoverImg id={c.id} alt={c.title} />
              <ReadingProgress id={c.id} pages={c.pages} ar={ar} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 650, color: "#2f2618", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
                {c.title}
              </div>
              <div style={{ fontSize: 11.5, color: "#8a8070", marginTop: 2 }}>
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

// "Continue reading" indicator: if the reader saved a position for
// this issue, show a chip and a thin progress bar over the cover.
function ReadingProgress({ id, pages, ar }: { id: string; pages: number; ar: boolean }) {
  let pos = 0;
  try { pos = Number(window.localStorage?.getItem(`plotzy_comic_pos_${id}`)) || 0; } catch { /* private mode */ }
  if (pos <= 0) return null;
  const pct = Math.min(100, Math.round(((pos + 1) / pages) * 100));
  return (
    <>
      <span style={{
        position: "absolute", top: 8, insetInlineStart: 8,
        padding: "3px 9px", borderRadius: 999,
        background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)",
        color: "#f7f2e4", fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
      }}>
        {ar ? "تابع القراءة" : "Continue"}
      </span>
      <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, background: "rgba(0,0,0,0.5)" }}>
        <span style={{ display: "block", height: "100%", width: `${pct}%`, background: "#f7f2e4" }} />
      </span>
    </>
  );
}

// Cover with a three-step fallback chain: bundled local file first
// (instant), then the archive's first-page scan, then its thumbnail.
function ComicCoverImg({ id, alt }: { id: string; alt: string }) {
  const [step, setStep] = useState(0);
  const src = step === 0 ? comicCover(id) : step === 1 ? comicCoverRemote(id) : comicCoverFallback(id);
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setStep((s) => Math.min(s + 1, 2))}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
  );
}
