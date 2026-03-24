import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useGutenbergBooks, GutenbergBook } from "@/hooks/use-gutenberg";
import { useArchiveBooks } from "@/hooks/use-archive";
import {
  Search, BookOpen, Download, Globe, ExternalLink,
  Loader2, BookMarked, Filter, X, ChevronDown,
  Bookmark, Clock, ChevronRight,
} from "lucide-react";

/* ─── Gutenberg genre chips ─── */
const GUTENBERG_GENRES = [
  { label: "All",           topic: "" },
  { label: "Fiction",       topic: "Fiction" },
  { label: "Mystery",       topic: "Detective and mystery stories" },
  { label: "Adventure",     topic: "Adventure stories" },
  { label: "Romance",       topic: "Love stories" },
  { label: "Sci-Fi",        topic: "Science fiction" },
  { label: "Horror",        topic: "Horror tales" },
  { label: "Philosophy",    topic: "Philosophy" },
  { label: "History",       topic: "History" },
  { label: "Biography",     topic: "Biography" },
  { label: "Poetry",        topic: "Poetry" },
  { label: "Drama",         topic: "Drama" },
  { label: "Children's",    topic: "Children's stories" },
  { label: "Humor",         topic: "Humorous stories" },
  { label: "War",           topic: "War stories" },
  { label: "Travel",        topic: "Voyages and travels" },
];

/* ─── Internet Archive subject chips ─── */
const ARCHIVE_SUBJECTS = [
  { label: "All",        topic: "" },
  { label: "Fiction",    topic: "fiction" },
  { label: "History",    topic: "history" },
  { label: "Philosophy", topic: "philosophy" },
  { label: "Science",    topic: "science" },
  { label: "Biography",  topic: "biography" },
  { label: "Poetry",     topic: "poetry" },
  { label: "Travel",     topic: "travel" },
  { label: "Religion",   topic: "religion" },
  { label: "Art",        topic: "art" },
  { label: "Law",        topic: "law" },
  { label: "Medicine",   topic: "medicine" },
  { label: "Children's", topic: "children" },
];

const LANGUAGES = [
  { label: "All Languages", value: "" },
  { label: "English",       value: "en" },
  { label: "French",        value: "fr" },
  { label: "German",        value: "de" },
  { label: "Spanish",       value: "es" },
  { label: "Italian",       value: "it" },
  { label: "Portuguese",    value: "pt" },
  { label: "Dutch",         value: "nl" },
  { label: "Arabic",        value: "ar" },
  { label: "Russian",       value: "ru" },
  { label: "Latin",         value: "la" },
];

const GUTENBERG_SORTS = [
  { label: "Most Popular",  value: "popular" },
  { label: "A → Z",         value: "ascending" },
  { label: "Z → A",         value: "descending" },
];

const ARCHIVE_SORTS = [
  { label: "Most Downloaded", value: "downloads desc" },
  { label: "Title A → Z",     value: "title asc" },
  { label: "Newest First",    value: "date desc" },
  { label: "Oldest First",    value: "date asc" },
];

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/* ─── Download Dropdown ─── */
function DownloadMenu({ book, isArchive }: { book: GutenbergBook; isArchive?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const options = isArchive
    ? [
        book.pdfUrl      && { label: "PDF",  url: book.pdfUrl,      color: "text-red-500" },
        book.downloadUrl && { label: "EPUB", url: book.downloadUrl, color: "text-blue-500" },
      ].filter(Boolean) as { label: string; url: string; color: string }[]
    : [
        book.pdfUrl      && { label: "PDF",  url: book.pdfUrl,      color: "text-red-500" },
        book.downloadUrl && { label: "EPUB", url: book.downloadUrl, color: "text-blue-500" },
        book.txtUrl      && { label: "TXT",  url: book.txtUrl,      color: "text-green-500" },
      ].filter(Boolean) as { label: string; url: string; color: string }[];

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  if (options.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className="flex items-center justify-center gap-1 text-xs font-medium py-1.5 px-2 rounded-lg transition-colors"
        title="Download"
        style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}
      >
        <Download className="w-3 h-3" />
        <ChevronDown className={`w-2.5 h-2.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute bottom-full mb-1 right-0 z-50 min-w-[110px] rounded-xl shadow-xl overflow-hidden" style={{ background: "#1c1c1e", border: "1px solid rgba(255,255,255,0.1)" }}>
          {options.map(opt => (
            <a
              key={opt.label}
              href={opt.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => { e.stopPropagation(); setOpen(false); }}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors"
              style={{ color: "#fff" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <span className={`font-bold uppercase text-[10px] ${opt.color}`}>{opt.label}</span>
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Download</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Book Card (works for both sources) ─── */
function BookCard({ book, isArchive, isBookmarked, onToggleBookmark }: {
  book: GutenbergBook;
  isArchive?: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: (id: number) => void;
}) {
  const [, navigate] = useLocation();
  const [imgError, setImgError] = useState(false);
  const authorLine = book.authors.slice(0, 2).join(", ") || "Unknown Author";
  const langLabel  = book.languages?.[0]?.toUpperCase() || "EN";
  const hasDownload = !!(book.pdfUrl || book.downloadUrl || book.txtUrl);

  const handleRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isArchive) {
      window.open(book.readUrl!, "_blank", "noopener,noreferrer");
    } else {
      navigate(`/gutenberg/read/${book.id}`);
    }
  };

  return (
    <div className="group flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
         style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
         onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(255,255,255,0.18)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.5)"; }}
         onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(255,255,255,0.08)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
      {/* Cover */}
      <div className="relative aspect-[3/4] overflow-hidden flex-shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
        {book.coverImage && !imgError ? (
          <img
            src={book.coverImage}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4" style={{ background: "rgba(255,255,255,0.03)" }}>
            <BookMarked className="w-10 h-10" style={{ color: "rgba(255,255,255,0.2)" }} />
            <p className="text-center text-xs font-medium leading-snug line-clamp-4" style={{ color: "rgba(255,255,255,0.35)" }}>{book.title}</p>
          </div>
        )}
        {/* Language badge */}
        <div className="absolute top-2 right-2 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide" style={{ background: "rgba(0,0,0,0.7)" }}>
          {langLabel}
        </div>
        {/* Source badge for Archive */}
        {isArchive && (
          <div className="absolute top-2 left-2 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide" style={{ background: "rgba(249,115,22,0.8)" }}>
            IA
          </div>
        )}
        {/* Download count */}
        {book.downloadCount > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[9px] px-1.5 py-0.5 rounded-md" style={{ background: "rgba(0,0,0,0.7)" }}>
            <Download className="w-2.5 h-2.5" />
            {formatCount(book.downloadCount)}
          </div>
        )}
        {/* Bookmark button */}
        {onToggleBookmark && (
          <button
            onClick={e => { e.stopPropagation(); onToggleBookmark(book.id); }}
            className="absolute bottom-2 right-2 w-7 h-7 flex items-center justify-center rounded-lg transition-all"
            style={{
              background: isBookmarked ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.65)",
              backdropFilter: "blur(4px)",
              border: isBookmarked ? "none" : "1px solid rgba(255,255,255,0.15)",
            }}
            title={isBookmarked ? "Remove bookmark" : "Save to reading list"}
          >
            <Bookmark
              className="w-3.5 h-3.5 transition-all"
              style={{ color: isBookmarked ? "#000" : "#fff" }}
              fill={isBookmarked ? "#000" : "none"}
            />
          </button>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        <div className="flex-1 min-h-0">
          <h3 className="text-sm font-semibold leading-snug line-clamp-2 transition-colors" style={{ color: "#fff" }}>
            {book.title}
          </h3>
          <p className="text-xs mt-1 line-clamp-1" style={{ color: "rgba(255,255,255,0.4)" }}>{authorLine}</p>
        </div>
        {/* Action buttons */}
        <div className="flex gap-1.5 mt-auto pt-2">
          <button
            onClick={handleRead}
            className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-1.5 px-2 rounded-lg hover:opacity-90 transition-opacity"
            style={{ background: "#fff", color: "#000" }}
          >
            {isArchive ? <ExternalLink className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
            Read
          </button>
          {hasDownload && <DownloadMenu book={book} isArchive={isArchive} />}
        </div>
      </div>
    </div>
  );
}

/* ─── Skeleton grid ─── */
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: 24 }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="aspect-[3/4]" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="p-3 space-y-2">
            <div className="h-3 rounded-full w-3/4" style={{ background: "rgba(255,255,255,0.07)" }} />
            <div className="h-2.5 rounded-full w-1/2" style={{ background: "rgba(255,255,255,0.05)" }} />
            <div className="h-7 rounded-xl mt-3" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Types for localStorage entries ─── */
interface RecentBook { id: number; title: string; authors: string[]; coverImage?: string; }

/* ─── Main page ─── */
export default function GutenbergLibrary() {
  const [, navigate] = useLocation();
  const [source, setSource] = useState<"gutenberg" | "archive">("gutenberg");

  // Shared state
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // ─── Bookmarks, recently viewed, last read ───
  const [bookmarks, setBookmarks] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem("gutenberg-bookmarks") || "[]"); } catch { return []; }
  });
  const [recentlyViewed] = useState<RecentBook[]>(() => {
    try { return JSON.parse(localStorage.getItem("gutenberg-recently-viewed") || "[]"); } catch { return []; }
  });

  const toggleBookmark = (id: number) => {
    setBookmarks(prev => {
      const updated = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem("gutenberg-bookmarks", JSON.stringify(updated));
      return updated;
    });
  };
  const [showFilters, setShowFilters] = useState(false);

  // Gutenberg-specific (defaults to English)
  const [selectedGenre, setSelectedGenre] = useState(GUTENBERG_GENRES[0]);
  const [gutSort, setGutSort] = useState("popular");
  const [gutLanguage, setGutLanguage] = useState("en");

  // Archive-specific (defaults to ALL languages → shows full 3.6M catalogue)
  const [selectedSubject, setSelectedSubject] = useState(ARCHIVE_SUBJECTS[0]);
  const [archSort, setArchSort] = useState("downloads desc");
  const [archLanguage, setArchLanguage] = useState("");

  const language    = source === "gutenberg" ? gutLanguage    : archLanguage;
  const setLanguage = source === "gutenberg" ? setGutLanguage : setArchLanguage;

  const loaderRef = useRef<HTMLDivElement>(null);

  /* ─── Gutenberg query ─── */
  const gut = useGutenbergBooks({ search, topic: selectedGenre.topic, languages: gutLanguage, sort: gutSort });

  /* ─── Archive query ─── */
  const arch = useArchiveBooks({ search, subject: selectedSubject.topic, language: archLanguage, sort: archSort });

  const active = source === "gutenberg" ? gut : arch;

  const allBooks   = active.data?.pages.flatMap(p => p.books) ?? [];
  const totalCount = active.data?.pages[0]?.count ?? 0;
  const isLoading  = active.isLoading;
  const isError    = active.isError;
  const hasNextPage        = active.hasNextPage;
  const isFetchingNextPage = active.isFetchingNextPage;
  const fetchNextPage      = active.fetchNextPage;
  const refetch            = active.refetch;

  /* ─── Infinite scroll ─── */
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(handleObserver, { threshold: 0.1, rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [handleObserver]);

  /* ─── Search debounce ─── */
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 450);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* ─── Reset filters on source switch ─── */
  const switchSource = (s: "gutenberg" | "archive") => {
    setSource(s);
    setSearchInput(""); setSearch("");
    setShowFilters(false);
    setSelectedGenre(GUTENBERG_GENRES[0]);
    setSelectedSubject(ARCHIVE_SUBJECTS[0]);
  };

  const genres  = source === "gutenberg" ? GUTENBERG_GENRES : ARCHIVE_SUBJECTS;
  const sorts   = source === "gutenberg" ? GUTENBERG_SORTS  : ARCHIVE_SORTS;
  const curGenre = source === "gutenberg" ? selectedGenre   : selectedSubject;
  const setGenre = source === "gutenberg"
    ? (g: typeof GUTENBERG_GENRES[0]) => setSelectedGenre(g as any)
    : (g: typeof ARCHIVE_SUBJECTS[0]) => setSelectedSubject(g as any);

  const isArchive = source === "archive";

  return (
    <Layout isFullDark>
      <div style={{ background: "#0a0a0a", color: "#fff" }}>
        {/* ── Header ── */}
        <div className="relative overflow-hidden" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "linear-gradient(160deg, #111 0%, #0a0a0a 100%)" }}>
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.04) 0%, transparent 60%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.02) 0%, transparent 60%)" }} />
          <div className="relative max-w-5xl mx-auto px-6 py-12 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <Globe className="w-4 h-4" style={{ color: "rgba(255,255,255,0.7)" }} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>Public Domain Library</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: "#fff" }}>Free Public Domain Books</h1>
            <p className="text-sm md:text-base max-w-xl mx-auto leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.45)" }}>
              Thousands of books — completely free, completely legal. All verified public domain.
            </p>

            {/* Source tabs */}
            <div className="inline-flex items-center rounded-xl p-1 gap-1 mb-7" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {([
                { id: "gutenberg", label: "Project Gutenberg", count: "62k" },
                { id: "archive",   label: "Internet Archive",  count: "3.6M+" },
              ] as const).map(s => (
                <button
                  key={s.id}
                  onClick={() => switchSource(s.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={source === s.id
                    ? { background: "#fff", color: "#000", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }
                    : { color: "rgba(255,255,255,0.45)" }}
                >
                  {s.label}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={source === s.id
                          ? { background: "rgba(0,0,0,0.08)", color: "#000" }
                          : { background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)" }}>
                    {s.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="max-w-xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "rgba(255,255,255,0.3)" }} />
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Search by title or author..."
                  className="w-full pl-11 pr-10 py-3.5 rounded-2xl text-sm transition-all focus:outline-none"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                  }}
                  onFocus={e => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.25)"; e.currentTarget.style.background = "rgba(255,255,255,0.09)"; }}
                  onBlur={e => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                />
                {searchInput && (
                  <button onClick={() => { setSearchInput(""); setSearch(""); }} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Notice ── */}
        <div style={{ background: "rgba(251,191,36,0.07)", borderBottom: "1px solid rgba(251,191,36,0.15)" }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)" }}>
                <span className="text-[10px] font-bold leading-none" style={{ color: "#fbbf24" }}>!</span>
              </div>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(251,191,36,0.85)" }}>
              <span className="font-semibold">Only verified public domain books are shown.</span>{" "}
              {isArchive
                ? <>Internet Archive books carry the <span className="font-medium">CC Public Domain Mark 1.0</span> licence — no copyrighted or borrow-only books are included.</>
                : <>Content sourced from <a href="https://www.gutenberg.org" target="_blank" rel="noopener noreferrer" className="underline font-medium">Project Gutenberg</a> — all titles have passed their copyright term.</>
              }
            </p>
          </div>
        </div>

        {/* ── Recently Viewed ── */}
        {recentlyViewed.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 pt-6 pb-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>Recently Viewed</span>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {recentlyViewed.map(b => (
                <button
                  key={b.id}
                  onClick={() => navigate(`/gutenberg/read/${b.id}`)}
                  className="flex-shrink-0 flex flex-col items-center gap-2 group"
                  style={{ width: 72 }}
                >
                  <div className="w-full rounded-xl overflow-hidden transition-all group-hover:opacity-80" style={{ aspectRatio: "3/4", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {b.coverImage
                      ? <img src={b.coverImage} alt={b.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-5 h-5" style={{ color: "rgba(255,255,255,0.15)" }} /></div>
                    }
                  </div>
                  <p className="text-[9px] text-center leading-snug line-clamp-2 w-full" style={{ color: "rgba(255,255,255,0.4)" }}>{b.title}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Filters ── */}
        <div className="sticky top-0 z-20 backdrop-blur" style={{ background: "rgba(10,10,10,0.92)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
              {genres.map(g => (
                <button
                  key={g.label}
                  onClick={() => setGenre(g as any)}
                  className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-all"
                  style={curGenre.label === g.label
                    ? { background: "#fff", color: "#000" }
                    : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}
                >
                  {g.label}
                </button>
              ))}
              <div className="w-px h-5 flex-shrink-0 mx-1" style={{ background: "rgba(255,255,255,0.1)" }} />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all"
                style={showFilters
                  ? { background: "#fff", color: "#000" }
                  : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}
              >
                <Filter className="w-3 h-3" />
                Filters
                <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
              </button>
            </div>

            {showFilters && (
              <div className="flex flex-wrap gap-4 pb-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>Language</label>
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                    className="text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
                  >
                    {LANGUAGES.map(l => <option key={l.value} value={l.value} style={{ background: "#1a1a1a" }}>{l.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>Sort</label>
                  <select
                    value={source === "gutenberg" ? gutSort : archSort}
                    onChange={e => source === "gutenberg" ? setGutSort(e.target.value) : setArchSort(e.target.value)}
                    className="text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
                  >
                    {sorts.map(s => <option key={s.value} value={s.value} style={{ background: "#1a1a1a" }}>{s.label}</option>)}
                  </select>
                </div>
                <button
                  onClick={() => {
                    setGutLanguage("en"); setArchLanguage("");
                    setGutSort("popular"); setArchSort("downloads desc");
                    setSelectedGenre(GUTENBERG_GENRES[0]); setSelectedSubject(ARCHIVE_SUBJECTS[0]);
                    setSearchInput(""); setSearch("");
                  }}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  <X className="w-3 h-3" /> Reset all
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Results header ── */}
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            {isLoading ? (
              <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Loading...</span>
            ) : (
              <span>
                {totalCount.toLocaleString()} books available
                {search ? ` for "${search}"` : ""}
                {curGenre.topic ? ` · ${curGenre.label}` : ""}
              </span>
            )}
          </p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            Showing {allBooks.length.toLocaleString()} of {totalCount.toLocaleString()}
          </p>
        </div>

        {/* ── Book grid ── */}
        <div className="max-w-7xl mx-auto px-4 pb-16">
          {isError ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
                <X className="w-6 h-6" style={{ color: "#ef4444" }} />
              </div>
              <div className="text-center">
                <p className="font-semibold" style={{ color: "#fff" }}>Failed to load books</p>
                <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Check your connection and try again</p>
              </div>
              <button onClick={() => refetch()} className="text-sm px-5 py-2 rounded-xl font-medium hover:opacity-80 transition-opacity" style={{ background: "#fff", color: "#000" }}>
                Try Again
              </button>
            </div>
          ) : isLoading ? (
            <SkeletonGrid />
          ) : allBooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                <Search className="w-6 h-6" style={{ color: "rgba(255,255,255,0.3)" }} />
              </div>
              <div className="text-center">
                <p className="font-semibold" style={{ color: "#fff" }}>No books found</p>
                <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Try a different search term or genre</p>
              </div>
              <button onClick={() => { setSearchInput(""); setSearch(""); setSelectedGenre(GUTENBERG_GENRES[0]); setSelectedSubject(ARCHIVE_SUBJECTS[0]); }} className="text-sm px-5 py-2 rounded-xl font-medium hover:opacity-80 transition-opacity" style={{ background: "#fff", color: "#000" }}>
                Clear Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {allBooks.map(book => (
                <BookCard
                  key={book.id}
                  book={book}
                  isArchive={isArchive}
                  isBookmarked={bookmarks.includes(book.id)}
                  onToggleBookmark={toggleBookmark}
                />
              ))}
            </div>
          )}

          {/* Infinite scroll trigger */}
          <div ref={loaderRef} className="flex justify-center pt-10 pb-4">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading more books...
              </div>
            ) : hasNextPage ? (
              <button
                onClick={() => fetchNextPage()}
                className="text-sm flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all"
                style={{ color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                Load more
              </button>
            ) : allBooks.length > 0 ? (
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>You've seen all {allBooks.length.toLocaleString()} books in this view</p>
            ) : null}
          </div>
        </div>

        {/* ── Legal footer ── */}
        <div className="px-6 py-6 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <p className="text-xs max-w-2xl mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
            Books sourced from{" "}
            <a href="https://www.gutenberg.org" target="_blank" rel="noopener noreferrer" className="font-medium hover:underline" style={{ color: "rgba(255,255,255,0.55)" }}>Project Gutenberg</a>
            {" "}and{" "}
            <a href="https://archive.org" target="_blank" rel="noopener noreferrer" className="font-medium hover:underline" style={{ color: "rgba(255,255,255,0.55)" }}>Internet Archive</a>.
            {" "}Only public domain content is displayed. No copyrighted or restricted material is served by Plotzy.
          </p>
        </div>
      </div>
    </Layout>
  );
}
