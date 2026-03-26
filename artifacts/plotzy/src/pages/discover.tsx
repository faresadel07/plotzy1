import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import {
  Search, BookOpen, Loader2, ChevronLeft, ChevronRight, X, BookMarked,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TOPICS = [
  { label: "Fiction", value: "fiction" },
  { label: "Mystery", value: "mystery" },
  { label: "Adventure", value: "adventure" },
  { label: "Romance", value: "romance" },
  { label: "Science Fiction", value: "science fiction" },
  { label: "Horror", value: "horror" },
  { label: "History", value: "history" },
  { label: "Philosophy", value: "philosophy" },
  { label: "Poetry", value: "poetry" },
  { label: "Drama", value: "drama" },
  { label: "Children", value: "juvenile fiction" },
  { label: "Biography", value: "biography" },
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
}

function formatAuthor(a: { name: string }): string {
  const parts = a.name.split(",").map(s => s.trim());
  return parts.length === 2 ? `${parts[1]} ${parts[0]}` : a.name;
}

function BookCard({ book }: { book: GutBook }) {
  const [imgErr, setImgErr] = useState(false);
  const author = book.authors[0] ? formatAuthor(book.authors[0]) : "Unknown";
  const hasImg = book.coverUrl && !imgErr;

  return (
    <Link href={`/discover/${book.id}`}>
      <div
        className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Cover */}
        <div className="relative aspect-[2/3] w-full overflow-hidden">
          {hasImg ? (
            <img
              src={book.coverUrl!}
              alt={book.title}
              onError={() => setImgErr(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4"
              style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)" }}>
              <BookOpen className="w-10 h-10 mb-3" style={{ color: "rgba(255,255,255,0.2)" }} />
              <p className="text-xs text-center font-medium leading-tight" style={{ color: "rgba(255,255,255,0.4)" }}>
                {book.title}
              </p>
            </div>
          )}
          {/* Overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: "rgba(0,0,0,0.55)" }}>
            <span className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>
              <BookOpen className="w-4 h-4" /> Read Now
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="font-semibold text-sm leading-tight line-clamp-2 mb-1" style={{ color: "rgba(255,255,255,0.88)" }}>
            {book.title}
          </p>
          <p className="text-xs line-clamp-1" style={{ color: "rgba(255,255,255,0.45)" }}>{author}</p>
        </div>
      </div>
    </Link>
  );
}

export default function DiscoverPage() {
  const { lang } = useLanguage();
  const ar = lang === "ar";

  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<BooksResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const debouncedSearch = useDebounce(search, 500);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (topic) params.set("topic", topic);
      const res = await fetch(`${BASE}/api/gutenberg/books?${params}`);
      if (!res.ok) throw new Error("Failed to load books");
      setData(await res.json());
    } catch (e: any) {
      setError(e.message || "Error loading books");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, topic, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, topic]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  return (
    <Layout>
      <div className="min-h-screen" style={{ background: "#080808" }}>
        {/* Hero */}
        <div className="relative py-16 px-6 text-center overflow-hidden">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 70%)" }} />
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookMarked className="w-5 h-5" style={{ color: "rgba(255,255,255,0.5)" }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
              {ar ? "مكتبة الأدب العالمي" : "World Literature Library"}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 tracking-tight" style={{ color: "rgba(255,255,255,0.92)" }}>
            {ar ? "اكتشف الكلاسيكيات" : "Discover Classics"}
          </h1>
          <p className="text-base max-w-xl mx-auto mb-8" style={{ color: "rgba(255,255,255,0.45)" }}>
            {ar
              ? "أكثر من 70,000 كتاب من المجال العام — اقرأها مجاناً داخل Plotzy"
              : "Over 70,000 public-domain books — read them free, right inside Plotzy"}
          </p>

          {/* Search bar */}
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.35)" }} />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={ar ? "ابحث عن كتاب أو مؤلف..." : "Search by title or author..."}
              className="pl-11 pr-10 h-12 rounded-2xl text-sm"
              style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.88)",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ color: "rgba(255,255,255,0.35)" }}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pb-20">
          {/* Topic filters */}
          <div className="flex gap-2 flex-wrap mb-8">
            <button
              onClick={() => setTopic("")}
              className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
              style={{
                background: !topic ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${!topic ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}`,
                color: !topic ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)",
              }}
            >
              {ar ? "الكل" : "All"}
            </button>
            {TOPICS.map(t => (
              <button
                key={t.value}
                onClick={() => setTopic(t.value === topic ? "" : t.value)}
                className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
                style={{
                  background: topic === t.value ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${topic === t.value ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}`,
                  color: topic === t.value ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Results count */}
          {data && !loading && (
            <p className="text-xs mb-6" style={{ color: "rgba(255,255,255,0.3)" }}>
              {data.count.toLocaleString()} {ar ? "كتاب" : "books"}
              {debouncedSearch && ` ${ar ? "لـ" : "for"} "${debouncedSearch}"`}
            </p>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="text-center py-16">
              <p className="text-sm" style={{ color: "rgba(255,100,100,0.7)" }}>{error}</p>
              <Button variant="outline" className="mt-4 rounded-xl" onClick={fetchBooks}>Retry</Button>
            </div>
          )}

          {/* Grid */}
          {!loading && !error && data && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {data.results.filter(b => b.hasText).map(book => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>

              {data.results.length === 0 && (
                <div className="text-center py-20">
                  <BookOpen className="w-12 h-12 mx-auto mb-4" style={{ color: "rgba(255,255,255,0.15)" }} />
                  <p style={{ color: "rgba(255,255,255,0.4)" }}>{ar ? "لا توجد نتائج" : "No results found"}</p>
                </div>
              )}

              {/* Pagination */}
              {(data.previous || data.next) && (
                <div className="flex items-center justify-center gap-4 mt-12">
                  <Button
                    variant="outline"
                    className="rounded-xl gap-2"
                    disabled={!data.previous}
                    onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {ar ? "السابق" : "Previous"}
                  </Button>
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {ar ? `صفحة ${page}` : `Page ${page}`}
                  </span>
                  <Button
                    variant="outline"
                    className="rounded-xl gap-2"
                    disabled={!data.next}
                    onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  >
                    {ar ? "التالي" : "Next"}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
