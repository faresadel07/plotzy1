import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { usePublishedBooks, useBookRatingStats } from "@/hooks/use-public-library";
import type { PublishedBook } from "@/hooks/use-public-library";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Search, Eye, User, Calendar, Loader2, Star, Filter } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

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

function BookCard({ book }: { book: PublishedBook }) {
  const authorName = book.authorName || book.authorDisplayName || "Anonymous";
  const publishedDate = book.publishedAt ? format(new Date(book.publishedAt), "MMM d, yyyy") : null;
  const { data: ratingStats } = useBookRatingStats(book.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="group"
    >
      <Link href={`/read/${book.id}`}>
        <div className="bg-card border border-border rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-black/8 hover:-translate-y-1 hover:border-foreground/20 flex flex-col h-full">
          {/* Cover */}
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
            {/* View count pill */}
            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {book.viewCount.toLocaleString()}
            </div>
            {/* Rating pill */}
            {ratingStats && ratingStats.count > 0 && (
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {ratingStats.avg.toFixed(1)}
              </div>
            )}
          </div>

          {/* Info */}
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

const GENRES = [
  "All Genres", "Fiction", "Non-Fiction", "Fantasy", "Science Fiction", "Mystery",
  "Romance", "Thriller", "Horror", "Biography", "Self-Help", "Historical", "Children's",
  "Literary Fiction", "Adventure", "Poetry",
];

export default function Library() {
  const { data: books, isLoading } = usePublishedBooks();
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
            {/* Quick stats */}
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
        {books && (
          <p className="text-sm text-muted-foreground mb-6">
            <span className="font-semibold text-foreground">{filtered?.length ?? 0}</span>{" "}
            {filtered?.length === 1 ? "work" : "works"} published
            {(search || selectedGenre !== "All Genres") && " (filtered)"}
          </p>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !filtered || filtered.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-foreground/5 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            {search || selectedGenre !== "All Genres" ? (
              <>
                <p className="text-lg font-semibold text-foreground">No results found</p>
                <p className="text-muted-foreground text-sm">Try a different search term or genre.</p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-foreground">No published works yet</p>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Be the first to share your writing with the community. Open any of your books and click "Publish".
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {filtered.map((book, i) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <BookCard book={book} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
