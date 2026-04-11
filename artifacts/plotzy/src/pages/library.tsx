import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { usePublishedBooks, useBookRatingStats, useFeaturedBook, useSetFeaturedBook, useAdminDeleteBook } from "@/hooks/use-public-library";
import type { PublishedBook } from "@/hooks/use-public-library";
import { useAuth } from "@/contexts/auth-context";
import {
  BookOpen, Search, Eye, User, Loader2, Star, Heart,
  Trophy, Trash2, X, ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/* ── Design tokens ─────────────────────────────────────────── */
const SF = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif";
const BG = "#000";
const C1 = "#0a0a0a";
const C2 = "#111";
const C3 = "#1a1a1a";
const B = "rgba(255,255,255,0.07)";
const T = "#fff";
const TS = "rgba(255,255,255,0.55)";
const TD = "rgba(255,255,255,0.25)";

/* ── Like Button ───────────────────────────────────────────── */
function LikeButton({ bookId }: { bookId: number }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery<{ liked: boolean; likesCount: number }>({
    queryKey: ["/api/books", bookId, "like"],
    queryFn: () => fetch(`/api/books/${bookId}/like`, { credentials: "include" }).then(r => r.json()),
  });
  const toggle = useMutation({
    mutationFn: () => fetch(`/api/books/${bookId}/like`, { method: data?.liked ? "DELETE" : "POST", credentials: "include" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/books", bookId, "like"] }),
  });
  const liked = data?.liked ?? false;
  const count = data?.likesCount ?? 0;
  return (
    <button
      onClick={e => { e.preventDefault(); e.stopPropagation(); if (user) toggle.mutate(); }}
      style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: user ? "pointer" : "default", padding: 0, fontSize: 11, fontFamily: SF, color: liked ? "#ef4444" : TD, transition: "color 0.2s" }}
    >
      <Heart style={{ width: 13, height: 13, fill: liked ? "#ef4444" : "none", transition: "all 0.2s" }} />
      {count > 0 && count}
    </button>
  );
}

/* ── Star Display ──────────────────────────────────────────── */
function Stars({ bookId }: { bookId: number }) {
  const { data } = useBookRatingStats(bookId);
  if (!data || data.count === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontFamily: SF }}>
      <Star style={{ width: 12, height: 12, fill: "#fbbf24", color: "#fbbf24" }} />
      <span style={{ color: T, fontWeight: 600 }}>{data.avg.toFixed(1)}</span>
    </div>
  );
}

/* ── Genre Pills ───────────────────────────────────────────── */
const GENRES = [
  "All", "Fiction", "Non-Fiction", "Fantasy", "Sci-Fi", "Mystery",
  "Romance", "Thriller", "Horror", "Biography", "Self-Help", "Historical",
  "Literary", "Adventure", "Poetry",
];

/* ── Book Card ─────────────────────────────────────────────── */
function BookCard({ book, isAdmin, isFeatured }: { book: PublishedBook; isAdmin: boolean; isFeatured: boolean }) {
  const authorName = book.authorName || book.authorDisplayName || "Anonymous";
  const { mutate: setFeatured } = useSetFeaturedBook();
  const { mutate: deleteBook } = useAdminDeleteBook();
  const [hover, setHover] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <Link href={`/read/${book.id}`}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => { setHover(false); setConfirmDelete(false); }}
        style={{
          cursor: "pointer",
          transform: hover ? "translateY(-4px)" : "translateY(0)",
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Cover */}
        <div style={{
          position: "relative", aspectRatio: "2/3", borderRadius: 12, overflow: "hidden",
          background: book.spineColor ? `${book.spineColor}22` : C3,
          boxShadow: hover ? "0 16px 48px rgba(0,0,0,0.6)" : "0 4px 16px rgba(0,0,0,0.3)",
          transition: "box-shadow 0.25s",
        }}>
          {book.coverImage ? (
            <img src={book.coverImage} alt={book.title} loading="lazy" style={{
              width: "100%", height: "100%", objectFit: "cover",
              transform: hover ? "scale(1.04)" : "scale(1)",
              transition: "transform 0.5s cubic-bezier(0.4,0,0.2,1)",
            }} />
          ) : (
            <div style={{
              width: "100%", height: "100%", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", padding: 20,
              background: book.spineColor
                ? `linear-gradient(160deg, ${book.spineColor}44 0%, ${book.spineColor}11 100%)`
                : `linear-gradient(160deg, ${C3} 0%, ${C2} 100%)`,
            }}>
              <BookOpen style={{ width: 28, height: 28, color: "rgba(255,255,255,0.3)", marginBottom: 12 }} />
              <p style={{ fontFamily: "'Georgia', serif", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", textAlign: "center", lineHeight: 1.5 }}>{book.title}</p>
            </div>
          )}

          {/* Hover overlay with stats */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)",
            opacity: hover ? 1 : 0,
            transition: "opacity 0.25s",
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
            padding: 14,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontFamily: SF, color: "rgba(255,255,255,0.7)" }}>
                <Eye style={{ width: 12, height: 12 }} />
                {book.viewCount.toLocaleString()}
              </div>
              <LikeButton bookId={book.id} />
              <Stars bookId={book.id} />
            </div>
          </div>

          {/* Featured badge */}
          {isFeatured && (
            <div style={{
              position: "absolute", top: 8, left: 8, display: "flex", alignItems: "center", gap: 4,
              background: "rgba(251,191,36,0.9)", color: "#000", borderRadius: 6,
              padding: "3px 8px", fontSize: 10, fontWeight: 700, fontFamily: SF,
            }}>
              <Trophy style={{ width: 10, height: 10 }} /> Featured
            </div>
          )}

          {/* Genre tag */}
          {book.genre && (
            <div style={{
              position: "absolute", top: 8, right: 8,
              background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
              color: "rgba(255,255,255,0.8)", borderRadius: 6,
              padding: "3px 8px", fontSize: 10, fontWeight: 600, fontFamily: SF,
            }}>
              {book.genre}
            </div>
          )}

          {/* Admin controls */}
          {isAdmin && hover && (
            <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", gap: 4, zIndex: 10 }}>
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); setFeatured({ bookId: book.id, feature: !isFeatured }, { onSuccess: () => toast({ title: isFeatured ? "Unfeatured" : "Featured!" }) }); }}
                style={{ width: 26, height: 26, borderRadius: 6, background: isFeatured ? "#fbbf24" : "rgba(0,0,0,0.7)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: isFeatured ? "#000" : "#fff" }}
              ><Trophy style={{ width: 12, height: 12 }} /></button>
              {!confirmDelete ? (
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(true); }}
                  style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(0,0,0,0.7)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171" }}
                ><Trash2 style={{ width: 12, height: 12 }} /></button>
              ) : (
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); deleteBook(book.id, { onSuccess: () => toast({ title: "Deleted" }) }); setConfirmDelete(false); }}
                  style={{ padding: "0 10px", height: 26, borderRadius: 6, background: "#ef4444", border: "none", cursor: "pointer", fontFamily: SF, fontSize: 10, fontWeight: 700, color: "#fff" }}
                >Confirm</button>
              )}
            </div>
          )}
        </div>

        {/* Info below cover */}
        <div style={{ padding: "10px 2px 0" }}>
          <p style={{
            fontFamily: SF, fontSize: 13, fontWeight: 600, color: T, lineHeight: 1.4,
            overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box",
            WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, margin: 0,
          }}>{book.title}</p>

          {/* Author — clickable to profile */}
          {book.userId ? (
            <Link href={`/authors/${book.userId}`} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, cursor: "pointer" }}
                onMouseEnter={e => { (e.currentTarget.querySelector("span") as any).style.color = T; }}
                onMouseLeave={e => { (e.currentTarget.querySelector("span") as any).style.color = TS; }}
              >
                {book.authorAvatarUrl ? (
                  <img src={book.authorAvatarUrl} alt="" style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <User style={{ width: 12, height: 12, color: TD }} />
                )}
                <span style={{ fontFamily: SF, fontSize: 11, color: TS, transition: "color 0.15s" }}>{authorName}</span>
              </div>
            </Link>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5 }}>
              <User style={{ width: 12, height: 12, color: TD }} />
              <span style={{ fontFamily: SF, fontSize: 11, color: TD }}>{authorName}</span>
            </div>
          )}

          {/* Stats row — always visible */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontFamily: SF, color: TD }}>
              <Eye style={{ width: 11, height: 11 }} /> {book.viewCount.toLocaleString()}
            </div>
            <LikeButton bookId={book.id} />
            <Stars bookId={book.id} />
          </div>

          {/* Genre + language tags */}
          {(book.genre || (book.language && book.language !== "en")) && (
            <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
              {book.genre && (
                <span style={{ fontSize: 10, fontFamily: SF, color: TD, background: "rgba(255,255,255,0.05)", border: `1px solid ${B}`, borderRadius: 4, padding: "1px 6px" }}>{book.genre}</span>
              )}
              {book.language && book.language !== "en" && (
                <span style={{ fontSize: 10, fontFamily: SF, color: TD, background: "rgba(255,255,255,0.05)", border: `1px solid ${B}`, borderRadius: 4, padding: "1px 6px", textTransform: "uppercase" }}>{book.language}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ── Featured Banner ───────────────────────────────────────── */
function FeaturedBanner({ book, isAdmin }: { book: PublishedBook; isAdmin: boolean }) {
  const authorName = book.authorName || book.authorDisplayName || "Anonymous";
  const { mutate: setFeatured } = useSetFeaturedBook();
  const { data: rating } = useBookRatingStats(book.id);

  return (
    <Link href={`/read/${book.id}`}>
      <div style={{
        position: "relative", borderRadius: 16, overflow: "hidden", cursor: "pointer",
        background: C1, border: `1px solid ${B}`, marginBottom: 40,
        display: "flex", gap: 0,
      }}>
        {/* Gradient bg */}
        <div style={{
          position: "absolute", inset: 0,
          background: book.spineColor
            ? `linear-gradient(135deg, ${book.spineColor}22 0%, transparent 60%)`
            : "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 60%)",
        }} />

        <div style={{ position: "relative", display: "flex", gap: 28, padding: "28px 32px", alignItems: "center", width: "100%" }}>
          {/* Cover */}
          <div style={{
            width: 120, flexShrink: 0, aspectRatio: "2/3", borderRadius: 10, overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}>
            {book.coverImage ? (
              <img src={book.coverImage} alt={book.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: book.spineColor || C3, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BookOpen style={{ width: 28, height: 28, color: "rgba(255,255,255,0.5)" }} />
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, fontFamily: SF, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                <Trophy style={{ width: 12, height: 12 }} /> Featured
              </span>
              {book.genre && <span style={{ fontSize: 10, fontFamily: SF, color: TD, background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 4 }}>{book.genre}</span>}
            </div>
            <h2 style={{ fontFamily: "'Georgia', serif", fontSize: 22, fontWeight: 700, color: T, margin: "0 0 6px", lineHeight: 1.3 }}>{book.title}</h2>
            <p style={{ fontFamily: SF, fontSize: 13, color: TS, margin: "0 0 10px" }}>
              by{" "}
              {book.userId ? (
                <Link href={`/authors/${book.userId}`} onClick={e => e.stopPropagation()}>
                  <span
                    style={{ cursor: "pointer", color: TS, textDecoration: "underline", textDecorationColor: "rgba(255,255,255,0.2)", textUnderlineOffset: 2, transition: "color 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.color = T; }}
                    onMouseLeave={e => { e.currentTarget.style.color = TS; }}
                  >{authorName}</span>
                </Link>
              ) : authorName}
            </p>
            {book.summary && (
              <p style={{ fontFamily: SF, fontSize: 13, color: TD, lineHeight: 1.6, margin: "0 0 14px", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>{book.summary}</p>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontFamily: SF, color: TS }}>
                <Eye style={{ width: 13, height: 13 }} /> {book.viewCount.toLocaleString()} reads
              </span>
              {rating && rating.count > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontFamily: SF, color: TS }}>
                  <Star style={{ width: 13, height: 13, fill: "#fbbf24", color: "#fbbf24" }} /> {rating.avg.toFixed(1)}
                </span>
              )}
              <LikeButton bookId={book.id} />
            </div>
          </div>

          {/* Read button */}
          <div style={{
            padding: "10px 24px", borderRadius: 10, background: "#fff", color: "#000",
            fontFamily: SF, fontSize: 14, fontWeight: 600, flexShrink: 0,
          }}>
            Read Now
          </div>
        </div>

        {/* Admin unfeature */}
        {isAdmin && (
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); setFeatured({ bookId: book.id, feature: false }, { onSuccess: () => toast({ title: "Unfeatured" }) }); }}
            style={{ position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: 8, background: "rgba(0,0,0,0.5)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: TD }}
          ><X style={{ width: 14, height: 14 }} /></button>
        )}
      </div>
    </Link>
  );
}

/* ── Main Page ─────────────────────────────────────────────── */
export default function Library() {
  const { data: books, isLoading } = usePublishedBooks();
  const { data: featuredBook } = useFeaturedBook();
  const { user } = useAuth();
  const isAdmin = !!(user?.isAdmin);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("All");
  const [sort, setSort] = useState<"recent" | "popular">("recent");

  const filtered = books?.filter(b => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q || b.title.toLowerCase().includes(q) || (b.authorName || b.authorDisplayName || "").toLowerCase().includes(q);
    const matchGenre = genre === "All" || b.genre === genre;
    return matchSearch && matchGenre;
  }).sort((a, b) => {
    if (sort === "popular") return (b.viewCount || 0) - (a.viewCount || 0);
    return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();
  });

  const hasFilter = !!(search || genre !== "All");
  const isEmpty = !isLoading && (!filtered || filtered.length === 0);

  return (
    <Layout isLanding darkNav>
      <div style={{ background: BG, minHeight: "100vh", fontFamily: SF }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px" }}>

          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: T, letterSpacing: "-0.03em", margin: "0 0 6px" }}>
              Community Library
            </h1>
            <p style={{ fontSize: 14, color: TD, margin: 0 }}>
              Discover stories written and shared by writers from around the world
            </p>
          </div>

          {/* Featured Book */}
          {featuredBook && !hasFilter && (
            <FeaturedBanner book={featuredBook} isAdmin={isAdmin} />
          )}

          {/* Search + Filters */}
          <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
            {/* Search */}
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: TD }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by title or author..."
                style={{
                  width: "100%", padding: "10px 12px 10px 36px", borderRadius: 10,
                  background: C2, border: `1px solid ${B}`, color: T,
                  fontFamily: SF, fontSize: 13, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Genre pills */}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
              {GENRES.map(g => (
                <button
                  key={g}
                  onClick={() => setGenre(g)}
                  style={{
                    padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                    fontFamily: SF, cursor: "pointer", transition: "all 0.15s",
                    background: genre === g ? "#fff" : "transparent",
                    color: genre === g ? "#000" : TD,
                    border: genre === g ? "none" : `1px solid ${B}`,
                  }}
                >{g}</button>
              ))}
            </div>

            {/* Sort */}
            <button
              onClick={() => setSort(s => s === "recent" ? "popular" : "recent")}
              style={{
                display: "flex", alignItems: "center", gap: 5, padding: "6px 14px",
                borderRadius: 10, background: C2, border: `1px solid ${B}`,
                fontFamily: SF, fontSize: 12, color: TS, cursor: "pointer",
              }}
            >
              {sort === "recent" ? "Newest" : "Popular"}
              <ChevronDown style={{ width: 12, height: 12 }} />
            </button>
          </div>

          {/* Results count */}
          {books && books.length > 0 && !isEmpty && (
            <p style={{ fontSize: 12, color: TD, marginBottom: 20 }}>
              <span style={{ color: TS, fontWeight: 600 }}>{filtered?.length ?? 0}</span> works published
              {hasFilter && " (filtered)"}
            </p>
          )}

          {/* Content */}
          {isLoading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "100px 0" }}>
              <Loader2 style={{ width: 24, height: 24, color: TD, animation: "spin 1s linear infinite" }} />
            </div>
          ) : isEmpty ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <BookOpen style={{ width: 40, height: 40, color: TD, margin: "0 auto 16px", opacity: 0.4 }} />
              <p style={{ fontSize: 16, fontWeight: 600, color: TS, margin: "0 0 6px" }}>
                {hasFilter ? "No results found" : "No stories published yet"}
              </p>
              <p style={{ fontSize: 13, color: TD }}>
                {hasFilter ? "Try a different search or genre" : "Be the first to share your story with the community"}
              </p>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 24,
            }}>
              {filtered!.map(book => (
                <BookCard
                  key={book.id}
                  book={book}
                  isAdmin={isAdmin}
                  isFeatured={featuredBook?.id === book.id}
                />
              ))}
            </div>
          )}

          {/* Admin tip */}
          {isAdmin && books && books.length > 0 && (
            <div style={{
              marginTop: 40, display: "flex", alignItems: "center", gap: 8,
              fontSize: 11, fontFamily: SF, color: TD,
              background: C2, border: `1px solid ${B}`, borderRadius: 10, padding: "10px 16px",
            }}>
              <Trophy style={{ width: 12, height: 12, color: "#fbbf24", flexShrink: 0 }} />
              Admin: hover over any book and click the trophy to feature it.
            </div>
          )}
        </div>

        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    </Layout>
  );
}
