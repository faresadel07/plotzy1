// /audiolibrary — public-domain audiobook discovery (English, LibriVox).
//
// Layout:
//   1. Hero
//   2. Featured strip — curated famous classics (horizontal scroll)
//   3. Category pills — quick filters (Fiction, Classics, Mystery, ...)
//   4. Search + sort bar
//   5. Grid (30 per page)
//   6. Pagination
//
// The Arabic tab was removed after user testing — Internet Archive's
// Arabic audio catalogue is overwhelmingly Quran recitation and even
// aggressive filtering couldn't yield a clean literature browse.
// Reverting to English-only means the writer sees a 20,000+ book
// LibriVox catalogue front and center.

import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { NiceSelect } from "@/components/ui/nice-select";
import { useLanguage } from "@/contexts/language-context";
import {
  Search, Clock, Headphones, BookAudio, ChevronDown,
  ArrowRight, ArrowLeft, ListMusic, ChevronLeft, ChevronRight,
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
const ACCENT = TEXT; // was gold #c9a96e — writer preferred plain white accents on this page

// Category pills — map to backend `category=` parameter which the
// server translates to LibriVox's exact genre string.
const CATEGORIES = [
  { id: "all",          label: "All",             labelAr: "الكل" },
  { id: "classics",     label: "Classics",        labelAr: "الكلاسيكيّات" },
  { id: "mystery",      label: "Mystery",         labelAr: "الغموض" },
  { id: "adventure",    label: "Adventure",       labelAr: "المغامرة" },
  { id: "scifi",        label: "Sci-Fi",          labelAr: "الخيال العلمي" },
  { id: "romance",      label: "Romance",         labelAr: "الرومانسيّة" },
  { id: "horror",       label: "Horror",          labelAr: "الرعب" },
  { id: "poetry",       label: "Poetry",          labelAr: "الشعر" },
  { id: "children",     label: "Children",        labelAr: "الأطفال" },
  { id: "shortstories", label: "Short Stories",   labelAr: "قصص قصيرة" },
  { id: "history",      label: "History",         labelAr: "التاريخ" },
  { id: "philosophy",   label: "Philosophy",      labelAr: "الفلسفة" },
  { id: "biography",    label: "Biography",       labelAr: "السيرة الذاتيّة" },
  { id: "humor",        label: "Humor",           labelAr: "الفكاهة" },
];

const SORTS = [
  { id: "recommended", label: "Recommended",     labelAr: "المفضّلة" },
  { id: "longest",     label: "Longest first",   labelAr: "الأطول أوّلاً" },
  { id: "title",       label: "Title A to Z",    labelAr: "العنوان أ إلى ي" },
  { id: "recent",      label: "Recently added",  labelAr: "الأحدث" },
  { id: "shortest",    label: "Shortest first",  labelAr: "الأقصر أوّلاً" },
];

const PAGE_SIZE = 30;

interface AudioBook {
  source: "librivox";
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
  total?: number;
}

interface FeaturedResp {
  books: AudioBook[];
}

function fmtDuration(seconds: number | null, ar: boolean): string {
  if (!seconds) return "—";
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
  const [sort, setSort] = useState<string>("recommended");
  const [category, setCategory] = useState<string>("all");
  const [page, setPage] = useState(0);

  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(query.trim()), 280);
    return () => clearTimeout(id);
  }, [query]);
  useEffect(() => setPage(0), [debouncedQ, sort, category]);

  const params = useMemo(() => {
    const u = new URLSearchParams();
    if (debouncedQ) u.set("q", debouncedQ);
    u.set("sort", sort);
    u.set("category", category);
    u.set("page", String(page));
    return u.toString();
  }, [debouncedQ, sort, category, page]);

  const { data, isFetching } = useQuery<BrowseResp>({
    queryKey: ["/api/audiolibrary/browse", params],
    queryFn: async () => {
      const r = await fetch(`/api/audiolibrary/browse?${params}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load audiolibrary");
      return r.json();
    },
    staleTime: 60_000,
  });

  const { data: featured } = useQuery<FeaturedResp>({
    queryKey: ["/api/audiolibrary/featured"],
    queryFn: async () => {
      const r = await fetch(`/api/audiolibrary/featured`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load featured");
      return r.json();
    },
    staleTime: 5 * 60_000,
  });

  const canGoNext = (data?.books?.length ?? 0) === PAGE_SIZE;
  const showFeatured = !debouncedQ && category === "all" && page === 0;

  return (
    <Layout>
      <SEO
        title={ar ? "المكتبة الصوتيّة | بلوتزي" : "Audio Library | Plotzy"}
        description={ar
          ? "أكثر من تسعة عشر ألف كتاب صوتي مجاني بالإنجليزيّة من LibriVox. كل التسجيلات قانونيّة لأنّ نصوصها في الملك العامّ."
          : "19,000+ free public-domain audiobooks in English from LibriVox. Every recording is fully legal because the underlying texts are in the public domain."}
      />
      <div dir={isRTL ? "rtl" : "ltr"} style={{ background: BG, color: TEXT, fontFamily: SF, minHeight: "100vh" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "32px 20px 80px" }}>

          {/* ── Hero ── */}
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", borderRadius: 999, background: CARD, border: `1px solid ${BORDER}`, marginBottom: 14 }}>
              <Headphones size={12} color={MUTED} />
              <span style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {ar ? "Public Domain" : "Public Domain"}
              </span>
            </div>
            <h1 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-0.025em", margin: "0 0 12px", lineHeight: 1.1 }}>
              {ar ? "المكتبة الصوتيّة" : "Audio Library"}
            </h1>
            <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.65, maxWidth: 720, margin: "0 0 8px" }}>
              {ar
                ? "أكثر من تسعة عشر ألف كتاب صوتي بالإنجليزيّة، مصدرها LibriVox. كل التسجيلات قانونيّة لأنّ نصوصها الأصليّة قد دخلت الملك العامّ."
                : "More than 19,000 English audiobooks from LibriVox. Every recording is fully legal because the underlying texts have entered the public domain."}
            </p>
          </section>

          {/* ── Featured strip ── */}
          {showFeatured && (
            <section style={{ marginBottom: 34 }}>
              <SectionHeader
                title={ar ? "كلاسيكيّات مختارة" : "Featured Classics"}
              />
              <FeaturedStrip
                books={featured?.books ?? []}
                loading={!featured}
                ar={ar}
                onOpen={(b) => navigate(`/audiolibrary/${b.source}/${encodeURIComponent(b.externalId)}`)}
              />
            </section>
          )}

          {/* ── Category pills ── */}
          <section style={{ marginBottom: 22 }}>
            <CategoryPills
              value={category}
              onChange={setCategory}
              options={CATEGORIES.map((c) => ({ id: c.id, label: ar ? c.labelAr : c.label }))}
            />
          </section>

          {/* ── Search + sort ── */}
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
              <Search size={14} color={MUTED} style={{ position: "absolute", insetInlineStart: 11, top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={ar ? "ابحث بعنوان أو مؤلف..." : "Search by title or author..."}
                style={{
                  fontFamily: SF, width: "100%",
                  padding: isRTL ? "10px 34px 10px 12px" : "10px 12px 10px 34px",
                  fontSize: 13, color: TEXT, background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${BORDER}`, borderRadius: 10, outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <SelectChip icon={<ListMusic size={12} />} value={sort} onChange={setSort} options={SORTS.map((s) => ({ id: s.id, label: ar ? s.labelAr : s.label }))} isRTL={isRTL} />
          </section>

          {/* ── Stats + pager ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{ fontSize: 12.5, color: MUTED, margin: 0 }}>
              {isFetching && !data
                ? (ar ? "جارٍ التحميل..." : "Loading...")
                : (
                  <>
                    {ar ? "الصفحة" : "Page"}{" "}
                    <span style={{ fontWeight: 700, color: TEXT, fontVariantNumeric: "tabular-nums" }}>{page + 1}</span>
                    {" · "}
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{data?.books?.length ?? 0}</span>{" "}
                    {ar ? "كتاب" : `book${(data?.books?.length ?? 0) === 1 ? "" : "s"}`}
                    {typeof data?.total === "number" && (
                      <>
                        {" · "}
                        <span style={{ color: MUTED2 }}>
                          {ar
                            ? `من ${data.total.toLocaleString("ar-EG")}`
                            : `of ${data.total.toLocaleString()}`}
                        </span>
                      </>
                    )}
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
                gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
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

          {/* Bottom pager for long grids */}
          {data && data.books.length > 12 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 28 }}>
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || isFetching} style={iconBtn(page === 0 || isFetching)} aria-label={ar ? "السابق" : "Previous"}>
                {isRTL ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
              </button>
              <div style={{ padding: "8px 14px", fontSize: 12.5, color: MUTED, fontFamily: SF }}>
                {ar ? "الصفحة" : "Page"} <span style={{ color: TEXT, fontWeight: 700 }}>{page + 1}</span>
              </div>
              <button onClick={() => setPage((p) => p + 1)} disabled={!canGoNext || isFetching} style={iconBtn(!canGoNext || isFetching)} aria-label={ar ? "التالي" : "Next"}>
                {isRTL ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

// ─── Section header ───────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 }}>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: TEXT }}>{title}</div>
    </div>
  );
}

// ─── Featured horizontal strip ────────────────────────────────────

function FeaturedStrip({ books, loading, ar, onOpen }: {
  books: AudioBook[]; loading: boolean; ar: boolean; onOpen: (b: AudioBook) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollBy = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };
  const items = loading ? Array.from({ length: 8 }).map(() => null) : books;
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => scrollBy(-400)}
        style={{
          position: "absolute", insetInlineStart: -4, top: "50%", transform: "translateY(-50%)",
          width: 34, height: 34, borderRadius: 999,
          background: "rgba(20,20,20,0.85)", backdropFilter: "blur(8px)",
          border: `1px solid ${BORDER_STRONG}`, color: TEXT,
          display: "grid", placeItems: "center", cursor: "pointer",
          zIndex: 2, boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
        }}
        aria-label="Scroll left"
      >
        <ChevronLeft size={16} />
      </button>
      <button
        onClick={() => scrollBy(400)}
        style={{
          position: "absolute", insetInlineEnd: -4, top: "50%", transform: "translateY(-50%)",
          width: 34, height: 34, borderRadius: 999,
          background: "rgba(20,20,20,0.85)", backdropFilter: "blur(8px)",
          border: `1px solid ${BORDER_STRONG}`, color: TEXT,
          display: "grid", placeItems: "center", cursor: "pointer",
          zIndex: 2, boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
        }}
        aria-label="Scroll right"
      >
        <ChevronRight size={16} />
      </button>
      <div
        ref={scrollRef}
        style={{
          display: "grid",
          gridAutoFlow: "column",
          gridAutoColumns: "minmax(180px, 180px)",
          gap: 14,
          overflowX: "auto",
          overflowY: "hidden",
          scrollBehavior: "smooth",
          scrollbarWidth: "none",
          padding: "4px 2px",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {items.map((b, i) =>
          b ? (
            <BookCardCompact key={b.bookKey} book={b} ar={ar} onOpen={() => onOpen(b)} />
          ) : (
            <div
              key={`skel-${i}`}
              style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, opacity: 0.4, aspectRatio: "2 / 3" }}
            />
          )
        )}
      </div>
    </div>
  );
}

function BookCardCompact({ book, ar, onOpen }: { book: AudioBook; ar: boolean; onOpen: () => void }) {
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
        display: "flex",
        flexDirection: "column",
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
      <div style={{ aspectRatio: "1 / 1", background: "#000", position: "relative", overflow: "hidden" }}>
        {!imgError && book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            loading="lazy"
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))" }}>
            <BookAudio size={38} color="rgba(255,255,255,0.35)" />
          </div>
        )}
        {book.totalDuration ? (
          <div
            style={{
              position: "absolute", bottom: 8, insetInlineEnd: 8,
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 8px", borderRadius: 999,
              background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)",
              color: "#fff", fontSize: 10, fontWeight: 600, fontVariantNumeric: "tabular-nums",
            }}
          >
            <Clock size={9} />
            {fmtDuration(book.totalDuration, ar)}
          </div>
        ) : null}
      </div>
      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: 3 }}>
          {book.title}
        </div>
        <div style={{ fontSize: 11, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {book.author || (ar ? "مؤلّف مجهول" : "Unknown author")}
        </div>
      </div>
    </button>
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
            ? "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))"
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
        {book.totalDuration ? (
          <div
            style={{
              position: "absolute", top: 8, insetInlineEnd: 8,
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 8px", borderRadius: 999,
              background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
              color: "#fff", fontSize: 10.5, fontWeight: 600, fontVariantNumeric: "tabular-nums",
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
            fontSize: 13.5, fontWeight: 700, color: TEXT, lineHeight: 1.35,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            overflow: "hidden", marginBottom: 4, letterSpacing: "-0.005em",
          }}
        >
          {book.title}
        </div>
        <div style={{ fontSize: 11.5, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {book.author || (ar ? "مؤلّف مجهول" : "Unknown author")}
        </div>
        {book.chapterCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginTop: 10, fontSize: 10.5, color: MUTED2 }}>
            <span>{book.chapterCount} {ar ? "فصل" : "ch"}</span>
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Category pills ──────────────────────────────────────────────

function CategoryPills({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: Array<{ id: string; label: string }>;
}) {
  return (
    <div
      style={{
        display: "flex", gap: 8, overflowX: "auto", overflowY: "hidden",
        paddingBottom: 6, scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
      }}
    >
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            style={{
              fontFamily: SF,
              flex: "0 0 auto",
              padding: "9px 16px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 600,
              letterSpacing: "-0.005em",
              background: active ? TEXT : CARD,
              color: active ? "#000" : MUTED,
              border: `1px solid ${active ? TEXT : BORDER}`,
              cursor: "pointer",
              transition: "all 160ms ease",
              whiteSpace: "nowrap",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Empty + skeleton ──────────────────────────────────────────────

function EmptyState({ ar, hasQuery }: { ar: boolean; hasQuery: boolean }) {
  return (
    <div style={{
      background: CARD, border: `1px dashed ${BORDER}`, borderRadius: 18,
      padding: "60px 24px", textAlign: "center", color: MUTED2,
    }}>
      <BookAudio size={32} color={MUTED2} style={{ marginBottom: 14 }} />
      <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, marginBottom: 6 }}>
        {hasQuery ? (ar ? "لا نتائج" : "No results") : (ar ? "لا شيء هنا" : "Nothing here yet")}
      </div>
      <div style={{ fontSize: 13, color: MUTED, maxWidth: 360, margin: "0 auto", lineHeight: 1.6 }}>
        {hasQuery
          ? (ar ? "جرّب كلمات مختلفة أو تصنيفاً آخر." : "Try different keywords or another category.")
          : (ar ? "غيّر التصنيف أو أعد المحاولة." : "Change the category or try again.")}
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16 }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", opacity: 0.5 }}>
          <div style={{ aspectRatio: "1 / 1", background: "rgba(255,255,255,0.05)" }} />
          <div style={{ padding: "12px 14px" }}>
            <div style={{ height: 12, width: "85%", background: "rgba(255,255,255,0.08)", borderRadius: 4, marginBottom: 8 }} />
            <div style={{ height: 10, width: "60%", background: "rgba(255,255,255,0.05)", borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Select chip ───────────────────────────────────────────────────

function SelectChip({ icon, value, onChange, options, isRTL }: {
  icon: React.ReactNode; value: string; onChange: (v: string) => void;
  options: Array<{ id: string; label: string }>; isRTL: boolean;
}) {
  return (
    <div style={{ position: "relative", direction: isRTL ? "rtl" : "ltr" }}>
      <span style={{ position: "absolute", insetInlineStart: 11, top: "50%", transform: "translateY(-50%)", color: MUTED, pointerEvents: "none", zIndex: 1 }}>{icon}</span>
      <NiceSelect
        value={value}
        onChange={onChange}
        options={options.map((o) => ({ value: o.id, label: o.label }))}
        menuWidth={210}
        triggerStyle={{
          fontFamily: SF,
          padding: "10px 12px",
          paddingInlineStart: 30,
          fontSize: 12.5, fontWeight: 500, color: TEXT,
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${BORDER}`, borderRadius: 10,
          minWidth: 160, width: "100%", justifyContent: "space-between",
        }}
      />
    </div>
  );
}

function iconBtn(disabled: boolean): React.CSSProperties {
  return {
    width: 30, height: 30, borderRadius: 8,
    background: CARD, border: `1px solid ${BORDER}`,
    color: disabled ? MUTED2 : MUTED,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontFamily: SF, opacity: disabled ? 0.4 : 1,
  };
}
