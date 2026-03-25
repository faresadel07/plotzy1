import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { usePublishedBooks, useBookRatingStats, useFeaturedBook, useSetFeaturedBook } from "@/hooks/use-public-library";
import type { PublishedBook } from "@/hooks/use-public-library";
import { useAuth } from "@/contexts/auth-context";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Search, Eye, User, Calendar, Loader2, Star, Filter,
  Award, X, Trophy,
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

function StarDisplay({ avg, count, small }: { avg: number; count: number; small?: boolean }) {
  if (count === 0) return null;
  return (
    <div className={`flex items-center gap-1 ${small ? "text-[11px]" : "text-xs"}`}>
      <Star className={`${small ? "w-3 h-3" : "w-3.5 h-3.5"} fill-amber-400 text-amber-400`} />
      <span className="font-semibold text-foreground">{avg.toFixed(1)}</span>
      <span className="text-muted-foreground">({count})</span>
    </div>
  );
}

function FeaturedBookBanner({ book, isAdmin }: { book: PublishedBook; isAdmin: boolean }) {
  const { data: ratingStats } = useBookRatingStats(book.id);
  const { mutate: setFeatured, isPending } = useSetFeaturedBook();
  const authorName = book.authorName || book.authorDisplayName || "Anonymous";
  const publishedDate = book.publishedAt ? format(new Date(book.publishedAt), "MMMM d, yyyy") : null;

  const handleUnfeature = () => {
    setFeatured({ bookId: book.id, feature: false }, {
      onSuccess: () => toast({ title: "Featured book removed" }),
      onError: () => toast({ title: "Failed to update", variant: "destructive" }),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-10 relative"
    >
      <Link href={`/read/${book.id}`}>
        <div className="relative rounded-2xl overflow-hidden cursor-pointer group">
          {/* Background */}
          <div
            className="absolute inset-0"
            style={{
              background: book.spineColor
                ? `linear-gradient(135deg, ${book.spineColor}55 0%, ${book.spineColor}11 60%, transparent 100%)`
                : "linear-gradient(135deg, #7c3aed33 0%, #7c3aed08 60%, transparent 100%)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/60 to-transparent" />

          {/* Content */}
          <div className="relative flex gap-6 p-6 sm:p-8">
            {/* Book cover */}
            <div className="shrink-0 w-28 sm:w-36">
              <div
                className="w-full aspect-[3/4] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 transition-transform duration-500 group-hover:scale-[1.03]"
                style={{ background: book.spineColor ? `${book.spineColor}33` : "hsl(var(--muted))" }}
              >
                {book.coverImage ? (
                  <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center p-3"
                    style={{ background: book.spineColor ? `linear-gradient(160deg, ${book.spineColor}55 0%, ${book.spineColor}22 100%)` : undefined }}
                  >
                    <BookOpen className="w-8 h-8 text-white/60 mb-2" />
                    <p className="text-center font-semibold text-white/80 text-xs leading-snug line-clamp-4">{book.title}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex flex-col justify-center gap-3 min-w-0">
              {/* Badge */}
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
                  style={{
                    background: book.spineColor ? `${book.spineColor}33` : "#7c3aed33",
                    color: book.spineColor || "#7c3aed",
                  }}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  Featured Book
                </div>
                {book.genre && (
                  <Badge variant="secondary" className="text-[11px]">{book.genre}</Badge>
                )}
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight mb-1 line-clamp-2">
                  {book.title}
                </h2>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span>{authorName}</span>
                </div>
              </div>

              {book.summary && (
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 sm:line-clamp-3 max-w-lg">
                  {book.summary}
                </p>
              )}

              <div className="flex items-center gap-4 flex-wrap">
                {ratingStats && ratingStats.count > 0 && (
                  <StarDisplay avg={ratingStats.avg} count={ratingStats.count} />
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="w-3.5 h-3.5" />
                  {book.viewCount.toLocaleString()} reads
                </div>
                {publishedDate && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {publishedDate}
                  </div>
                )}
              </div>

              <div className="mt-1">
                <span
                  className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-200 group-hover:opacity-80"
                  style={{
                    background: book.spineColor ? `${book.spineColor}22` : "#7c3aed22",
                    color: book.spineColor || "#7c3aed",
                  }}
                >
                  Read Now →
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Admin remove button */}
      {isAdmin && (
        <button
          onClick={(e) => { e.preventDefault(); handleUnfeature(); }}
          disabled={isPending}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-all z-10"
          title="Remove featured"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  );
}

function BookCard({ book, isAdmin, isFeatured }: { book: PublishedBook; isAdmin: boolean; isFeatured: boolean }) {
  const authorName = book.authorName || book.authorDisplayName || "Anonymous";
  const publishedDate = book.publishedAt ? format(new Date(book.publishedAt), "MMM d, yyyy") : null;
  const { data: ratingStats } = useBookRatingStats(book.id);
  const { mutate: setFeatured, isPending } = useSetFeaturedBook();

  const handleFeatureToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFeatured({ bookId: book.id, feature: !isFeatured }, {
      onSuccess: () => toast({ title: isFeatured ? "Removed from featured" : "Set as featured book!" }),
      onError: () => toast({ title: "Failed to update", variant: "destructive" }),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="group relative"
    >
      {isAdmin && (
        <button
          onClick={handleFeatureToggle}
          disabled={isPending}
          className={`absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            isFeatured
              ? "bg-amber-400 text-amber-900 shadow-md"
              : "bg-black/50 text-white/60 opacity-0 group-hover:opacity-100 hover:bg-black/70 hover:text-amber-400"
          }`}
          title={isFeatured ? "Remove featured" : "Set as featured"}
        >
          <Trophy className="w-3.5 h-3.5" />
        </button>
      )}
      <Link href={`/read/${book.id}`}>
        <div className="bg-card border border-border rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-black/8 hover:-translate-y-1 hover:border-foreground/20 flex flex-col h-full">
          <div
            className="relative aspect-[3/4] w-full overflow-hidden"
            style={{ background: book.spineColor ? `${book.spineColor}22` : "hsl(var(--muted))" }}
          >
            {book.coverImage ? (
              <img
                src={book.coverImage}
                alt={book.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center p-6"
                style={{ background: book.spineColor ? `linear-gradient(160deg, ${book.spineColor}33 0%, ${book.spineColor}11 100%)` : undefined }}
              >
                <div
                  className="w-16 h-20 rounded-sm shadow-md flex items-center justify-center mb-3"
                  style={{ backgroundColor: book.spineColor || "#7c3aed" }}
                >
                  <BookOpen className="w-6 h-6 text-white/80" />
                </div>
                <p className="text-center font-semibold text-foreground/80 text-sm leading-snug line-clamp-3 px-2">{book.title}</p>
              </div>
            )}
            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {book.viewCount.toLocaleString()}
            </div>
            {ratingStats && ratingStats.count > 0 && (
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {ratingStats.avg.toFixed(1)}
              </div>
            )}
          </div>
          <div className="p-4 flex flex-col gap-2 flex-1">
            <h3 className="font-semibold text-foreground text-base leading-tight line-clamp-2">{book.title}</h3>
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <User className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{authorName}</span>
            </div>
            {book.summary && (
              <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3 flex-1">{book.summary}</p>
            )}
            <div className="flex items-center justify-between mt-auto pt-2 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {publishedDate && (
                  <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
                    <Calendar className="w-3 h-3" />
                    {publishedDate}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {ratingStats && <StarDisplay avg={ratingStats.avg} count={ratingStats.count} small />}
                {book.language && book.language !== "en" && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 uppercase tracking-wide">
                    {book.language}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

const MOCK_BOOKS = [
  { title: "The Last Voyage", color: "#2563eb", icon: "⚓" },
  { title: "Whispers of Dawn", color: "#7c3aed", icon: "🌅" },
  { title: "Iron & Silk", color: "#059669", icon: "⚔️" },
  { title: "Beneath the Stars", color: "#dc2626", icon: "✨" },
];

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  const [, navigate] = useLocation();

  if (hasFilter) {
    return (
      <div className="text-center py-24 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-foreground/5 flex items-center justify-center">
          <Search className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-semibold text-foreground">No results found</p>
        <p className="text-muted-foreground text-sm">Try a different search term or genre.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="py-16"
    >
      {/* Mock preview */}
      <div className="mb-10">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4 text-center">
          This is how it will look when writers share their stories
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 opacity-25 pointer-events-none select-none">
          {MOCK_BOOKS.map((m, i) => (
            <motion.div
              key={m.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl overflow-hidden border border-border bg-card"
            >
              <div
                className="aspect-[3/4] flex flex-col items-center justify-center p-4"
                style={{ background: `linear-gradient(160deg, ${m.color}44 0%, ${m.color}11 100%)` }}
              >
                <div
                  className="w-14 h-18 rounded-sm shadow flex items-center justify-center mb-3 text-2xl"
                  style={{ backgroundColor: m.color }}
                >
                  {m.icon}
                </div>
                <p className="text-center font-semibold text-foreground/80 text-sm">{m.title}</p>
              </div>
              <div className="p-3">
                <div className="h-2.5 bg-foreground/10 rounded-full w-3/4 mb-2" />
                <div className="h-2 bg-foreground/5 rounded-full w-1/2" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center flex flex-col items-center gap-5 mt-12">
        <div>
          <p className="text-xl font-bold text-foreground mb-2">Be the first to publish your story</p>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            No one has shared a story yet. Open any of your books and click "Publish" to share it with the community.
          </p>
        </div>
        <Button
          onClick={() => navigate("/")}
          className="rounded-xl px-6"
        >
          Go to My Library
        </Button>
      </div>
    </motion.div>
  );
}

const GENRES = [
  "All Genres", "Fiction", "Non-Fiction", "Fantasy", "Science Fiction", "Mystery",
  "Romance", "Thriller", "Horror", "Biography", "Self-Help", "Historical", "Children's",
  "Literary Fiction", "Adventure", "Poetry",
];

export default function Library() {
  const { data: books, isLoading } = usePublishedBooks();
  const { data: featuredBook } = useFeaturedBook();
  const { user } = useAuth();
  const isAdmin = !!(user?.isAdmin);
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All Genres");
  const [sortBy, setSortBy] = useState<"recent" | "popular">("recent");

  const filtered = books?.filter((b) => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q ||
      b.title.toLowerCase().includes(q) ||
      (b.authorName || b.authorDisplayName || "").toLowerCase().includes(q) ||
      (b.summary || "").toLowerCase().includes(q);
    const matchGenre = selectedGenre === "All Genres" || b.genre === selectedGenre;
    return matchSearch && matchGenre;
  }).sort((a, b) => {
    if (sortBy === "popular") return (b.viewCount || 0) - (a.viewCount || 0);
    return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();
  });

  const hasFilter = !!(search || selectedGenre !== "All Genres");
  const isEmpty = !isLoading && (!filtered || filtered.length === 0);

  return (
    <Layout isFullDark>
      <div className="dark max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-foreground/8 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-foreground" />
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight">Community Library</h1>
              </div>
              <p className="text-muted-foreground text-base ml-13">
                Discover stories written and shared by writers from our community.
              </p>
            </div>
            {books && books.length > 0 && (
              <div className="flex gap-6 text-center shrink-0">
                <div>
                  <div className="text-2xl font-extrabold text-foreground">{books.length}</div>
                  <div className="text-xs text-muted-foreground">Published works</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-foreground">
                    {books.reduce((s, b) => s + (b.viewCount || 0), 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Total reads</div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Featured Book */}
        <AnimatePresence>
          {featuredBook && !hasFilter && (
            <FeaturedBookBanner book={featuredBook} isAdmin={isAdmin} />
          )}
        </AnimatePresence>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, author, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background border-border rounded-xl"
            />
          </div>
          <Select value={selectedGenre} onValueChange={setSelectedGenre}>
            <SelectTrigger className="w-full sm:w-44 rounded-xl border-border">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-full sm:w-40 rounded-xl border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        {books && books.length > 0 && (
          <p className="text-sm text-muted-foreground mb-6">
            <span className="font-semibold text-foreground">{filtered?.length ?? 0}</span>{" "}
            {filtered?.length === 1 ? "work" : "works"} published
            {hasFilter && " (filtered)"}
          </p>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : isEmpty ? (
          <EmptyState hasFilter={hasFilter} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {filtered!.map((book, i) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <BookCard
                  book={book}
                  isAdmin={isAdmin}
                  isFeatured={featuredBook?.id === book.id}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Admin tip */}
        {isAdmin && books && books.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-10 flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-xl px-4 py-3 bg-foreground/2"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Admin: hover over any book card and click the trophy icon to set it as the Featured Book.</span>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
