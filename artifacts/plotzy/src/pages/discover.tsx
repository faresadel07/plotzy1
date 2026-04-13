import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { useLanguage } from "@/contexts/language-context";
import {
  Search, BookOpen, Loader2, ChevronLeft, ChevronRight, X,
  BookMarked, Clock, TrendingUp, Globe, SlidersHorizontal, ChevronDown,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const LS_RECENT = "plotzy_recently_read";

const TOPICS = [
  { label: "All", value: "" },
  { label: "Fiction", value: "fiction" },
  { label: "Mystery", value: "mystery" },
  { label: "Adventure", value: "adventure" },
  { label: "Romance", value: "romance" },
  { label: "Sci-Fi", value: "science fiction" },
  { label: "Horror", value: "horror" },
  { label: "History", value: "history" },
  { label: "Philosophy", value: "philosophy" },
  { label: "Poetry", value: "poetry" },
  { label: "Drama", value: "drama" },
  { label: "Children", value: "juvenile fiction" },
  { label: "Biography", value: "biography" },
  { label: "Psychology", value: "psychology" },
  { label: "Religion", value: "religion" },
  { label: "Science", value: "natural history" },
];

const LANGUAGES = [
  { label: "All Languages", value: "" },
  { label: "English", value: "en" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
  { label: "Spanish", value: "es" },
  { label: "Italian", value: "it" },
  { label: "Portuguese", value: "pt" },
  { label: "Dutch", value: "nl" },
  { label: "Chinese", value: "zh" },
  { label: "Finnish", value: "fi" },
];

const SORT_OPTIONS = [
  { label: "Most Popular", value: "popular" },
  { label: "Recently Added", value: "ascending" },
];

interface GutBook {
  id: number;
  title: string;
  authors: { name: string; birth_year?: number; death_year?: number }[];
  subjects: string[];
  languages: string[];
  coverUrl: string | null;
  downloadCount: number;
  hasText: boolean;
}

interface BooksResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: GutBook[];
  syncing?: boolean;
}

interface RecentBook {
  id: number;
  title: string;
  author: string;
  coverUrl: string | null;
  page: number;
  totalPages?: number;
  ts: number;
}

function formatAuthor(a: { name: string }): string {
  const parts = a.name.split(",").map(s => s.trim());
  return parts.length === 2 ? `${parts[1]} ${parts[0]}` : a.name;
}

function loadRecent(): RecentBook[] {
  try { return JSON.parse(localStorage.getItem(LS_RECENT) || "[]"); } catch { return []; }
}

/* ── Book Card ──────────────────────────────────────────────────────────── */

function BookCard({ book, size = "normal" }: { book: GutBook; size?: "normal" | "small" }) {
  const [imgErr, setImgErr] = useState(false);
  const author = book.authors[0] ? formatAuthor(book.authors[0]) : "Unknown";
  const hasImg = book.coverUrl && !imgErr;
  const sm = size === "small";

  return (
    <Link href={`/discover/${book.id}`}>
      <div className={`group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] ${sm ? "rounded-xl" : "rounded-2xl"}`}
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className={`relative overflow-hidden ${sm ? "aspect-[2/3]" : "aspect-[2/3]"} w-full`}>
          {hasImg ? (
            <img src={book.coverUrl!} alt={book.title} loading="lazy" onError={() => setImgErr(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-3"
              style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)" }}>
              <BookOpen className={`${sm ? "w-7 h-7" : "w-10 h-10"} mb-2`} style={{ color: "rgba(255,255,255,0.18)" }} />
              <p className="text-xs text-center font-medium leading-tight line-clamp-3" style={{ color: "rgba(255,255,255,0.35)" }}>
                {book.title}
              </p>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
            style={{ background: "rgba(0,0,0,0.6)" }}>
            <span className="text-xs font-semibold text-white px-3 py-1.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>
              Read Now
            </span>
          </div>
        </div>
        <div className={`${sm ? "p-2" : "p-3"}`}>
          <p className={`font-semibold leading-tight line-clamp-2 mb-0.5 ${sm ? "text-xs" : "text-sm"}`}
            style={{ color: "rgba(255,255,255,0.88)" }}>{book.title}</p>
          <p className="text-xs line-clamp-1" style={{ color: "rgba(255,255,255,0.38)" }}>{author}</p>
        </div>
      </div>
    </Link>
  );
}

/* ── Recently Read Card ──────────────────────────────────────────────────── */

function RecentCard({ book }: { book: RecentBook }) {
  const [imgErr, setImgErr] = useState(false);
  const hasImg = book.coverUrl && !imgErr;
  const pct = book.page > 0 ? Math.min(99, Math.round((book.page / Math.max(1, book.totalPages || book.page + 20)) * 100)) : 0;

  return (
    <Link href={`/discover/${book.id}`}>
      <div className="group flex-shrink-0 w-28 cursor-pointer transition-all hover:scale-[1.04] duration-300">
        <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden mb-2"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {hasImg ? (
            <img src={book.coverUrl!} alt={book.title} loading="lazy" onError={() => setImgErr(true)}
              className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))" }}>
              <BookOpen className="w-7 h-7" style={{ color: "rgba(255,255,255,0.2)" }} />
            </div>
          )}
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "rgba(0,0,0,0.4)" }}>
            <div className="h-full" style={{ width: `${pct}%`, background: "rgba(255,255,255,0.60)" }} />
          </div>
          {/* Resume overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
            style={{ background: "rgba(0,0,0,0.6)" }}>
            <span className="text-xs font-medium text-white">Resume</span>
          </div>
        </div>
        <p className="text-xs leading-tight line-clamp-2 font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>{book.title}</p>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{book.author}</p>
      </div>
    </Link>
  );
}

/* ── Filter Pill ─────────────────────────────────────────────────────────── */

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap"
      style={{
        background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${active ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.07)"}`,
        color: active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.45)",
      }}>
      {children}
    </button>
  );
}

/* ── Dropdown ─────────────────────────────────────────────────────────────── */

function Dropdown({ label, value, options, onChange }: {
  label: string; value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find(o => o.value === value)?.label || label;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
        style={{
          background: value ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${value ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)"}`,
          color: value ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.55)",
        }}>
        {current}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 min-w-max rounded-xl overflow-hidden shadow-2xl py-1"
          style={{ background: "#1a1917", border: "1px solid rgba(255,255,255,0.1)" }}>
          {options.map(o => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
              className="block w-full text-left px-4 py-2 text-xs transition-all hover:opacity-70"
              style={{ color: o.value === value ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.65)" }}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══ Main Page ═══════════════════════════════════════════════════════════════ */

export default function DiscoverPage() {
  const { lang } = useLanguage();
  const ar = lang === "ar";

  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("en");
  const [sort, setSort] = useState("popular");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<BooksResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const syncPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [recent, setRecent] = useState<RecentBook[]>([]);

  const debouncedSearch = useDebounce(search, 450);

  // Load recently read on mount
  useEffect(() => { setRecent(loadRecent()); }, []);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (topic) params.set("topic", topic);
      if (language) params.set("lang", language);
      if (sort === "ascending") params.set("sort", "ascending");
      const res = await fetch(`${BASE}/api/gutenberg/books?${params}`);
      if (!res.ok) throw new Error("Failed to load books");
      const json: BooksResponse = await res.json();
      setData(json);
      if (json.syncing) {
        setSyncing(true);
        // Poll every 4 s until catalog is ready
        if (syncPollRef.current) clearTimeout(syncPollRef.current);
        syncPollRef.current = setTimeout(fetchBooks, 4000);
      } else {
        setSyncing(false);
        if (syncPollRef.current) clearTimeout(syncPollRef.current);
      }
    } catch (e: any) {
      setError(e.message || "Error loading books");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, topic, language, sort, page]);

  useEffect(() => { setPage(1); }, [debouncedSearch, topic, language, sort]);
  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const hasActiveFilters = topic || language !== "en" || sort !== "popular";

  return (
    <Layout darkNav isLanding>
      <div className="min-h-screen" style={{ background: "#080808" }}>

        {/* ══ HERO ══════════════════════════════════════════════════════════ */}
        <div className="relative pt-16 pb-12 px-6 text-center overflow-hidden">
          {/* Glow background */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(255,255,255,0.05) 0%, transparent 65%)" }} />

          {/* Label pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <BookMarked className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.45)" }} />
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.45)" }}>
              {ar ? "مكتبة الأدب العالمي" : "World Literature Library"}
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight" style={{ color: "rgba(255,255,255,0.94)" }}>
            {ar ? "اكتشف الكلاسيكيات" : "Discover Classics"}
          </h1>
          <p className="text-sm mx-auto mb-10 whitespace-nowrap" style={{ color: "rgba(255,255,255,0.35)" }}>
            {ar ? "أكثر من 70,000 كتاب من المجال العام — اقرأها مجاناً داخل Plotzy"
              : "Over 70,000 public-domain books — read them free, right inside Plotzy"}
          </p>

          {/* Search */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "rgba(255,255,255,0.28)" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={ar ? "ابحث عن كتاب أو مؤلف..." : "Search title, author, or subject…"}
              className="w-full pl-11 pr-10 h-13 rounded-2xl text-sm outline-none"
              style={{
                height: 52,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "rgba(255,255,255,0.90)",
                boxShadow: "0 0 0 0 transparent",
              }}
              onFocus={e => (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.28)")}
              onBlur={e => (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.10)")}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ color: "rgba(255,255,255,0.3)" }}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pb-24">

          {/* ══ RECENTLY READ ════════════════════════════════════════════════ */}
          {recent.length > 0 && !debouncedSearch && !topic && (
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {ar ? "قرأت مؤخراً" : "Continue Reading"}
                </span>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                {recent.slice(0, 12).map(b => (
                  <RecentCard key={b.id} book={b} />
                ))}
              </div>
            </div>
          )}

          {/* ══ FILTERS ══════════════════════════════════════════════════════ */}
          <div className="mb-6">
            {/* Topic pills + filter button row */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div className="flex gap-2 flex-wrap flex-1">
                {TOPICS.slice(0, 8).map(t => (
                  <Pill key={t.value} active={topic === t.value} onClick={() => setTopic(t.value === topic ? "" : t.value)}>
                    {t.label}
                  </Pill>
                ))}
              </div>
              <button
                onClick={() => setShowFilters(v => !v)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium transition-all ml-auto shrink-0"
                style={{
                  background: showFilters || hasActiveFilters ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${showFilters || hasActiveFilters ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)"}`,
                  color: showFilters || hasActiveFilters ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.55)",
                }}>
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {ar ? "فلاتر" : "Filters"}
                {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
              </button>
            </div>

            {/* More topics (expanded) */}
            {showFilters && (
              <div className="rounded-2xl p-4 mb-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex flex-wrap gap-2 mb-4">
                  <p className="w-full text-xs font-semibold mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {ar ? "المزيد من الأقسام" : "More Genres"}
                  </p>
                  {TOPICS.slice(8).map(t => (
                    <Pill key={t.value} active={topic === t.value} onClick={() => setTopic(t.value === topic ? "" : t.value)}>
                      {t.label}
                    </Pill>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <Dropdown
                      label="Language"
                      value={language}
                      options={LANGUAGES}
                      onChange={setLanguage}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <Dropdown
                      label="Sort by"
                      value={sort}
                      options={SORT_OPTIONS}
                      onChange={setSort}
                    />
                  </div>
                  {hasActiveFilters && (
                    <button
                      onClick={() => { setTopic(""); setLanguage("en"); setSort("popular"); }}
                      className="text-xs px-3 py-1.5 rounded-xl transition-all"
                      style={{ color: "rgba(255,100,100,0.7)", background: "rgba(255,100,100,0.08)", border: "1px solid rgba(255,100,100,0.15)" }}>
                      {ar ? "مسح الكل" : "Clear filters"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Results count */}
          {data && !loading && (
            <div className="flex items-center gap-2 mb-5">
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                {data.count.toLocaleString()} {ar ? "كتاب" : "books"}
                {debouncedSearch && ` ${ar ? "لـ" : "for"} "${debouncedSearch}"`}
              </span>
            </div>
          )}

          {/* Loading */}
          {loading && !syncing && (
            <div className="flex items-center justify-center py-28">
              <Loader2 className="w-7 h-7 animate-spin" style={{ color: "rgba(255,255,255,0.40)" }} />
            </div>
          )}

          {/* Catalog syncing banner */}
          {syncing && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="flex items-center gap-3 px-6 py-4 rounded-2xl"
                style={{ background: "rgba(124,106,247,0.10)", border: "1px solid rgba(124,106,247,0.25)" }}>
                <Loader2 className="w-5 h-5 animate-spin shrink-0" style={{ color: "rgba(124,106,247,0.8)" }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>
                    {ar ? "جارٍ بناء المكتبة…" : "Building your library…"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {ar ? "يتم استيراد 70,000+ كتاب من الملك العام — دقيقة واحدة فقط"
                      : "Importing 70,000+ public-domain books — just a minute"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="text-center py-20">
              <p className="text-sm mb-4" style={{ color: "rgba(255,100,100,0.7)" }}>{error}</p>
              <button onClick={fetchBooks}
                className="text-sm px-5 py-2.5 rounded-2xl font-medium transition-all"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
                {ar ? "إعادة المحاولة" : "Retry"}
              </button>
            </div>
          )}

          {/* Grid */}
          {!loading && !error && !syncing && data && (
            <>
              {data.results.filter(b => b.hasText).length === 0 ? (
                <div className="text-center py-24">
                  <BookOpen className="w-12 h-12 mx-auto mb-4" style={{ color: "rgba(255,255,255,0.1)" }} />
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {ar ? "لا توجد نتائج" : "No results found"}
                  </p>
                  <button onClick={() => { setSearch(""); setTopic(""); }}
                    className="mt-4 text-xs px-4 py-2 rounded-xl transition-all"
                    style={{ color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {ar ? "مسح البحث" : "Clear search"}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
                  {data.results.filter(b => b.hasText).map(book => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {(data.previous || data.next) && (
                <div className="flex items-center justify-center gap-4 mt-14">
                  <button
                    disabled={!data.previous}
                    onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all disabled:opacity-30"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.75)" }}>
                    <ChevronLeft className="w-4 h-4" />
                    {ar ? "السابق" : "Previous"}
                  </button>
                  <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {ar ? `صفحة ${page}` : `Page ${page}`}
                  </span>
                  <button
                    disabled={!data.next}
                    onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all disabled:opacity-30"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.75)" }}>
                    {ar ? "التالي" : "Next"}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
