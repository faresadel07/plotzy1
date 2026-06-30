// /audiolibrary — public-domain audiobook discovery.
//
// Single-page browse + search across LibriVox (English) and Internet
// Archive (Arabic). Cards land in a responsive grid; each card opens
// the full player in /audiolibrary/:id.

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/language-context";
import {
  Search, Clock, Headphones, BookAudio, ChevronDown,
  Loader2, ArrowRight, ArrowLeft, ListMusic,
} from "lucide-react";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';
const BG = "#0a0a0a";
const CARD = "rgba(255,255,255,0.04)";
const CARD_HOVER = "rgba(255,255,255,0.07)";
const BORDER = "rgba(255,255,255,0.08)";
const BORDER_STRONG = "rgba(255,255,255,0.16)";
const TEXT = "#f0efe8";
const MUTED = "rgba(255,255,255,0.55)";
const MUTED2 = "rgba(255,255,255,0.35)";

// Hard-split between Arabic and English. The user explicitly asked
// for no merged view so the catalogue UI always shows one language
// at a time. Default is picked from the writer's UI language.
const LANGUAGE_TABS = [
  { id: "arabic",  label: "العربيّة",      labelEn: "Arabic"  },
  { id: "english", label: "English",       labelEn: "English" },
];
const SORTS = [
  { id: "recent",   label: "Recently added", labelAr: "الأحدث" },
  { id: "title",    label: "Title A to Z",   labelAr: "العنوان أ إلى ي" },
  { id: "duration", label: "Longest",        labelAr: "الأطول" },
];

const PAGE_SIZE = 30;

interface AudioBook {
  source: "librivox" | "archive";
  externalId: string;
  bookKey: string;
  title: string;
  author: string | null;
  language: string | null;
  coverUrl: string | null;
  totalDuration: number | null;
  chapterCount: number;
  genres: string[];
}

interface BrowseResp {
  page: number;
  limit: number;
  books: AudioBook[];
}

function fmtDuration(seconds: number | null, ar: boolean): string {
  if (!seconds) return ar ? "—" : "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return ar ? `${h} س ${m} د` : `${h}h ${m}m`;
  return ar ? `${m} دقيقة` : `${m}m`;
}

export default function AudiolibraryPage() {
  const { lang, isRTL } = useLanguage();
  const ar = lang === "ar";
  const [, navigate] = useLocation();

  const [query, setQuery] = useState("");
  // Hard-split: one language at a time, never merged. Default
  // follows the writer's UI language.
  const [language, setLanguage] = useState<string>(ar ? "arabic" : "english");
  const [sort, setSort] = useState<string>("recent");
  const [page, setPage] = useState(0);

  // Debounce the search query so we don't fire on every keystroke.
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(query.trim()), 280);
    return () => clearTimeout(id);
  }, [query]);
  useEffect(() => setPage(0), [debouncedQ, language, sort]);

  const params = useMemo(() => {
    const u = new URLSearchParams();
    if (debouncedQ) u.set("q", debouncedQ);
    u.set("lang", language);
    u.set("sort", sort);
    u.set("page", String(page));
    return u.toString();
  }, [debouncedQ, language, sort, page]);

  const { data, isFetching } = useQuery<BrowseResp>({
    queryKey: ["/api/audiolibrary/browse", params],
    queryFn: async () => {
      const r = await fetch(`/api/audiolibrary/browse?${params}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load audiolibrary");
      return r.json();
    },
    staleTime: 60_000,
  });

  // The proxy doesn't expose a total count (upstream pagination is
  // cursor-based). We show Next/Prev based on whether the current
  // page filled.
  const canGoNext = (data?.books?.length ?? 0) === PAGE_SIZE;

  return (
    <Layout>
      <SEO
        title={ar ? "المكتبة الصوتيّة | بلوتزي" : "Audio Library | Plotzy"}
        description={ar
          ? "آلاف الكتب الصوتيّة المجانيّة والقانونيّة من LibriVox وأرشيف الإنترنت، بالعربيّة والإنجليزيّة."
          : "Thousands of free, public-domain audiobooks from LibriVox and Internet Archive, in Arabic and English."}
      />
      <div dir={isRTL ? "rtl" : "ltr"} style={{ background: BG, color: TEXT, fontFamily: SF, minHeight: "100vh" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px 80px" }}>

          {/* ── Hero ── */}
          <section style={{ marginBottom: 28 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", borderRadius: 999, background: CARD, border: `1px solid ${BORDER}`, marginBottom: 14 }}>
              <Headphones size={12} color={MUTED} />
              <span style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {ar ? "Public Domain" : "Public Domain"}
              </span>
            </div>
            <h1 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-0.025em", margin: "0 0 10px", lineHeight: 1.1 }}>
              {ar ? "المكتبة الصوتيّة" : "Audio Library"}
            </h1>
            <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.65, maxWidth: 700, margin: 0 }}>
              {ar
                ? "آلاف الكتب الصوتيّة المجانيّة. كل ما هنا قانونيّ بالكامل لأنّ النصوص الأصليّة قد دخلت الملك العامّ. تيار مباشر من LibriVox وأرشيف الإنترنت بدون أيّ إعادة استضافة."
                : "Thousands of free audiobooks. Every recording here is fully legal because the underlying texts have entered the public domain. Streamed direct from LibriVox and the Internet Archive with no re-hosting."}
            </p>
          </section>

          {/* ── Language tabs (hard split) ── */}
          <section style={{ marginBottom: 18 }}>
            <div
              role="tablist"
              style={{
                display: "inline-flex",
                gap: 4,
                padding: 4,
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
              }}
            >
              {LANGUAGE_TABS.map((tab) => {
                const active = language === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setLanguage(tab.id)}
                    style={{
                      fontFamily: SF,
                      padding: "10px 22px",
                      borderRadius: 10,
                      fontSize: 13.5,
                      fontWeight: 700,
                      letterSpacing: "-0.005em",
                      background: active ? TEXT : "transparent",
                      color: active ? "#000" : MUTED,
                      border: "none",
                      cursor: "pointer",
                      transition: "all 160ms ease",
                    }}
                  >
                    {tab.id === "arabic" ? "العربيّة" : "English"}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Search + sort (no source / no language; tabs above own language) ── */}
          <section
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              padding: "14px 16px",
              marginBottom: 22,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
              <Search size={14} color={MUTED} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={ar ? "ابحث بعنوان أو مؤلف..." : "Search by title or author..."}
                style={{
                  fontFamily: SF, width: "100%", padding: "10px 12px 10px 34px",
                  fontSize: 13, color: TEXT, background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${BORDER}`, borderRadius: 10, outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <SelectChip icon={<ListMusic size={12} />} value={sort} onChange={setSort} options={SORTS.map((s) => ({ id: s.id, label: ar ? s.labelAr : s.label }))} />
          </section>

          {/* ── Stats + pager ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{ fontSize: 12.5, color: MUTED, margin: 0 }}>
              {isFetching && !data
                ? (ar ? "جارٍ التحميل..." : "Loading...")
                : (
                  <>
                    {ar ? "الصفحة" : "Page"} <span style={{ fontWeight: 700, color: TEXT, fontVariantNumeric: "tabular-nums" }}>{page + 1}</span>
                    {" · "}
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{data?.books?.length ?? 0}</span>{" "}
                    {ar ? "كتاب على هذه الصفحة" : `book${(data?.books?.length ?? 0) === 1 ? "" : "s"}`}
                  </>
                )}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || isFetching}
                style={iconBtn(page === 0 || isFetching)}
                aria-label={ar ? "السابق" : "Previous"}
              >
                {isRTL ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!canGoNext || isFetching}
                style={iconBtn(!canGoNext || isFetching)}
                aria-label={ar ? "التالي" : "Next"}
              >
                {isRTL ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
              </button>
            </div>
          </div>

          {/* ── Grid ── */}
          {isFetching && !data ? (
            <SkeletonGrid />
          ) : !data || data.books.length === 0 ? (
            <EmptyState ar={ar} hasQuery={!!debouncedQ} />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {data.books.map((b) => (
                <BookCard
                  key={b.bookKey}
                  book={b}
                  ar={ar}
                  onOpen={() => navigate(`/audiolibrary/${b.source}/${encodeURIComponent(b.externalId)}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

// ─── Card ──────────────────────────────────────────────────────────

function BookCard({ book, ar, onOpen }: { book: AudioBook; ar: boolean; onOpen: () => void }) {
  const [imgError, setImgError] = useState(false);
  return (
    <button
      onClick={onOpen}
      style={{
        fontFamily: SF,
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 0,
        cursor: "pointer",
        textAlign: "start",
        color: TEXT,
        overflow: "hidden",
        transition: "all 160ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = CARD_HOVER;
        e.currentTarget.style.borderColor = BORDER_STRONG;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = CARD;
        e.currentTarget.style.borderColor = BORDER;
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          aspectRatio: "1 / 1",
          background: imgError || !book.coverUrl
            ? "linear-gradient(135deg, rgba(124,108,247,0.20), rgba(56,132,255,0.15))"
            : "#000",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {!imgError && book.coverUrl && (
          <img
            src={book.coverUrl}
            alt={book.title}
            loading="lazy"
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
        {(imgError || !book.coverUrl) && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookAudio size={42} color="rgba(255,255,255,0.35)" />
          </div>
        )}
        {/* Duration badge */}
        {book.totalDuration ? (
          <div
            style={{
              position: "absolute",
              top: 8,
              insetInlineEnd: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              borderRadius: 999,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(8px)",
              color: "#fff",
              fontSize: 10.5,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <Clock size={10} />
            {fmtDuration(book.totalDuration, ar)}
          </div>
        ) : null}
      </div>
      <div style={{ padding: "12px 14px 14px" }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: TEXT,
            lineHeight: 1.35,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            marginBottom: 4,
            letterSpacing: "-0.005em",
          }}
        >
          {book.title}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: MUTED,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {book.author || (ar ? "مؤلّف مجهول" : "Unknown author")}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 10,
            fontSize: 10.5,
            color: MUTED2,
          }}
        >
          <span style={{ textTransform: "capitalize" }}>{book.source}</span>
          <span>
            {book.chapterCount} {ar ? "فصل" : "ch"}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Empty + skeleton ──────────────────────────────────────────────

function EmptyState({ ar, hasQuery }: { ar: boolean; hasQuery: boolean }) {
  return (
    <div
      style={{
        background: CARD,
        border: `1px dashed ${BORDER}`,
        borderRadius: 18,
        padding: "60px 24px",
        textAlign: "center",
        color: MUTED2,
      }}
    >
      <BookAudio size={32} color={MUTED2} style={{ marginBottom: 14 }} />
      <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, marginBottom: 6 }}>
        {hasQuery ? (ar ? "لا نتائج" : "No results") : (ar ? "قريباً..." : "Coming soon...")}
      </div>
      <div style={{ fontSize: 13, color: MUTED, maxWidth: 360, margin: "0 auto", lineHeight: 1.6 }}>
        {hasQuery
          ? (ar ? "جرّب كلمات مختلفة أو غيّر اللغة." : "Try different keywords or change the language filter.")
          : (ar ? "نزامن المكتبة الآن. عد بعد دقيقتين." : "The library is syncing for the first time. Check back in a moment.")}
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", opacity: 0.5 }}
        >
          <div style={{ aspectRatio: "1 / 1", background: "rgba(255,255,255,0.05)" }} />
          <div style={{ padding: "12px 14px" }}>
            <div style={{ height: 12, width: "85%", background: "rgba(255,255,255,0.08)", borderRadius: 4, marginBottom: 8 }} />
            <div style={{ height: 10, width: "60%", background: "rgba(255,255,255,0.05)", borderRadius: 4 }} />
          </div>
        </div>
      ))}
      <Loader2 size={18} className="animate-spin" style={{ position: "absolute", opacity: 0 }} />
    </div>
  );
}

// ─── Select chip ───────────────────────────────────────────────────

function SelectChip({
  icon, value, onChange, options,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ id: string; label: string }>;
}) {
  return (
    <div style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: MUTED, pointerEvents: "none" }}>{icon}</span>
      <ChevronDown size={11} color={MUTED2} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          fontFamily: SF,
          appearance: "none",
          WebkitAppearance: "none",
          padding: "10px 30px 10px 30px",
          fontSize: 12.5,
          color: TEXT,
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          outline: "none",
          cursor: "pointer",
          minWidth: 150,
        }}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id} style={{ background: "#1a1a1a" }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function iconBtn(disabled: boolean): React.CSSProperties {
  return {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: CARD,
    border: `1px solid ${BORDER}`,
    color: disabled ? MUTED2 : MUTED,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: SF,
    opacity: disabled ? 0.4 : 1,
  };
}
