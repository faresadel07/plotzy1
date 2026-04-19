import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Calendar, Copy, Check, User, Layers } from "lucide-react";

const SF = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif";
const ACC = "#7c6af7";

type SeriesBook = {
  id: number;
  title: string;
  coverImage: string | null;
  spineColor: string | null;
  summary: string | null;
  genre: string | null;
  viewCount: number;
  contentType: string | null;
};

type PublicSeries = {
  id: number;
  name: string;
  description: string | null;
  coverImage: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string | null;
  books: SeriesBook[];
  ownerName: string | null;
  ownerAvatarUrl: string | null;
};

export default function SeriesView() {
  const [, params] = useRoute("/series/:id");
  const seriesId = Number(params?.id);
  const [copied, setCopied] = useState(false);

  const { data: series, isLoading } = useQuery<PublicSeries>({
    queryKey: ["public-series", seriesId],
    queryFn: async () => {
      const res = await fetch(`/api/public/series/${seriesId}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!seriesId,
    retry: false,
  });

  const url = typeof window !== "undefined" ? window.location.href : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareX = () => window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(series?.name || "")}&url=${encodeURIComponent(url)}`, "_blank");
  const shareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent((series?.name || "") + " " + url)}`, "_blank");
  const shareLinkedIn = () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank");

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 24, height: 24, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!series) {
    return (
      <div style={{ minHeight: "100vh", background: "#080808", color: "#888", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: SF }}>
        <Layers style={{ width: 48, height: 48, opacity: 0.3 }} />
        <p style={{ fontSize: 18, fontWeight: 600 }}>Series not found</p>
        <Link href="/library">
          <button style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "none", color: "#888", cursor: "pointer", fontSize: 13 }}>Back to Library</button>
        </Link>
      </div>
    );
  }

  const publishDate = series.publishedAt ? new Date(series.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "";

  return (
    <div style={{ minHeight: "100vh", background: "#080808", fontFamily: SF, color: "#fff" }}>

      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(8,8,8,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 20px", height: 48, display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/library">
          <button style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 13, padding: "4px 8px", borderRadius: 6 }}>
            <ArrowLeft size={15} /> Library
          </button>
        </Link>
        <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.08)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Layers size={12} color="rgba(255,255,255,0.3)" />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>Book Series</span>
        </div>
      </header>

      {/* Hero */}
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 20px 32px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 16, background: "rgba(124,106,247,0.12)", border: "1px solid rgba(124,106,247,0.25)", marginBottom: 20 }}>
          <Layers style={{ width: 24, height: 24, color: ACC }} />
        </div>

        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 14 }}>
          {series.name}
        </h1>

        {series.description && (
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", lineHeight: 1.65, maxWidth: 620, margin: "0 auto 24px" }}>
            {series.description}
          </p>
        )}

        {/* Meta row */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 14, justifyContent: "center", marginBottom: 8 }}>
          {series.ownerName && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {series.ownerAvatarUrl ? (
                <img src={series.ownerAvatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(124,106,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={12} style={{ color: ACC }} />
                </div>
              )}
              <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{series.ownerName}</span>
            </div>
          )}
          <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
            <BookOpen size={12} /> {series.books.length} {series.books.length === 1 ? "book" : "books"}
          </div>
          {publishDate && (
            <>
              <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                <Calendar size={12} /> {publishDate}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Books grid */}
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px 48px" }}>
        {series.books.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.4)" }}>
            <BookOpen style={{ width: 36, height: 36, margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>No books published in this series yet</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 24 }}>
            {series.books.map((book, i) => (
              <Link key={book.id} href={book.contentType === "article" ? `/blog/${book.id}` : `/read/${book.id}`}>
                <div style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 14,
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "border-color 0.2s, transform 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(124,106,247,0.3)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  {/* Cover */}
                  <div style={{ position: "relative", aspectRatio: "2/3", overflow: "hidden", background: book.spineColor || "rgba(124,106,247,0.08)" }}>
                    {book.coverImage ? (
                      <img src={book.coverImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <BookOpen style={{ width: 32, height: 32, color: "rgba(255,255,255,0.15)" }} />
                      </div>
                    )}
                    {/* Volume badge */}
                    <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: "0.05em" }}>
                      VOL. {i + 1}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ padding: "14px 16px" }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1.3, marginBottom: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden" }}>
                      {book.title}
                    </h3>
                    {book.summary && (
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden" }}>
                        {book.summary}
                      </p>
                    )}
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      {book.genre && (
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {book.genre}
                        </span>
                      )}
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginLeft: "auto" }}>
                        {book.viewCount.toLocaleString()} views
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Share section */}
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 20px 48px" }}>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24, textAlign: "center" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Share this series</p>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={handleCopyLink}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontSize: 12, color: copied ? "#34d399" : "rgba(255,255,255,0.6)", transition: "all 0.15s" }}>
              {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Link</>}
            </button>

            <button onClick={shareX}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
              𝕏 Post
            </button>

            <button onClick={shareWhatsApp}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.2)", cursor: "pointer", fontSize: 12, color: "#25d366" }}>
              WhatsApp
            </button>

            <button onClick={shareLinkedIn}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, background: "rgba(10,102,194,0.08)", border: "1px solid rgba(10,102,194,0.2)", cursor: "pointer", fontSize: 12, color: "#0a66c2" }}>
              LinkedIn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
